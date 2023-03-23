import { IMapConnector, ConsoleLogConnector } from './MapConnector.js'
import { IDiscretizer, LinearDiscretizer } from './Discretizer.js'
import { IHashCode, Dictionary } from './Dictionary.js'
import { ICostCalculator } from './CostCalculator.js'
import { IDestination } from './DestinationSet.js'

export function Lerp(v1: number, v2: number, t: number): number {
	return v1 * (1 - t) + v2 * t;
}

export class Place implements IHashCode {
	Lat: number;
	Long: number;
	constructor(lat: number, long: number) {
		if (isNaN(lat) || isNaN(long)) {
			throw new Error('Invalid latitude or longitude');
		}
		this.Lat = lat;
		this.Long = long;
	}
	Scale(t: number) {
		return new Place(this.Lat * t, this.Long * t);
	}
	Add(o: Place) {
		return new Place(this.Lat + o.Lat, this.Long + o.Long);
	}
	Lerp(t: number, o: Place) {
		return this.Scale(1 - t).Add(o.Scale(t));
	}
	GetHashCode() {
		let la = 90 / this.Lat;
		let lo = 180 / this.Long;
		return la * 7919 + lo;
	}
	Equals(other: Place) {
		return this.Lat == other.Lat && this.Long == other.Long;
	}
}

export class BoundingBox {
	Min: Place;
	Max: Place;
	
	constructor(place: Place, max?: Place) {
		this.Min = new Place(place.Lat, place.Long);
		if (max == null) {
			this.Max = new Place(place.Lat, place.Long);
		} else {
			this.Max = new Place(max.Lat, max.Long);
		}
	}

	get SW() {return new Place(this.Min.Lat, this.Min.Long); }
	get NW() {return new Place(this.Max.Lat, this.Min.Long); }
	get NE() {return new Place(this.Max.Lat, this.Max.Long); }
	get SE() {return new Place(this.Min.Lat, this.Max.Long); }
	
	get CW() {return new Place((this.Min.Lat + this.Max.Lat) / 2, this.Min.Long); }
	get NC() {return new Place(this.Max.Lat, (this.Min.Long + this.Max.Long) / 2); }
	get CE() {return new Place((this.Min.Lat + this.Max.Lat) / 2, this.Max.Long); }
	get SC() {return new Place(this.Min.Lat, (this.Min.Long + this.Max.Long) / 2); }

	get Center() {return new Place((this.Min.Lat + this.Max.Lat)/2,(this.Min.Long + this.Max.Long)/2); }

	get SizeLat() { return this.Max.Lat - this.Min.Lat; }
	get SizeLong() { return this.Max.Long - this.Min.Long; }

	Edges(rows: number, cols: number): Place[] {
		
		const latInterval = this.SizeLat / rows;
		const longInterval = this.SizeLong / cols;

		const result: Place[] = [];
		for (let i = 0; i <= rows; i++) {
			const lat = this.Min.Lat + i * latInterval;
			result.push(new Place(lat, this.Min.Long));
			result.push(new Place(lat, this.Max.Long));
		}
		// Second loop has two less iterations to avoid repeating corners.
		for (let i = 1; i < cols; i++) {
			const long = this.Min.Long + i * longInterval;
			result.push(new Place(this.Min.Lat, long));
			result.push(new Place(this.Max.Lat, long));
		}
		return result;
	}

	BoxGrid(rows: number, cols: number): BoundingBox[] {
		const grid: BoundingBox[] = [];
		const dLat = this.SizeLat / rows;
		const dLong = this.SizeLong / cols;

		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				const lat1 = this.Min.Lat + dLat * i;
				const lat2 = this.Min.Lat + dLat * (i + 1);
				const long1 = this.Min.Long + dLong * j;
				const long2 = this.Min.Long + dLong * (j + 1);

				grid.push(new BoundingBox(new Place(lat1, long1), new Place(lat2, long2)));
			}
		}

		return grid;
	}

	Expand(place: Place) {
		if (place.Lat < this.Min.Lat) { this.Min.Lat = place.Lat; }
		if (place.Lat > this.Max.Lat) { this.Max.Lat = place.Lat; }
		if (place.Long < this.Min.Long) { this.Min.Long = place.Long; }
		if (place.Long > this.Max.Long) { this.Max.Long = place.Long; }
	}
	ExpandBy(percent: number) {
		let perOne: number = percent / 100;
		let dLat: number = this.Max.Lat - this.Min.Lat;
		let dLong: number = this.Max.Long - this.Min.Long;
		let latInc: number = dLat * perOne;
		let longInc: number = dLong * perOne;
		this.Min.Lat = this.Min.Lat - (latInc / 2);
		this.Max.Lat = this.Max.Lat + (latInc / 2);
		this.Min.Long = this.Min.Long - (longInc / 2);
		this.Max.Long = this.Max.Long + (longInc / 2);
	}
	ExpandByDeg(deg: number) {
		this.Min.Lat -= deg;
		this.Max.Lat += deg;
		this.Min.Long -= deg;
		this.Max.Long += deg;
	}
	ExpandLatBy(percent: number) {
		let perOne: number = percent / 100;
		let dLat: number = this.Max.Lat - this.Min.Lat;
		let latInc: number = dLat * perOne;
		this.Min.Lat = this.Min.Lat - (latInc / 2);
		this.Max.Lat = this.Max.Lat + (latInc / 2);
	}
	ExpandLongBy(percent: number) {
		let perOne: number = percent / 100;
		let dLong: number = this.Max.Long - this.Min.Long;
		let longInc: number = dLong * perOne;
		this.Min.Long = this.Min.Long - (longInc / 2);
		this.Max.Long = this.Max.Long + (longInc / 2);
	}
}

