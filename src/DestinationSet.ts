import { Place, Destination, BoundingBox } from './index.js';
import { CostCalculator } from './CostCalculator.js';
import { Dictionary } from './Dictionary.js';

export interface DestinationSet {
	ComputeCostFrom(origin: Place, calc: CostCalculator): number;
	ClearCostCache(): void;
	GetWheightedCentroid(): Place; // TODO: consider if really needed/usefull
}

export class AllDestinations implements DestinationSet {
	Destinations: Destination[];
	CostCache: Dictionary<Place, number>;
	constructor(destinations: Destination[]) {
		this.Destinations = destinations;
		this.CostCache = new Dictionary<Place, number>();
	}
	ClearCostCache() {
		this.CostCache.Clear();
	}
	ComputeCostFrom(origin: Place, calc: CostCalculator) {
		let cached = this.CostCache.Get(origin);
		if (cached != undefined)
			return cached;

		let totalCost: number = 0;
		for (let destination of this.Destinations) {
			let cost = destination.Wheight * calc.GetCost(origin, destination.Place);
			totalCost += cost;
		}
		this.CostCache.Add(origin, totalCost);
		return totalCost;
	}
	GetBoundingBox() {
		if (this.Destinations.length == 0)
			return null;
		let bb: BoundingBox = new BoundingBox(this.Destinations[0].Place);
		// Yes the first one is repeated, should be fixed.
		for (let dest of this.Destinations) {
			bb.Expand(dest.Place);
		}
		return bb;
	}
	GetWheightedCentroid() {
		let lats: number = 0;
		let longs: number = 0;
		let wheights: number = 0;
		for (let dest of this.Destinations) {
			lats += dest.Place.Lat * dest.Wheight;
			longs += dest.Place.Long * dest.Wheight;
			wheights += dest.Wheight;
		}
		return new Place(lats / wheights, longs / wheights);
	}
}
export class AnyDestination implements DestinationSet {
	Destinations: Destination[];
	CostCache: Dictionary<Place, number>;
	constructor(destinations: Destination[]) {
		this.Destinations = destinations;
		this.CostCache = new Dictionary<Place, number>();
	}
	ClearCostCache() {
		this.CostCache.Clear();
	}
	ComputeCostFrom(origin: Place, calc: CostCalculator) {
		let cached = this.CostCache.Get(origin);
		if (cached != undefined)
			return cached;

		let lowestCost: number = Number.POSITIVE_INFINITY;
		for (let destination of this.Destinations) {
			let cost = destination.Wheight * calc.GetCost(origin, destination.Place);
			if (cost < lowestCost)
				lowestCost = cost;
		}
		this.CostCache.Add(origin, lowestCost);
		return lowestCost;
	}
	GetBoundingBox() {
		if (this.Destinations.length == 0)
			return null;
		let bb: BoundingBox = new BoundingBox(this.Destinations[0].Place);
		// Yes the first one is repeated, should be fixed.
		for (let dest of this.Destinations) {
			bb.Expand(dest.Place);
		}
		return bb;
	}
	GetWheightedCentroid() {
		let lats: number = 0;
		let longs: number = 0;
		let wheights: number = 0;
		for (let dest of this.Destinations) {
			lats += dest.Place.Lat * dest.Wheight;
			longs += dest.Place.Long * dest.Wheight;
			wheights += dest.Wheight;
		}
		return new Place(lats / wheights, longs / wheights);
	}
}
