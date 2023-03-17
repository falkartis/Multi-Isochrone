import { CostCalculator, EuclideanDistance, HaversineDistance, LatCorrectedEuclideanDistance } from './CostCalculator.js'
import { Explorer, BoundingBox, DestinationSet, Place, Destination } from './index.js';
import { LinearDiscretizer, LnDiscretizer, LogDiscretizer } from './Discretizer.js'
import { GoogleMapsConnector } from './GoogleMapsConnector.js'
import { MapConnector } from './MapConnector.js'


// TODO: tidy this up
let map: google.maps.Map;

let mapConn: MapConnector;

export function initMap(): void {

	const myLatLng = { lat: 0, lng: 0 };
	map = new google.maps.Map(
		document.getElementById("map") as HTMLElement,
		{
			zoom: 2,
			center: { lat: 0, lng: 0 },
		}
	);
	mapConn = new GoogleMapsConnector(map);
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
	mapConn.AddMarker(dst);

	return false; // prevent reload
};

// END TODO: tidy this up


// Dirty trick?
let RedrawTimer: ReturnType<typeof setTimeout>;
// end dirty trick


// TESTS:
export class Tests {

	public static testTotalCost() {
		var places: Place[] = [new Place(1,0), new Place(0,1), new Place(-1,0), new Place(0,-1)];
		var destinations: Destination[] = [
			new Destination(places[0], 1),
			new Destination(places[1], 2),
			new Destination(places[2], 3),
			new Destination(places[3], 4)
		];
		var dSet: DestinationSet= new DestinationSet(destinations);
		var calc: EuclideanDistance = new EuclideanDistance();
		var tCost: number = dSet.ComputeCostFrom(new Place(0,0), calc);
		if (tCost == 10) {
			console.log("10 is OK");
		} else {
			console.log("Total cost is: " + tCost + "\n Expected 10.");
		}
	}
	public static testRealPlaces() {
		var barcelona: Destination = new Destination(new Place(41.3927754, 2.0699778), 1);
		var paris: Destination = new Destination(new Place(48.8589465, 2.2768239), 6);
		var berlin: Destination = new Destination(new Place(52.50697, 13.2843069), 2);
		var zurich: Destination = new Destination(new Place(47.3774682, 8.3930421), 4);
		var dSet: DestinationSet = new DestinationSet([barcelona, paris, berlin, zurich]);
		var origin: Place = new Place(46.8730811, 3.2886396);
		var costCalc: CostCalculator = new HaversineDistance();
		console.log({barcelona, paris, berlin, zurich, dSet, origin, costCalc});
		var tCost: number = dSet.ComputeCostFrom(origin, costCalc);
		console.log("Total cost: " + tCost + "Km");
		var centroid: Place = dSet.GetWheightedCentroid();
		console.log(centroid);
		var tCost2: number = dSet.ComputeCostFrom(centroid, costCalc);
		console.log("Total cost: " + tCost2 + "Km");

	}
	public static testExplore() {
		console.log("testExplore() start");
		var paris: Destination = new Destination(new Place(48.8589465, 2.2768239), 7);
		var berlin: Destination = new Destination(new Place(52.50697, 13.2843069), 7);
		var barcelona: Destination = new Destination(new Place(41.3927754, 2.0699778), 2);
		var zurich: Destination = new Destination(new Place(47.3774682, 8.3930421), 3);
		var dSet: DestinationSet = new DestinationSet([barcelona, paris, berlin, zurich]);
		
		//var box: BoundingBox = dSet.GetBoundingBox();
		var box: BoundingBox = new BoundingBox(paris.Place);
		box.Expand(zurich.Place);
		box.ExpandBy(80);
		box.ExpandLatBy(230);
		box.ExpandLongBy(40);

		var boxSize: number = Math.min(box.SizeLat, box.SizeLong);

		var centroid: Destination = new Destination(dSet.GetWheightedCentroid(), 0);

		var costCalc: CostCalculator = new HaversineDistance();
		//var costCalc: CostCalculator = new LatCorrectedEuclideanDistance(centroid.Place.Lat);
		var centroidCost: number = dSet.ComputeCostFrom(centroid.Place, costCalc);
		mapConn.AddMarker(centroid);
		console.log({centroidCost});

		console.log("explore() start");
		//var disc = new LnDiscretizer(0.1, centroidCost * 0.988);
		//var disc = new LnDiscretizer(0.1, 8965.5);
		var disc = new LnDiscretizer(0.6, 8965.55);
		//var disc = new LinearDiscretizer(200, 0);
		var explorer: Explorer = new Explorer(dSet, 200, boxSize/15, boxSize/50, costCalc, disc, mapConn);

		explorer.Explore(box);

		console.log("explore() end");

		mapConn.AddMarker(barcelona);
		mapConn.AddMarker(paris);
		mapConn.AddMarker(berlin);
		mapConn.AddMarker(zurich);
		console.log("testExplore() end");

		console.log("inside of AddRedraw()");
	
		var b = document.createElement('button');
		b.innerHTML = "Redraw";

		b.addEventListener('click', function(e){ Tests.Redraw(explorer); });
		logTag.appendChild(b);

		map.addListener("zoom_changed", () => { Tests.Redraw(explorer); });
		map.addListener("dragend", () => { 		Tests.Redraw(explorer);	});
	}

	public static Redraw(explorer: Explorer){

		clearTimeout(RedrawTimer);

		setTimeout(()=>{
			console.time('Redraw');
			mapConn.ClearLines();
			var box: BoundingBox = mapConn.GetBoundingBox();
			box.ExpandBy(50);
			var boxSize: number = Math.min(box.SizeLat, box.SizeLong);
			explorer.SetMaxSize(boxSize/6);
			explorer.SetMinSize(boxSize/25);
			explorer.Debug = true;
			explorer.Explore(box);
			console.timeEnd('Redraw')
		}, 1000);

	}
}


document.body.onload = function() {
	console.log("testTotalCost:");
	Tests.testTotalCost();
	console.log("testRealPlaces:");
	Tests.testRealPlaces();
	console.log("testExplore:");
	Tests.testExplore();
} 