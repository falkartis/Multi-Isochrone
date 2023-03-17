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

	let p = document.createElement('p');

	let w: number = +formWheight.value;
	let lat: number = +formLat.value;
	let lng: number = +formLong.value;
	p.innerHTML = "W:" + w + ", lat:" + lat + ", long:" + lng;
	logTag.appendChild(p);

	let pl: Place = new Place(lat, lng);
	let dst: Destination = new Destination(pl, w);
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
		let places: Place[] = [new Place(1,0), new Place(0,1), new Place(-1,0), new Place(0,-1)];
		let destinations: Destination[] = [
			new Destination(places[0], 1),
			new Destination(places[1], 2),
			new Destination(places[2], 3),
			new Destination(places[3], 4)
		];
		let dSet: DestinationSet= new DestinationSet(destinations);
		let calc: EuclideanDistance = new EuclideanDistance();
		let tCost: number = dSet.ComputeCostFrom(new Place(0,0), calc);
		if (tCost == 10) {
			console.log("10 is OK");
		} else {
			console.log("Total cost is: " + tCost + "\n Expected 10.");
		}
	}
	public static testRealPlaces() {
		let barcelona: Destination = new Destination(new Place(41.3927754, 2.0699778), 1);
		let paris: Destination = new Destination(new Place(48.8589465, 2.2768239), 6);
		let berlin: Destination = new Destination(new Place(52.50697, 13.2843069), 2);
		let zurich: Destination = new Destination(new Place(47.3774682, 8.3930421), 4);
		let dSet: DestinationSet = new DestinationSet([barcelona, paris, berlin, zurich]);
		let origin: Place = new Place(46.8730811, 3.2886396);
		let costCalc: CostCalculator = new HaversineDistance();
		console.log({barcelona, paris, berlin, zurich, dSet, origin, costCalc});
		let tCost: number = dSet.ComputeCostFrom(origin, costCalc);
		console.log("Total cost: " + tCost + "Km");
		let centroid: Place = dSet.GetWheightedCentroid();
		console.log(centroid);
		let tCost2: number = dSet.ComputeCostFrom(centroid, costCalc);
		console.log("Total cost: " + tCost2 + "Km");

	}
	public static testExplore() {
		console.log("testExplore() start");
		let paris: Destination = new Destination(new Place(48.8589465, 2.2768239), 7);
		let berlin: Destination = new Destination(new Place(52.50697, 13.2843069), 7);
		let barcelona: Destination = new Destination(new Place(41.3927754, 2.0699778), 2);
		let zurich: Destination = new Destination(new Place(47.3774682, 8.3930421), 3);
		let dSet: DestinationSet = new DestinationSet([barcelona, paris, berlin, zurich]);
		
		//let box: BoundingBox = dSet.GetBoundingBox();
		let box: BoundingBox = new BoundingBox(paris.Place);
		box.Expand(zurich.Place);
		box.ExpandBy(80);
		box.ExpandLatBy(230);
		box.ExpandLongBy(40);

		let boxSize: number = Math.min(box.SizeLat, box.SizeLong);

		let centroid: Destination = new Destination(dSet.GetWheightedCentroid(), 0);

		let costCalc: CostCalculator = new HaversineDistance();
		//let costCalc: CostCalculator = new LatCorrectedEuclideanDistance(centroid.Place.Lat);
		let centroidCost: number = dSet.ComputeCostFrom(centroid.Place, costCalc);
		mapConn.AddMarker(centroid);
		console.log({centroidCost});

		console.log("explore() start");
		//let disc = new LnDiscretizer(0.1, centroidCost * 0.988);
		//let disc = new LnDiscretizer(0.1, 8965.5);
		let disc = new LnDiscretizer(0.6, 8965.55);
		//let disc = new LinearDiscretizer(200, 0);
		let explorer: Explorer = new Explorer(dSet, 200, boxSize/15, boxSize/50, costCalc, disc, mapConn);

		explorer.Explore(box);

		console.log("explore() end");

		mapConn.AddMarker(barcelona);
		mapConn.AddMarker(paris);
		mapConn.AddMarker(berlin);
		mapConn.AddMarker(zurich);
		console.log("testExplore() end");

		console.log("inside of AddRedraw()");
	
		let b = document.createElement('button');
		b.innerHTML = "Redraw";

		b.addEventListener('click', function(e){ Tests.Redraw(explorer); });
		logTag.appendChild(b);

		map.addListener("zoom_changed", () => { Tests.Redraw(explorer); });
		map.addListener("dragend", () => { 		Tests.Redraw(explorer);	});
	}

	public static Redraw(explorer: Explorer){

		clearTimeout(RedrawTimer);

		RedrawTimer = setTimeout(()=>{
			console.time('Redraw');
			mapConn.ClearLines();
			explorer.DestSet.ClearCostCache();
			let box: BoundingBox = mapConn.GetBoundingBox();
			box.ExpandBy(50);
			let boxSize: number = Math.min(box.SizeLat, box.SizeLong);
			explorer.SetMaxSize(boxSize/2);
			explorer.SetMinSize(boxSize/80);
			//explorer.Debug = true;
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