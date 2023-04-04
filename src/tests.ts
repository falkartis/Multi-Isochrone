import { ICostCalculator, TaxicabDist, EightDirections, EuclideanDist, LatCorrectedEuclidean, HaversineDist } from './CostCalculator.js';
import { LinearDiscretizer, LnDiscretizer, LogDiscretizer } from './Discretizer.js';
import { IDestination, WeightedPlace, AllDestinations } from './DestinationSet.js';
import { GoogleMapsConnector } from './GoogleMapsConnector.js';
import { DefaultCostMatrixProvider } from './CostMatrix.js';
import { IMapConnector } from './MapConnector.js';
import { BoundingBox } from './BoundingBox.js';
import { Explorer } from './Explorer.js';
import { Place } from './index.js';

// TODO: tidy this up
let map: google.maps.Map;

var mapConn: IMapConnector;

declare global {
	interface Window { googleMap: any; }
}

window.addEventListener('load', function() {
	
	console.log("In load");

	mapConn = new GoogleMapsConnector(window.googleMap);
	console.log("testTotalCost:");
	Tests.testTotalCost();
	console.log("testRealPlaces:");
	Tests.testRealPlaces();
	console.log("testExplore:");
	Tests.testExplore();
});


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

	let dst: WeightedPlace = new WeightedPlace(lat, lng, w);
	mapConn.AddMarker(dst);

	return false; // prevent reload
};

// END TODO: tidy this up


// Dirty trick?
let RedrawTimer: ReturnType<typeof setTimeout>;
// end dirty trick


// TESTS:
export class Tests {

	public static async testTotalCost() {
		let destinations: WeightedPlace[] = [
			new WeightedPlace(1, 0, 1),
			new WeightedPlace(0, 1, 2),
			new WeightedPlace(-1, 0, 3),
			new WeightedPlace(0, -1, 4)
		];
		let dSet: IDestination = new AllDestinations(destinations);
		let calc: ICostCalculator = new EuclideanDist();
		let tCost: number = await dSet.ComputeCostFrom(new Place(0,0), calc);
		if (tCost == 10) {
			console.log("10 is OK");
		} else {
			console.log("Total cost is: " + tCost + "\n Expected 10.");
		}
	}
	public static async testRealPlaces() {
		let barcelona:	WeightedPlace = new WeightedPlace(41.3927754,	 2.0699778, 1);
		let paris:		WeightedPlace = new WeightedPlace(48.8589465,	 2.2768239, 6);
		let berlin:		WeightedPlace = new WeightedPlace(52.50697,		13.2843069, 2);
		let zurich:		WeightedPlace = new WeightedPlace(47.3774682,	 8.3930421, 4);
		
		let dSet: IDestination = new AllDestinations([barcelona, paris, berlin, zurich]);
		let origin: Place = new Place(46.8730811, 3.2886396);
		let costCalc: ICostCalculator = new HaversineDist();
		console.log({barcelona, paris, berlin, zurich, dSet, origin, costCalc});
		let tCost: number = await dSet.ComputeCostFrom(origin, costCalc);
		console.log("Total cost: " + tCost + "Km");
		let centroid: Place = dSet.GetCentroid();
		console.log(centroid);
		let tCost2: number = await dSet.ComputeCostFrom(centroid, costCalc);
		console.log("Total cost: " + tCost2 + "Km");

	}
	public static async testExplore() {
		console.log("testExplore() start");
		let paris:		WeightedPlace = new WeightedPlace(48.8589465,	 2.2768239, 7);
		let berlin:		WeightedPlace = new WeightedPlace(52.50697,		13.2843069, 7);
		let barcelona:	WeightedPlace = new WeightedPlace(41.3927754,	 2.0699778, 2);
		let zurich:		WeightedPlace = new WeightedPlace(47.3774682,	 8.3930421, 3);
		
		let dSet: IDestination = new AllDestinations([barcelona, paris, berlin, zurich]);
		//let box: BoundingBox = dSet.GetBoundingBox();
		let box: BoundingBox = new BoundingBox(paris);
		box.Expand(zurich);
		box.ExpandBy(80);
		box.ExpandLatBy(230);
		box.ExpandLongBy(40);

		let boxSize: number = Math.min(box.SizeLat, box.SizeLong);

		let centroidP = dSet.GetCentroid();
		let centroidWP: WeightedPlace = new WeightedPlace(centroidP.Lat, centroidP.Long, 0);

		let costCalc: ICostCalculator = new HaversineDist();
		//let costCalc: CostCalculator = new LatCorrectedEuclideanDistance(centroid.Place.Lat);
		let centroidCost: number = await dSet.ComputeCostFrom(centroidP, costCalc);
		mapConn.AddMarker(centroidWP);
		console.log({centroidCost});

		console.log("explore() start");
		//let disc = new LnDiscretizer(0.1, centroidCost * 0.988);
		//let disc = new LnDiscretizer(0.1, 8965.5);
		let disc = new LnDiscretizer(0.6, 8965.55);
		//let disc = new LinearDiscretizer(200, 0);
		let matrixProv = new DefaultCostMatrixProvider(costCalc);

		let explorer: Explorer = new Explorer(dSet, disc, matrixProv, mapConn);

		explorer.Explore(box, boxSize/15, boxSize/50);

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

		window.googleMap.addListener("zoom_changed", () => { Tests.Redraw(explorer); });
		window.googleMap.addListener("dragend", () => { 		Tests.Redraw(explorer);	});
	}

	public static Redraw(explorer: Explorer){

		clearTimeout(RedrawTimer);

		RedrawTimer = setTimeout(()=>{
			console.time('Redraw');
			mapConn.ClearLines();
			explorer.DestSet.ClearCostCache();
			let boxes: BoundingBox[] = mapConn.GetBoundingBoxes();
			for (let box of boxes) {
				box.ExpandBy(50);
				let boxSize: number = Math.min(box.SizeLat, box.SizeLong);
				//explorer.Debug = true;
				explorer.Explore(box, boxSize/2, boxSize/80);
			}
			console.timeEnd('Redraw')
		}, 1000);

	}
}

