import { IMapConnector, ConsoleLogConnector } from './MapConnector.js';
import { CostMatrix, ICostMatrixProvider } from './CostMatrix.js';
import { ICostCalculator } from './CostCalculator.js';
import { IDestination } from './DestinationSet.js';
import { IDiscretizer } from './Discretizer.js';
import { BoundingBox } from './BoundingBox.js';
import { LineDrawer } from './LineDrawer.js';
import { Place } from './index.js';

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

		return this.GetCosts(places).then(edgesCosts=> {

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
