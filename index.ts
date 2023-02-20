let map: google.maps.Map;

function initMap(): void {

	const myLatLng = { lat: 0, lng: 0 };
	map = new google.maps.Map(
		document.getElementById("map") as HTMLElement,
		{
			zoom: 2,
			center: myLatLng,
		}
	);

	new google.maps.Marker({
		position: myLatLng,
		map,
		title: "Hello World!",
	});
}

// declare global {
// 	interface Window {
// 		initMap: () => void;
// 	}
// }
window.initMap = initMap;


const form = document.getElementById("markerForm") as HTMLFormElement;

form.onsubmit = () => {
	const formData = new FormData(form);

	console.log(formData);


	return false; // prevent reload
};


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
	constructor(place: Place) {
		this.Min = place;
		this.Max = place;
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
testTotalCost();
testRealPlaces();
