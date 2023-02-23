let map: google.maps.Map;

let LatLngList: google.maps.LatLng[] = [];

function initMap(): void {

	const myLatLng = { lat: 0, lng: 0 };
	map = new google.maps.Map(
		document.getElementById("map") as HTMLElement,
		{
			zoom: 2,
			center: { lat: 0, lng: 0 },
		}
	);
}

// declare global {
// 	interface Window {
// 		initMap: () => void;
// 	}
// }
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

function AddMarker(dest: Destination) {

	var newlatLng: google.maps.LatLng = new google.maps.LatLng(dest.Place.Lat, dest.Place.Long);

	new google.maps.Marker({
		position: newlatLng,
		map,
		title: "W:" + dest.Wheight,
	});

	LatLngList.push(newlatLng);

	var latlngbounds: google.maps.LatLngBounds = new google.maps.LatLngBounds();

	for(var latLng of LatLngList)
		latlngbounds.extend(latLng);

	map.setCenter(latlngbounds.getCenter());
	map.fitBounds(latlngbounds); 
}

class Place {
	Lat: number;
	Long: number;
	constructor(lat: number, long: number) {
		this.Lat = lat;
		this.Long = long;
	}
}

class Destination {
	Place: Place;
	Wheight: number;
	constructor(place: Place, wheight: number) {
		this.Place = place;
		this.Wheight = wheight;
	}
}

