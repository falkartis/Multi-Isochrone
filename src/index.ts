import { CostCalculator, EuclideanDistance, HaversineDistance } from './CostCalculator.js'
import { Discretizer, LinearDiscretizer } from './Discretizer.js'
import { MapConnector, ConsoleLogConnector } from './MapConnector.js'
import { HashCode, Dictionary } from './dictionary.js'




export function DegToRad(degrees: number) {
	return degrees * (Math.PI / 180);
}

export function Lerp(v1: number, v2: number, t: number): number {
	return v1 * (1 - t) + v2 * t;
}

export class Place implements HashCode {
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

export class Destination {
	Place: Place;
	Wheight: number;
	constructor(place: Place, wheight: number) {
		this.Place = place;
		this.Wheight = wheight;
	}
}

export class DestinationSet {
	Destinations: Destination[];
	CostCache: Dictionary<Place, number>;
	constructor(destinations: Destination[]) {
		this.Destinations = destinations;
		this.CostCache = new Dictionary<Place, number>();
	}
	ClearCostCache() {
		this.CostCache.Clear();
	}
	ComputeCostFrom(origin: Place, calc: CostCalculator) {
		let cached = this.CostCache.Get(origin);
		if (cached != undefined)
			return cached;

		let totalCost: number = 0;
		for (let destination of this.Destinations) {
			let cost = destination.Wheight * calc.GetCost(origin, destination.Place);
			totalCost += cost;
		}
		this.CostCache.Add(origin, totalCost);
		return totalCost;
	}
	GetBoundingBox() {
		if (this.Destinations.length == 0)
			return null;
		let bb: BoundingBox = new BoundingBox(this.Destinations[0].Place);
		// Yes the first one is repeated, should be fixed.
		for (let dest of this.Destinations) {
			bb.Expand(dest.Place);
		}
		return bb;
	}
	GetWheightedCentroid() {
		let lats: number = 0;
		let longs: number = 0;
		let wheights: number = 0;
		for (let dest of this.Destinations) {
			lats += dest.Place.Lat * dest.Wheight;
			longs += dest.Place.Long * dest.Wheight;
			wheights += dest.Wheight;
		}
		//console.log({lats, longs, wheights});
		return new Place(lats / wheights, longs / wheights);
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

	//ChatGPT generated Grid method to be tested:
	Grid(rows: number, cols: number): Place[][] {
		const grid: Place[][] = [];
		const dLat = this.SizeLat / (rows - 1);
		const dLong = this.SizeLong / (cols - 1);

		for (let i = 0; i < rows; i++) {
			const row = [];

			for (let j = 0; j < cols; j++) {
				const lat = this.Min.Lat + dLat * i;
				const long = this.Min.Long + dLong * j;
				row.push(new Place(lat, long));
			}

			grid.push(row);
		}

		return grid;
	}
	//ChatGPT generated BoxGrid method to be tested:
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
	DestSet: DestinationSet;
	CostCalculator: CostCalculator;
	Discretizer: Discretizer;
	BandSize: number;
	MaxSize: number;
	MinSize: number;
	Map: MapConnector;
	Debug: boolean = false;

	constructor(dSet: DestinationSet, bandSize: number, maxsize: number, minsize: number, costCalc?: CostCalculator, disc?: Discretizer, map?: MapConnector) {
		this.DestSet = dSet;
		this.BandSize = bandSize;
		this.MaxSize = maxsize;
		this.MinSize = minsize;

		this.CostCalculator = costCalc ?? new EuclideanDistance();
		this.Discretizer = disc ?? new LinearDiscretizer(bandSize);
		this.Map = map ?? new ConsoleLogConnector();
	}
	SetMaxSize(v: number) {
		this.MaxSize = v;
	}
	SetMinSize(v: number) {
		this.MinSize = v;
	}

	DrawLine(p1: Place, c1: number, p2: Place, c2: number, p3: Place, c3: number, p4: Place, c4: number, qMin: number) {

		let v1: number = c1 - qMin;
		let v2: number = c2 - qMin;
		let v3: number = c3 - qMin;
		let v4: number = c4 - qMin;
		let index: number = 0;
		index += 1 * (+(v1 > 0));
		index += 2 * (+(v2 > 0));
		index += 4 * (+(v3 > 0));
		index += 8 * (+(v4 > 0));

		let l1: Place|null = null;
		let l2: Place|null = null;
		switch (index) {
			// CORNERS:
			case 1:		case 14:	l1 = Interpolate(p1, p2, v1, v2);	l2 = Interpolate(p1, p4, v1, v4);	break;
			case 2:		case 13:	l1 = Interpolate(p2, p1, v2, v1);	l2 = Interpolate(p2, p3, v2, v3);	break;
			case 4:		case 11:	l1 = Interpolate(p3, p2, v3, v2);	l2 = Interpolate(p3, p4, v3, v4);	break;
			case 7:		case 8:		l1 = Interpolate(p4, p1, v4, v1);	l2 = Interpolate(p4, p3, v4, v3);	break;
			// LINE THROUGH:
			case 6:		case 9:		l1 = Interpolate(p1, p2, v1, v2);	l2 = Interpolate(p3, p4, v3, v4);	break;
			case 3:		case 12:	l1 = Interpolate(p1, p4, v1, v4);	l2 = Interpolate(p2, p3, v2, v3);	break;
			// SADDLE POINT (not expected here):
			case 5:
			case 10:
			// ALL EQUAL, SOLID COLOR, (Case handled somewhere else):
			case 0:
			case 15:
				if (this.Debug) console.log("Why am I here?");
				break;
		}
		if (l1 == null || l2 == null) {
			if (this.Debug) console.log({v1, v2, v3, v4, qMin, index});
		} else {
			this.Map.AddLine(l1, l2, qMin);
		}
	}

	AllEqual(first: number, ...values: number[]) {
		for (let val of values) {
			if (val != first)
				return false;
		}
		return true;
	}

	FindLines(	p1: Place,	p2: Place,	p3: Place,	p4: Place,
				c1: number, c2: number, c3: number, c4: number,
				d1: number, d2: number, d3: number, d4: number) {

		let vals = new Map<number, number>();
		vals.set(d1, 1);
		vals.set(d2, 1);
		vals.set(d3, 1);
		vals.set(d4, 1);

		let max = Math.max(d1, d2, d3, d4);

		for (let cost of vals.keys()) {
			if (cost != max)
				this.DrawLine(p1, c1, p2, c2, p3, c3, p4, c4, cost);
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

		let p: Place[] = [box.SW, box.NW, box.NE, box.SE, box.CW, box.NC, box.CE, box.SC, box.Center];
		let c: number[] = p.map(place => this.ComputeCost(place));
		let d: number[] = c.map(cost => this.Discretizer.Discretize(cost));

		let nineEqual = this.AllEqual(d[0], d[1], d[2], d[3], d[4], d[5], d[6], d[7], d[8]);

		if (nineEqual) {
			if (this.Debug) this.Map.DrawRedRectangle(box, c[8]);
			return;
		}

		if (box.SizeLat < this.MinSize && box.SizeLong < this.MinSize) {
			if (this.Debug) this.Map.DrawDarkRectangle(box);
			this.FindLines(p[0], p[1], p[2], p[3], c[0], c[1], c[2], c[3], d[0], d[1], d[2], d[3]);
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
