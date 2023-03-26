import { IMapConnector, ConsoleLogConnector } from './MapConnector.js';
import { CostMatrix, ICostMatrixProvider } from './CostMatrix.js';
import { ICostCalculator } from './CostCalculator.js';
import { IDestination } from './DestinationSet.js';
import { IDiscretizer } from './Discretizer.js';
import { BoundingBox } from './BoundingBox.js';
import { Place } from './index.js';

class LineDrawer {
	Map: IMapConnector;
	Debug: boolean;

	constructor(map: IMapConnector, debug: boolean) {
		this.Map = map;
		this.Debug = debug;
	}
	Interpolate(p1: Place, p2: Place, v1: number, v2: number) {
		let t: number = v1 / (v1 - v2);
		return p1.Lerp(t, p2);
	}
	DrawLine(p: Place[], c: number[], discVal: number) {

		let v: number[] = c.map( cost => cost - discVal);

		let index: number = 0;
		index += 1 * (+(v[0] > 0));
		index += 2 * (+(v[1] > 0));
		index += 4 * (+(v[2] > 0));
		index += 8 * (+(v[3] > 0));

		let l1: Place|null = null;
		let l2: Place|null = null;
		switch (index) {
			// CORNERS:
			case 1:	case 14:	l1 = this.Interpolate(p[0], p[1], v[0], v[1]);  l2 = this.Interpolate(p[0], p[3], v[0], v[3]);  break;
			case 2:	case 13:	l1 = this.Interpolate(p[1], p[0], v[1], v[0]);  l2 = this.Interpolate(p[1], p[2], v[1], v[2]);  break;
			case 4:	case 11:	l1 = this.Interpolate(p[2], p[1], v[2], v[1]);  l2 = this.Interpolate(p[2], p[3], v[2], v[3]);  break;
			case 7:	case 8:		l1 = this.Interpolate(p[3], p[0], v[3], v[0]);  l2 = this.Interpolate(p[3], p[2], v[3], v[2]);  break;

			// LINE THROUGH:
			case 6:	case 9:		l1 = this.Interpolate(p[0], p[1], v[0], v[1]);  l2 = this.Interpolate(p[2], p[3], v[2], v[3]);  break;
			case 3:	case 12:	l1 = this.Interpolate(p[0], p[3], v[0], v[3]);  l2 = this.Interpolate(p[1], p[2], v[1], v[2]);  break;

			// SADDLE POINT:
			case 5:	case 10:
					l1 = this.Interpolate(p[0], p[1], v[0], v[1]);
					l2 = this.Interpolate(p[0], p[3], v[0], v[3]);
				let l3 = this.Interpolate(p[2], p[3], v[2], v[3]);
				let l4 = this.Interpolate(p[1], p[2], v[1], v[2]);
				this.Map.AddLine(l3, l4, discVal);
				console.log("Saddle point yay.");
				break;

			// ALL EQUAL, SOLID COLOR, (Case handled somewhere else):
			case 0:	case 15:	if (this.Debug) console.log("Why am I here?");				break;
		}

		if (l1 == null || l2 == null) {
			if (this.Debug) console.log({v, discVal, index});
		} else {
			this.Map.AddLine(l1, l2, discVal);
		}
	}

	FindLines(p: Place[], c: number[], d: number[]) {

		let vals = new Map<number, number>();
		vals.set(d[0], 1);
		vals.set(d[1], 1);
		vals.set(d[2], 1);
		vals.set(d[3], 1);

		let max = Math.max(d[0], d[1], d[2], d[3]);

		for (let cost of vals.keys()) {
			if (cost != max)
				this.DrawLine(p, c, cost);
		}
	}
}

export class Explorer {
	CostCalculator: ICostCalculator; //TODO: nuke it
	Discretizer: IDiscretizer;
	DestSet: IDestination;
	Map: IMapConnector;
	maxSize: number;
	minSize: number;
	debug: boolean = false;
	LineDrawer: LineDrawer;
	RawCosts: CostMatrix;
	CostMatrixProvider: ICostMatrixProvider;