class DestinationSet {
	Destinations: Destination[];
	constructor(destinations: Destination[]) {
		this.Destinations = destinations;
	}
	ComputeCostFrom(origin: Place, fn: (a: Place, b: Place) => number) {
		let totalCost: number = 0;
		for (let destination of this.Destinations) {
			var cost = destination.Wheight * fn(origin, destination.Place);
			totalCost += cost;
		}
		return totalCost;
	}
	ComputeCostFromEuclidean(origin: Place) {
		return this.ComputeCostFrom(origin, (a, b) => {
			var dLat: number = a.Lat - b.Lat;
			var dLong: number = a.Long - b.Long;
			return Math.sqrt((dLat * dLat) + (dLong * dLong));
		});
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

class BoundingBox {
	Min: Place;
	Max: Place;
	get SW() {return new Place(this.Min.Lat, this.Min.Long);}
	get NW() {return new Place(this.Max.Lat, this.Min.Long);}
	get NE() {return new Place(this.Max.Lat, this.Max.Long);}
	get SE() {return new Place(this.Min.Lat, this.Max.Long);}
	get Center() {return new Place((this.Min.Lat + this.Max.Lat)/2,(this.Min.Long + this.Max.Long)/2)}

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

/*
 *	https://stackoverflow.com/questions/365826/calculate-distance-between-2-gps-coordinates
 *	http://www.movable-type.co.uk/scripts/latlong.html
*/
function degToRad(degrees: number) {
	return degrees * (Math.PI / 180);
}

function earthCoordinateDistanceKm(p1: Place, p2: Place) {
	var earthRadiusKm = 6371;

	var dLat = degToRad(p2.Lat - p1.Lat);
	var dLon = degToRad(p2.Long - p1.Long);

	var lat1 = degToRad(p1.Lat);
	var lat2 = degToRad(p2.Lat);

	var sdLat = Math.sin(dLat / 2);
	var sdLon = Math.sin(dLon / 2);

	var a = sdLat * sdLat + sdLon * sdLon * Math.cos(lat1) * Math.cos(lat2); 
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
	return earthRadiusKm * c;
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
		strokeOpacity: 0.3,
		strokeWeight: 1,
	});

	line.setMap(map);
}
function FindAndDrawLine(p1: Place, c1: number, p2: Place, c2: number, p3: Place, c3: number, p4: Place, c4: number, bandSize: number) {
	//console.log({c1, c2, c3, c4});
	var qMin: number = QuantitizeCost(Math.min(c1, c2, c3, c4), bandSize);
	//console.log({bandSize, qMin});
	var v1: number = c1 - qMin;
	var v2: number = c2 - qMin;
	var v3: number = c3 - qMin;
	var v4: number = c4 - qMin;
	var index: number = 0;
	index += 1 * (+(v1 > 0));
	index += 2 * (+(v2 > 0));
	index += 4 * (+(v3 > 0));
	index += 8 * (+(v4 > 0));
	if (index < 15)
		console.log({v1, v2, v3, v4, qMin, index});
	switch (index) {
	case 0:console.log("Why am I here?");break;
	case 1:
		break;
	case 2:
		break;
	case 3:
		break;
	case 4:
		break;
	case 5:
		break;
	case 6:
		break;
	case 7:
		break;
	case 8:
		break;
	case 9:
		break;
	case 10:
		break;
	case 11:
		break;
	case 12:
		break;
	case 13:
		break;
	case 14:
		break;
	case 15:console.log("Why am I here?");break;
	}
}

function QuantitizeCost(v: number, step: number) {
	// ceil or floor, that is the question
	return step * Math.ceil(v / step);
}

function AllEqual(v1: number, v2: number, v3: number, v4: number, v5: number) {
	return v1 == v2 && v2 == v3 && v3 == v4 && v4 == v5;
}

function explore(dSet: DestinationSet, box: BoundingBox, bandSize: number, minsize: number) {
	// console.log("inside of explore();");
	// console.log(box);
	var p1: Place = box.SW;
	var p2: Place = box.NW;
	var p3: Place = box.NE;
	var p4: Place = box.SE;
	var p5: Place = box.Center;
	var c1: number = dSet.ComputeCostFrom(p1, earthCoordinateDistanceKm);
	var c2: number = dSet.ComputeCostFrom(p2, earthCoordinateDistanceKm);
	var c3: number = dSet.ComputeCostFrom(p3, earthCoordinateDistanceKm);
	var c4: number = dSet.ComputeCostFrom(p4, earthCoordinateDistanceKm);
	var c5: number = dSet.ComputeCostFrom(p5, earthCoordinateDistanceKm);

	if (AllEqual(QuantitizeCost(c1, bandSize), QuantitizeCost(c2, bandSize), QuantitizeCost(c3, bandSize), QuantitizeCost(c4, bandSize), QuantitizeCost(c5, bandSize))) {
		// see: https://developers.google.com/maps/documentation/javascript/reference/visualization
		// TODO: Paint map with translucid color based on cost.
		DrawRectangle(box, (c1 + c2 + c3 + c4) / 4);
	} else {
		var dLat: number = box.Max.Lat - box.Min.Lat;
		var dLon: number = box.Max.Long - box.Min.Long;

		if (dLat < minsize && dLon < minsize) {
			// console.log("Line");
			// console.log(box);
			DrawDarkRectangle(box);
			FindAndDrawLine(p1, c1, p2, c2, p3, c3, p4, c4, bandSize);
			// TODO: Paint "line" color.
		} else {
			var mid: number;
			var childBox1: BoundingBox;
			var childBox2: BoundingBox;
			if (dLat > dLon) {
				//mid = (box.Min.Lat + box.Max.Lat) / 2;
				mid = 0.3*box.Min.Lat + 0.7*box.Max.Lat;
				childBox1 = new BoundingBox(box.Min, new Place(mid, box.Max.Long));
				childBox2 = new BoundingBox(new Place(mid, box.Min.Long), box.Max);
				explore(dSet, childBox1, bandSize, minsize);
				explore(dSet, childBox2, bandSize, minsize);
			} else {
				//mid = (box.Min.Long + box.Max.Long) / 2;
				mid = 0.3*box.Min.Long + 0.7*box.Max.Long;
				childBox1 = new BoundingBox(box.Min, new Place(box.Max.Lat, mid));
				childBox2 = new BoundingBox(new Place(box.Min.Lat, mid), box.Max);
				explore(dSet, childBox1, bandSize, minsize);
				explore(dSet, childBox2, bandSize, minsize);
			}			
		}
	}
}

// TESTS:
console.log("Tests:");


function testTotalCost() {


	var places: Place[] = [new Place(1,0), new Place(0,1), new Place(-1,0), new Place(0,-1)];
	var destinations: Destination[] = [new Destination(places[0], 1), new Destination(places[1], 2), new Destination(places[2], 3), new Destination(places[3], 4)];
	var dSet: DestinationSet= new DestinationSet(destinations);
	var tCost: number = dSet.ComputeCostFromEuclidean(new Place(0,0));
	if (tCost == 10) {
		console.log("10 is OK");
	} else {
		console.log("Total cost is: " + tCost + "\n Expected 10.");
	}
}
function testRealPlaces() {
	var barcelona: Destination = new Destination(new Place(41.3927754, 2.0699778), 1);
	var paris: Destination = new Destination(new Place(48.8589465, 2.2768239), 6);
	var berlin: Destination = new Destination(new Place(52.50697, 13.2843069), 2);
	var zurich: Destination = new Destination(new Place(47.3774682, 8.3930421), 4);
	var dSet: DestinationSet = new DestinationSet([barcelona, paris, berlin, zurich]);
	var origin: Place = new Place(46.8730811, 3.2886396);
	var tCost: number = dSet.ComputeCostFrom(origin, earthCoordinateDistanceKm);
	console.log("Total cost: " + tCost + "Km");
	var centroid: Place = dSet.GetWheightedCentroid();
	console.log(centroid);
	var tCost2: number = dSet.ComputeCostFrom(centroid, earthCoordinateDistanceKm);
	console.log("Total cost: " + tCost2 + "Km");

}
function testExplore() {
	console.log("testExplore() start");
	var paris: Destination = new Destination(new Place(48.8589465, 2.2768239), 8);
	var berlin: Destination = new Destination(new Place(52.50697, 13.2843069), 8);
	var barcelona: Destination = new Destination(new Place(41.3927754, 2.0699778), 1);
	var zurich: Destination = new Destination(new Place(47.3774682, 8.3930421), 1);
	var dSet: DestinationSet = new DestinationSet([barcelona, paris, berlin, zurich]);
	
	//var box: BoundingBox = dSet.GetBoundingBox();
	var box: BoundingBox = new BoundingBox(paris.Place);
	box.Expand(zurich.Place);
	box.ExpandBy(80);
	box.ExpandLatBy(170);
	box.ExpandLongBy(20);
	console.log("explore() start");
	explore(dSet, box, 1000, 0.1);
	console.log("explore() end");

	AddMarker(barcelona);
	AddMarker(paris);
	AddMarker(berlin);
	AddMarker(zurich);
	console.log("testExplore() end");
}
testTotalCost();
testRealPlaces();
//testExplore();
