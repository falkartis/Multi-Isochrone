import { AddMarker, Explorer, BoundingBox, DestinationSet, Place, Destination } from './index.js';
import { CostCalculator, EuclideanDistance, HaversineDistance } from './CostCalculator.js'
import { LinearDiscretizer, LnDiscretizer } from './Discretizer.js'
export { initMap } from './index.js';

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
		var berlin: Destination = new Destination(new Place(52.50697, 13.2843069), 8);
		var barcelona: Destination = new Destination(new Place(41.3927754, 2.0699778), 1);
		var zurich: Destination = new Destination(new Place(47.3774682, 8.3930421), 1);
		var dSet: DestinationSet = new DestinationSet([barcelona, paris, berlin, zurich]);
		
		//var box: BoundingBox = dSet.GetBoundingBox();
		var box: BoundingBox = new BoundingBox(paris.Place);
		box.Expand(zurich.Place);
		box.ExpandBy(80);
		box.ExpandLatBy(230);
		box.ExpandLongBy(40);

		var boxSize: number = Math.min(box.SizeLat, box.SizeLong);

		console.log("explore() start");
		//var disc = new LnDiscretizer(200, 0);
		var disc = new LinearDiscretizer(200, 0);
		var explorer: Explorer = new Explorer(dSet, 200, boxSize/10, boxSize/120, undefined, disc);
		explorer.Explore(box);

		console.log("explore() end");

		AddMarker(barcelona);
		AddMarker(paris);
		AddMarker(berlin);
		AddMarker(zurich);
		console.log("testExplore() end");
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