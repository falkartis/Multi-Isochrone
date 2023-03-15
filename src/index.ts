import { CostCalculator, EuclideanDistance, HaversineDistance } from './CostCalculator.js'
import { Discretizer, LinearDiscretizer } from './Discretizer.js'
import { MapConnector, ConsoleLogConnector } from './MapConnector.js'




export function DegToRad(degrees: number) {
	return degrees * (Math.PI / 180);
}

export function Lerp(v1: number, v2: number, t: number): number {
	return v1 * (1 - t) + v2 * t;
}

export class Place {
	Lat: number;
	Long: number;
	constructor(lat: number, long: number) {
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
	constructor(destinations: Destination[]) {
		this.Destinations = destinations;
	}
	ComputeCostFrom(origin: Place, calc: CostCalculator) {
		//TODO: make a cost cache, how long to keep the values? how without dictionary? Make my own dictionary implementation?
		let totalCost: number = 0;
		for (let destination of this.Destinations) {
			var cost = destination.Wheight * calc.GetCost(origin, destination.Place);
			totalCost += cost;
		}
		return totalCost;
	}
	GetBoundingBox() {
		if (this.Destinations.length == 0)
			return null;
		var bb: BoundingBox = new BoundingBox(this.Destinations[0].Place);
		// Yes the first one is repeated, should be fixed.
		for (let dest of this.Destinations) {
			bb.Expand(dest.Place);
		}
		return bb;
	}
	GetWheightedCentroid() {
		var lats: number = 0;
		var longs: number = 0;
		var wheights: number = 0;
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
	get SW() {return new Place(this.Min.Lat, this.Min.Long); }
	get NW() {return new Place(this.Max.Lat, this.Min.Long); }
	get NE() {return new Place(this.Max.Lat, this.Max.Long); }
	get SE() {return new Place(this.Min.Lat, this.Max.Long); }
	get Center() {return new Place((this.Min.Lat + this.Max.Lat)/2,(this.Min.Long + this.Max.Long)/2); }
	get SizeLat() { return this.Max.Lat - this.Min.Lat; }
	get SizeLong() { return this.Max.Long - this.Min.Long; }

	constructor(place: Place, max?: Place) {
		this.Min = new Place(place.Lat, place.Long);
		if (max == null) {
			this.Max = new Place(place.Lat, place.Long);
		} else {
			this.Max = new Place(max.Lat, max.Long);
		}
	}
	Expand(place: Place) {
		if (place.Lat < this.Min.Lat) { this.Min.Lat = place.Lat; }
		if (place.Lat > this.Max.Lat) { this.Max.Lat = place.Lat; }
		if (place.Long < this.Min.Long) { this.Min.Long = place.Long; }
		if (place.Long > this.Max.Long) { this.Max.Long = place.Long; }
	}
	ExpandBy(percent: number) {
		var perOne: number = percent / 100;
		var dLat: number = this.Max.Lat - this.Min.Lat;
		var dLong: number = this.Max.Long - this.Min.Long;
		var latInc: number = dLat * perOne;
		var longInc: number = dLong * perOne;
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
		var perOne: number = percent / 100;
		var dLat: number = this.Max.Lat - this.Min.Lat;
		var latInc: number = dLat * perOne;
		this.Min.Lat = this.Min.Lat - (latInc / 2);
		this.Max.Lat = this.Max.Lat + (latInc / 2);
	}
	ExpandLongBy(percent: number) {
		var perOne: number = percent / 100;
		var dLong: number = this.Max.Long - this.Min.Long;
		var longInc: number = dLong * perOne;
		this.Min.Long = this.Min.Long - (longInc / 2);
		this.Max.Long = this.Max.Long + (longInc / 2);
	}
}





function Interpolate(p1: Place, p2: Place, v1: number, v2: number) {
	var t: number = v1 / (v1 - v2);
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

	constructor(dSet: DestinationSet, bandSize: number, maxsize: number, minsize: number, costCalc?: CostCalculator, disc?: Discretizer, map?: MapConnector) {
		this.DestSet = dSet;
		this.BandSize = bandSize;
		this.MaxSize = maxsize;
		this.MinSize = minsize;
		if (costCalc == null) {
			//TODO: choose a cheaper default calculator
			this.CostCalculator = new HaversineDistance();
		} else {
			this.CostCalculator = costCalc;
		}
		if (disc == null) {
			this.Discretizer = new LinearDiscretizer(bandSize);
		} else {
			this.Discretizer = disc;
		}
		if (map == null) {
			//TODO: Some default implementation? (a logger maybe)
			this.Map = new ConsoleLogConnector();
		} else {
			this.Map = map;
		}
	}
	SetMaxSize(v: number) {
		this.MaxSize = v;
	}
	SetMinSize(v: number) {
		this.MinSize = v;
	}

	FindAndDrawLine(p1: Place, c1: number, p2: Place, c2: number, p3: Place, c3: number, p4: Place, c4: number, qMin: number) {
		// TODO: Paint "line" color.
		var v1: number = c1 - qMin;
		var v2: number = c2 - qMin;
		var v3: number = c3 - qMin;
		var v4: number = c4 - qMin;
		var index: number = 0;
		index += 1 * (+(v1 > 0));
		index += 2 * (+(v2 > 0));
		index += 4 * (+(v3 > 0));
		index += 8 * (+(v4 > 0));

		var l1: Place|null = null;
		var l2: Place|null = null;
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
				console.log("Why am I here?");
				break;
		}
		if (l1 == null || l2 == null) {
			console.log({v1, v2, v3, v4, qMin, index});
		} else {
			this.Map.AddLine(l1, l2, qMin);
		}
	}

	AllEqual(v1: number, v2: number, v3: number, v4: number, v5: number) {
		return v1 == v2 && v2 == v3 && v3 == v4 && v4 == v5;
	}

	Explore(box: BoundingBox) {

		var p1: Place = box.SW;
		var p2: Place = box.NW;
		var p3: Place = box.NE;
		var p4: Place = box.SE;
		var p5: Place = box.Center;
		var c1: number = this.DestSet.ComputeCostFrom(p1, this.CostCalculator);
		var c2: number = this.DestSet.ComputeCostFrom(p2, this.CostCalculator);
		var c3: number = this.DestSet.ComputeCostFrom(p3, this.CostCalculator);
		var c4: number = this.DestSet.ComputeCostFrom(p4, this.CostCalculator);
		var c5: number = this.DestSet.ComputeCostFrom(p5, this.CostCalculator);
		var d1: number = this.Discretizer.Discretize(c1);
		var d2: number = this.Discretizer.Discretize(c2);
		var d3: number = this.Discretizer.Discretize(c3);
		var d4: number = this.Discretizer.Discretize(c4);
		var d5: number = this.Discretizer.Discretize(c5);

		var dLat: number = box.Max.Lat - box.Min.Lat;
		var dLon: number = box.Max.Long - box.Min.Long;

		if (dLat < this.MaxSize && dLon < this.MaxSize && this.AllEqual(d1, d2, d3, d4, d5)) {
			//this.Map.DrawRedRectangle(box, c5);
			return;
		}

		// TODO: if only d5 is different we also have to recurse.

		if (dLat < this.MinSize && dLon < this.MinSize) {

			// TODO: Detect if box spans over 2 different lines (d1, d2, d3 and d4 have 3 different values) in this case draw twice

			//DrawDarkRectangle(box);
			var qMin: number = Math.min(d1, d2, d3, d4);
			this.FindAndDrawLine(p1, c1, p2, c2, p3, c3, p4, c4, qMin);
			return;
		}

		if (dLat > dLon) {
			var mid1 = Lerp(box.Min.Lat, box.Max.Lat, 0.4);
			var mid2 = Lerp(box.Min.Lat, box.Max.Lat, 0.6);
			var childBox1 = new BoundingBox(box.Min, new Place(mid1, box.Max.Long));
			var childBox2 = new BoundingBox(new Place(mid1, box.Min.Long), new Place(mid2, box.Max.Long));
			var childBox3 = new BoundingBox(new Place(mid2, box.Min.Long), box.Max);
			this.Explore(childBox2); // Starting on purpose with the center one
			this.Explore(childBox1);
			this.Explore(childBox3);
		} else {
			var mid1 = Lerp(box.Min.Long, box.Max.Long, 0.4);
			var mid2 = Lerp(box.Min.Long, box.Max.Long, 0.6);
			var childBox1 = new BoundingBox(box.Min, new Place(box.Max.Lat, mid1));
			var childBox2 = new BoundingBox(new Place(box.Min.Lat, mid1), new Place(box.Max.Lat, mid2));
			var childBox3 = new BoundingBox(new Place(box.Min.Lat, mid2), box.Max);
			this.Explore(childBox2); // Starting on purpose with the center one
			this.Explore(childBox1);
			this.Explore(childBox3);
		}
	}
}
