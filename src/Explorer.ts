import { IMapConnector, ConsoleLogConnector } from './MapConnector.js';
import { CostMatrix, ICostMatrixProvider } from './CostMatrix.js';
import { IDestination } from './DestinationSet.js';
import { IDiscretizer } from './Discretizer.js';
import { BoundingBox } from './BoundingBox.js';
import { LineDrawer } from './LineDrawer.js';
import { Place } from './index.js';

export class Explorer {
	Discretizer: IDiscretizer;
	DestSet: IDestination;
	Map: IMapConnector;
	debug: boolean = false;
	LineDrawer: LineDrawer;
	RawCosts: CostMatrix;
	CostMatrixProvider: ICostMatrixProvider;

	constructor(dSet: IDestination, disc: IDiscretizer, costMatProv: ICostMatrixProvider, map?: IMapConnector) {
		this.DestSet = dSet;

		this.CostMatrixProvider = costMatProv;
		this.Discretizer = disc;
		this.Map = map ?? new ConsoleLogConnector();
		this.LineDrawer = new LineDrawer(this.Map, this.debug);
		this.RawCosts = new CostMatrix();
	}

	get Debug() {	return this.debug;		}

	set Debug(value: boolean) {
		this.debug = value;
		this.LineDrawer.Debug = value;
	}

	GetCosts(origins: Place[]): Promise<number[]> {

		const dests = this.DestSet.GetPlaces();

		this.CostMatrixProvider.FillMissing(origins, dests, this.RawCosts);

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

	Explore(box: BoundingBox, maxsize: number, minsize: number): Promise<void> {
		return this.InnerExplore(box, maxsize, minsize);
	}

	InnerExplore(box: BoundingBox, maxSize: number, minSize: number): Promise<void> {

		if (box.SizeLat > maxSize || box.SizeLong > maxSize) {
			return this.Divide(box, maxSize, minSize);
		}

		const places = this.CornersEdgesAndCenter(box);

		return this.GetCosts(places).then(edgesCosts=> {

			let edgesDiscrete: number[] = edgesCosts.map(cost => this.Discretizer.Discretize(cost));
			let edgesEqual = this.AllEqual(edgesDiscrete);

			if (edgesEqual) {
				if (this.Debug) this.Map.DrawRedRectangle(box, edgesCosts[edgesCosts.length - 1]);
				return;
			}

			if (box.SizeLat < minSize && box.SizeLong < minSize) {
				if (this.Debug) this.Map.DrawDarkRectangle(box);
				const corners =			[places[0],			places[1],			places[2],			places[3]];
				const cornerCosts =		[edgesCosts[0],		edgesCosts[1],		edgesCosts[2],		edgesCosts[3]];
				const cornerDiscrete =	[edgesDiscrete[0],	edgesDiscrete[1],	edgesDiscrete[2],	edgesDiscrete[3]];
				this.LineDrawer.FindLines(corners, cornerCosts, cornerDiscrete);
				return;
			}
			return this.Divide(box, maxSize, minSize);
		});
	}

	Divide(box: BoundingBox, maxsize: number, minsize: number): Promise<void> {
		let childBoxes: BoundingBox[];
		if (box.SizeLat > box.SizeLong) {
			childBoxes = box.BoxGrid(3, 1);
		} else {
			childBoxes = box.BoxGrid(1, 3);
		}
		let promises = [
			this.InnerExplore(childBoxes[1], maxsize, minsize),
			this.InnerExplore(childBoxes[0], maxsize, minsize),
			this.InnerExplore(childBoxes[2], maxsize, minsize)
		];
		return Promise.all(promises).then(() => {});
	}


}