function Interpolate(p1: Place, p2: Place, v1: number, v2: number) {
	let t: number = v1 / (v1 - v2);
	return p1.Lerp(t, p2);
}

export class Explorer {
	CostCalculator: ICostCalculator;
	Discretizer: IDiscretizer;
	DestSet: IDestination;
	Map: IMapConnector;
	MaxSize: number;
	MinSize: number;
	Debug: boolean = false;

	constructor(dSet: IDestination, maxsize: number, minsize: number, disc: IDiscretizer, costCalc: ICostCalculator, map?: IMapConnector) {
		this.DestSet = dSet;
		this.MaxSize = maxsize;
		this.MinSize = minsize;

		this.CostCalculator = costCalc;
		this.Discretizer = disc;
		this.Map = map ?? new ConsoleLogConnector();
	}
	SetMaxSize(v: number) {
		this.MaxSize = v;
	}
	SetMinSize(v: number) {
		this.MinSize = v;
	}

	DrawLine(p: Place[], c: number[], discVal: number) {

		let v: number[] = c.map( cost => cost - discVal);

		let index: number = 0;
		index += 1 * (+(v[0] > 0));
		index += 2 * (+(v[1] > 0));
		index += 4 * (+(v[2] > 0));
		index += 8 * (+(v[3] > 0));

		let l1: Place|null = null;
		let l2: Place|null = null;
		switch (index) {
			// CORNERS:
			case 1:		case 14:	l1 = Interpolate(p[0], p[1], v[0], v[1]);	l2 = Interpolate(p[0], p[3], v[0], v[3]);	break;
			case 2:		case 13:	l1 = Interpolate(p[1], p[0], v[1], v[0]);	l2 = Interpolate(p[1], p[2], v[1], v[2]);	break;
			case 4:		case 11:	l1 = Interpolate(p[2], p[1], v[2], v[1]);	l2 = Interpolate(p[2], p[3], v[2], v[3]);	break;
			case 7:		case 8:		l1 = Interpolate(p[3], p[0], v[3], v[0]);	l2 = Interpolate(p[3], p[2], v[3], v[2]);	break;
			// LINE THROUGH:
			case 6:		case 9:		l1 = Interpolate(p[0], p[1], v[0], v[1]);	l2 = Interpolate(p[2], p[3], v[2], v[3]);	break;
			case 3:		case 12:	l1 = Interpolate(p[0], p[3], v[0], v[3]);	l2 = Interpolate(p[1], p[2], v[1], v[2]);	break;
			// SADDLE POINT:
			case 5:
			case 10:
				if (this.Debug) console.log("Saddle point not implemented.");
				//TODO: implement saddle point.
				break;
			// ALL EQUAL, SOLID COLOR, (Case handled somewhere else):
			case 0:
			case 15:
				if (this.Debug) console.log("Why am I here?");
				break;
		}
		if (l1 == null || l2 == null) {
			if (this.Debug) console.log({v, discVal, index});
		} else {
			this.Map.AddLine(l1, l2, discVal);
		}
	}

	AllEqual(...args: number[]) {
		return args.every((val, i, arr) => val === arr[0]);
	}

	FindLines(p: Place[], c: number[], d: number[]) {

		let vals = new Map<number, number>();
		vals.set(d[0], 1);
		vals.set(d[1], 1);
		vals.set(d[2], 1);
		vals.set(d[3], 1);

		let max = Math.max(d[0], d[1], d[2], d[3]);

		for (let cost of vals.keys()) {
			if (cost != max)
				this.DrawLine(p, c, cost);
		}
	}

	ComputeCost(p: Place) {
		return this.DestSet.ComputeCostFrom(p, this.CostCalculator);
	}

	Explore(box: BoundingBox) {

		if (box.SizeLat > this.MaxSize || box.SizeLong > this.MaxSize) {
			this.Divide(box);
			return;
		}

		let edges: Place[];
		if (box.SizeLat > box.SizeLong) {
			edges = box.Edges(9, 6);
		} else {
			edges = box.Edges(6, 9);
		}
		edges.push(box.Center);
		let edgesCosts: number[] = edges.map(place => this.ComputeCost(place));
		let edgesDiscrete: number[] = edgesCosts.map(cost => this.Discretizer.Discretize(cost));
		let edgesEqual = this.AllEqual(...edgesDiscrete);

		if (edgesEqual) {
			if (this.Debug) this.Map.DrawRedRectangle(box, edgesCosts[0]);
			return;
		}

		if (box.SizeLat < this.MinSize && box.SizeLong < this.MinSize) {
			if (this.Debug) this.Map.DrawDarkRectangle(box);
			let corners: Place[] = [box.SW, box.NW, box.NE, box.SE];
			let cornersCosts: number[] = corners.map(place => this.ComputeCost(place));
			let cornersDiscrete: number[] = cornersCosts.map(cost => this.Discretizer.Discretize(cost));
			this.FindLines(corners, cornersCosts, cornersDiscrete);
			return;
		}

		this.Divide(box);
	}

	Divide(box: BoundingBox) {
		let childBoxes: BoundingBox[];
		if (box.SizeLat > box.SizeLong) {
			childBoxes = box.BoxGrid(3, 1);
		} else {
			childBoxes = box.BoxGrid(1, 3);
		}
		this.ExploreThem(childBoxes[1], childBoxes[0], childBoxes[2]);
	}

	ExploreThem(...boxes: BoundingBox[]) {
		for (let box of boxes) {
			this.Explore(box);
		}
	}
}