	constructor(dSet: IDestination, maxsize: number, minsize: number, disc: IDiscretizer, costMatProv: ICostMatrixProvider, costCalc: ICostCalculator, map?: IMapConnector) {
		this.DestSet = dSet;
		this.maxSize = maxsize;
		this.minSize = minsize;

		this.CostCalculator = costCalc;
		this.CostMatrixProvider = costMatProv;
		this.Discretizer = disc;
		this.Map = map ?? new ConsoleLogConnector();
		this.LineDrawer = new LineDrawer(this.Map, this.debug);
		this.RawCosts = new CostMatrix();
	}

	get MaxSize() {	return this.maxSize;	}
	get MinSize() {	return this.minSize;	}
	get Debug() {	return this.debug;		}

	set MaxSize(value: number) {	this.maxSize = value;	}
	set MinSize(value: number) {	this.minSize = value;	}

	set Debug(value: boolean) {
		this.debug = value;
		this.LineDrawer.Debug = value;
	}

	GetCosts(origins: Place[]): Promise<number[]> {
		//Get destination places from this.DestSet.GetPlaces.
		const dests = this.DestSet.GetPlaces();
		const costs: number[] = [];

		this.CostMatrixProvider.FillMissing(origins, dests, this.RawCosts);

		// Get the baked costs from the DestSet and return them
		return Promise.resolve(this.DestSet.GetCosts(origins, this.RawCosts));
	}


	AllEqual(args: number[]) {
		return args.every((val, i, arr) => val === arr[0]);
	}

	ComputeCost(p: Place): Promise<number> {
		return this.DestSet.ComputeCostFrom(p, this.CostCalculator);
	}

	CornersEdgesAndCenter(box: BoundingBox): Place[] {
		let result: Place[];
		if (box.SizeLat > box.SizeLong) {
			result = box.Edges(9, 6);
		} else {
			result = box.Edges(6, 9);
		}
		result.push(box.Center);
		return result;
	}

	Explore(box: BoundingBox): Promise<void> {

		if (box.SizeLat > this.MaxSize || box.SizeLong > this.MaxSize) {
			return this.Divide(box);
		}

		const places = this.CornersEdgesAndCenter(box);

		let edgeCostPromises = places.map(place => this.ComputeCost(place));

		return Promise.all(edgeCostPromises).then(edgesCosts => {

			let edgesDiscrete: number[] = edgesCosts.map(cost => this.Discretizer.Discretize(cost));
			let edgesEqual = this.AllEqual(edgesDiscrete);

			if (edgesEqual) {
				if (this.Debug) this.Map.DrawRedRectangle(box, edgesCosts[edgesCosts.length - 1]);
				return;
			}

			if (box.SizeLat < this.MinSize && box.SizeLong < this.MinSize) {
				if (this.Debug) this.Map.DrawDarkRectangle(box);
				const corners =			[places[0],			places[1],			places[2],			places[3]];
				const cornerCosts =		[edgesCosts[0],		edgesCosts[1],		edgesCosts[2],		edgesCosts[3]];
				const cornerDiscrete =	[edgesDiscrete[0],	edgesDiscrete[1],	edgesDiscrete[2],	edgesDiscrete[3]];
				this.LineDrawer.FindLines(corners, cornerCosts, cornerDiscrete);
				return;
			}
			return this.Divide(box);
		});
	}

	Divide(box: BoundingBox): Promise<void> {
		let childBoxes: BoundingBox[];
		if (box.SizeLat > box.SizeLong) {
			childBoxes = box.BoxGrid(3, 1);
		} else {
			childBoxes = box.BoxGrid(1, 3);
		}
		let promises = [
			this.Explore(childBoxes[1]),
			this.Explore(childBoxes[0]),
			this.Explore(childBoxes[2])
		];
		return Promise.all(promises).then(() => {});
	}


}
