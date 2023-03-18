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

export class AllDestGroup implements DestinationSet {
	ChildSets: DestinationSet[];
	CostCache: Dictionary<Place, number>;

	constructor(childSets: DestinationSet[]) {
		this.ChildSets = childSets;
		this.CostCache = new Dictionary<Place, number>();
	}

	ComputeCostFrom(origin: Place, calc: CostCalculator): number {
		let cached = this.CostCache.Get(origin);
		if (cached != undefined)
			return cached;

		let totalCost: number = 0;
		for (let child of this.ChildSets) {
			let cost = child.ComputeCostFrom(origin, calc);
			totalCost += cost;
		}
		this.CostCache.Add(origin, totalCost);
		return totalCost;
	}
	ClearCostCache(): void {
		this.CostCache.Clear();
		for (let child of this.ChildSets) {
			child.ClearCostCache();
		}		
	}
	GetWheightedCentroid(): Place {
		let lats: number = 0;
		let longs: number = 0;
		let wheights: number = 0;
		for (let child of this.ChildSets) {
			let place = child.GetWheightedCentroid();
			lats += place.Lat;
			longs += place.Long;
			wheights += 1;
		}
		return new Place(lats / wheights, longs / wheights);
	}
}

export class AnyDestGroup implements DestinationSet {
	ChildSets: DestinationSet[];
	CostCache: Dictionary<Place, number>;

	constructor(childSets: DestinationSet[]) {
		this.ChildSets = childSets;
		this.CostCache = new Dictionary<Place, number>();
	}

	ComputeCostFrom(origin: Place, calc: CostCalculator): number {
		let cached = this.CostCache.Get(origin);
		if (cached != undefined)
			return cached;

		let lowestCost: number = Number.POSITIVE_INFINITY;
		for (let child of this.ChildSets) {
			let cost = child.ComputeCostFrom(origin, calc);
			if (cost < lowestCost)
				lowestCost = cost;
		}

		this.CostCache.Add(origin, lowestCost);
		return lowestCost;
	}
	ClearCostCache(): void {
		this.CostCache.Clear();
		for (let child of this.ChildSets) {
			child.ClearCostCache();
		}		
	}
	GetWheightedCentroid(): Place {
		let lats: number = 0;
		let longs: number = 0;
		let wheights: number = 0;
		for (let child of this.ChildSets) {
			let place = child.GetWheightedCentroid();
			lats += place.Lat;
			longs += place.Long;
			wheights += 1;
		}
		return new Place(lats / wheights, longs / wheights);
	}
}
