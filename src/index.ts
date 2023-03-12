import { CostCalculator, EuclideanDistance, HaversineDistance } from './CostCalculator.js'
import { Discretizer, LinearDiscretizer } from './Discretizer.js'

let map: google.maps.Map;

let LatLngList: google.maps.LatLng[] = [];

export function initMap(): void {

	const myLatLng = { lat: 0, lng: 0 };
	map = new google.maps.Map(
		document.getElementById("map") as HTMLElement,
		{
			zoom: 2,
			center: { lat: 0, lng: 0 },
		}
	);
}

declare global {
	interface Window {
		initMap: () => void;
	}
}
window.initMap = initMap;


const form = document.getElementById("markerForm") as HTMLFormElement;
const formWheight = document.getElementById("wheight") as HTMLInputElement;
const formLat = document.getElementById("lat") as HTMLInputElement;
const formLong = document.getElementById("long") as HTMLInputElement;
const logTag = document.getElementById("log") as HTMLElement;



form.onsubmit = () => {

	const formData = new FormData(form);
	console.log(formData);

	var p = document.createElement('p');

	var w: number = +formWheight.value;
	var lat: number = +formLat.value;
	var lng: number = +formLong.value;
	p.innerHTML = "W:" + w + ", lat:" + lat + ", long:" + lng;
	logTag.appendChild(p);

	var pl: Place = new Place(lat, lng);
	var dst: Destination = new Destination(pl, w);
	AddMarker(dst);

	return false; // prevent reload
};

export function AddMarker(dest: Destination) {

	var newlatLng: google.maps.LatLng = new google.maps.LatLng(dest.Place.Lat, dest.Place.Long);

	new google.maps.Marker({
		position: newlatLng,
		label: "" + dest.Wheight + "",
		map,
	});

	LatLngList.push(newlatLng);

	var latlngbounds: google.maps.LatLngBounds = new google.maps.LatLngBounds();

	for(var latLng of LatLngList)
		latlngbounds.extend(latLng);

	map.setCenter(latlngbounds.getCenter());
	map.fitBounds(latlngbounds); 
}

export function DegToRad(degrees: number) {
	return degrees * (Math.PI / 180);
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


function DrawRectangle(box: BoundingBox, cost: number) {
	var north: number = box.Max.Lat;
	var south: number = box.Min.Lat;
	var east: number = box.Max.Long;
	var west: number = box.Min.Long;

	const rectangle = new google.maps.Rectangle({
		strokeColor: "#FF0000",
		strokeOpacity: 0.35,
		strokeWeight: 1,
		fillColor: "#FF0000",
		fillOpacity: 0.3,
		map,
		bounds: {north, south, east, west},
	});
}
function DrawDarkRectangle(box: BoundingBox) {
	var north: number = box.Max.Lat;
	var south: number = box.Min.Lat;
	var east: number = box.Max.Long;
	var west: number = box.Min.Long;

	const rectangle = new google.maps.Rectangle({
		strokeColor: "#211",
		strokeOpacity: 0.35,
		strokeWeight: 1,
		fillColor: "#211",
		fillOpacity: 0.3,
		map,
		bounds: {north, south, east, west},
	});
}

function DrawLine(p1: Place, p2: Place) {
	const lineCoords = [{ lat: p1.Lat, lng: p1.Long }, { lat: p2.Lat, lng: p2.Long } ];
	const line = new google.maps.Polyline({
		path: lineCoords,
		geodesic: false, // does it go faster when set to false?, does it look more precise when set to true?
		strokeColor: "#211",
		strokeOpacity: 0.6,
		strokeWeight: 1,
	});

	line.setMap(map);
}


function Interpolate(p1: Place, p2: Place, v1: number, v2: number) {
	var t: number = v1 / (v1 - v2);
	return p1.Lerp(t, p2);
}

function FindAndDrawLine(p1: Place, c1: number, p2: Place, c2: number, p3: Place, c3: number, p4: Place, c4: number, qMin: number) {
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
		DrawLine(l1, l2);
	}
}

function AllEqual(v1: number, v2: number, v3: number, v4: number, v5: number) {
	return v1 == v2 && v2 == v3 && v3 == v4 && v4 == v5;
}

export class Explorer {
	DestSet: DestinationSet;
	CostCalculator: CostCalculator;
	Discretizer: Discretizer;
	BandSize: number;
	MaxSize: number;
	MinSize: number;
	constructor(dSet: DestinationSet, bandSize: number, maxsize: number, minsize: number, costCalc?: CostCalculator, disc?: Discretizer) {
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
	}

	Explore(box: BoundingBox) {
		// console.log("inside of explore();");
		// console.log(box);
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
		var dLat: number = box.Max.Lat - box.Min.Lat;
		var dLon: number = box.Max.Long - box.Min.Long;

		if (dLat < this.MaxSize && dLon < this.MaxSize && AllEqual(this.Discretizer.Discretize(c1), this.Discretizer.Discretize(c2), this.Discretizer.Discretize(c3), this.Discretizer.Discretize(c4), this.Discretizer.Discretize(c5))) {
			// see: https://developers.google.com/maps/documentation/javascript/reference/visualization
			// TODO: Paint map with translucid color based on cost.
			//DrawRectangle(box, (c1 + c2 + c3 + c4) / 4);
		} else {

			if (dLat < this.MinSize && dLon < this.MinSize) {

				var qMin: number = this.Discretizer.Discretize(Math.min(c1, c2, c3, c4));

				// console.log("Line");
				// console.log(box);
				//DrawDarkRectangle(box);
				FindAndDrawLine(p1, c1, p2, c2, p3, c3, p4, c4, qMin);
				// TODO: Paint "line" color.
			} else {
				var mid: number;
				var childBox1: BoundingBox;
				var childBox2: BoundingBox;
				if (dLat > dLon) {
					mid = (box.Min.Lat + box.Max.Lat) / 2;
					//mid = 0.3*box.Min.Lat + 0.7*box.Max.Lat;
					childBox1 = new BoundingBox(box.Min, new Place(mid, box.Max.Long));
					childBox2 = new BoundingBox(new Place(mid, box.Min.Long), box.Max);
					this.Explore(childBox1);
					this.Explore(childBox2);
				} else {
					mid = (box.Min.Long + box.Max.Long) / 2;
					//mid = 0.3*box.Min.Long + 0.7*box.Max.Long;
					childBox1 = new BoundingBox(box.Min, new Place(box.Max.Lat, mid));
					childBox2 = new BoundingBox(new Place(box.Min.Lat, mid), box.Max);
					this.Explore(childBox1);
					this.Explore(childBox2);
				}
			}
		}
	}
}
