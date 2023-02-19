let map: google.maps.Map;

function initMap(): void {

	const myLatLng = { lat: -25.363, lng: 131.044 };
	map = new google.maps.Map(
		document.getElementById("map") as HTMLElement,
		{
			zoom: 4,
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
	computeCostFrom(origin: Place, fn: (a: Place, b: Place) => number) {
		let totalCost: number = 0;
		for (let destination of this.Destinations) {
			var cost = destination.Wheight * fn(origin, destination.Place);
			totalCost += cost;
		}
		return totalCost;
	}
	computeCostFromEuclidean(origin: Place) {
		return this.computeCostFrom(origin, (a, b) => {
			var dLat: number = a.Lat - b.Lat;
			var dLong: number = a.Long - b.Long;
			return Math.sqrt((dLat * dLat) + (dLong * dLong));
		});
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
	var tCost: number = dSet.computeCostFromEuclidean(new Place(0,0));
	if (tCost == 10) {
		console.log("10 is OK");
	} else {
		console.log("Total cost is: " + tCost + "\n Expected 10.");
	}
}
testTotalCost();