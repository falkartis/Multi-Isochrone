import { ICostCalculator } from './CostCalculator.js';
import { Place, BoundingBox } from './index.js';
import { Dictionary } from './Dictionary.js';

export interface IDestination {
	ComputeCostFrom(origin: Place, calc: ICostCalculator): number;
	ClearCostCache(): void;
	GetCentroid(): Place;
	get Weight(): number;
}
export interface IDestinationSet extends IDestination {
	AddDestination(dest: IDestination): void;
}

abstract class DestinationSet {
	Destinations: IDestination[];
	CostCache: Dictionary<Place, number>;
	Weight: number;

	constructor(destinations: IDestination[], weight?: number) {
		this.Destinations = destinations;
		this.Weight = weight ?? 1;
		this.CostCache = new Dictionary<Place, number>();
	}

	ClearCostCache() {
		this.CostCache.Clear();
		for (let dest of this.Destinations) {
			dest.ClearCostCache();
		}
	}

	CacheThis(origin: Place, callback: (key: Place) => number) {
		let cached = this.CostCache.Get(origin);
		if (cached != undefined)
			return cached;

		const cost = callback(origin);

		this.CostCache.Add(origin, cost);
		return cost;
	}

	GetCentroid() {
		let lats: number = 0;
		let longs: number = 0;
		let weights: number = 0;
		for (let dest of this.Destinations) {
			lats += dest.GetCentroid().Lat * dest.Weight;
			longs += dest.GetCentroid().Long * dest.Weight;
			weights += dest.Weight;
		}
		return new Place(lats / weights, longs / weights);
	}

	AddDestination(dest: IDestination) {
		this.Destinations.push(dest);
		this.ClearCostCache();
	}
}

export class AllDestinations extends DestinationSet implements IDestinationSet {

	constructor(destinations: IDestination[], weight?: number) {
		super(destinations, weight);
	}

	ComputeCostFrom(origin: Place, calc: ICostCalculator) {

		return this.CacheThis(origin, orig => {

			let totalCost: number = 0;
			for (let destination of this.Destinations) {
				let cost = destination.ComputeCostFrom(origin, calc) * destination.Weight;
				totalCost += cost;
			}
			return totalCost;
		});
	}
}

export class AnyDestination extends DestinationSet implements IDestinationSet {

	constructor(destinations: IDestination[], weight?: number) {
		super(destinations, weight);
	}
	ComputeCostFrom(origin: Place, calc: ICostCalculator) {
		return this.CacheThis(origin, orig => {

			let lowestCost: number = Number.POSITIVE_INFINITY;
			for (let destination of this.Destinations) {
				let cost = destination.ComputeCostFrom(origin, calc) * destination.Weight;
				if (cost < lowestCost)
					lowestCost = cost;
			}
			return lowestCost;
		});
	}
}

export class TwoOfThem extends DestinationSet implements IDestinationSet {

	constructor(destinations: IDestination[], weight?: number) {
		super(destinations, weight);
	}
	ComputeCostFrom(origin: Place, calc: ICostCalculator) {
		return this.CacheThis(origin, orig => {

			let lowestCost: number = Number.POSITIVE_INFINITY;
			let secondLowestCost: number = Number.POSITIVE_INFINITY;
			for (let destination of this.Destinations) {
				let cost = destination.ComputeCostFrom(origin, calc) * destination.Weight;
				if (cost < lowestCost) {
					secondLowestCost = lowestCost;
					lowestCost = cost;
				}
			}
			if (secondLowestCost == Number.POSITIVE_INFINITY)
				return lowestCost;
			else
				return (lowestCost + secondLowestCost) / 2; // Divide by 2 because here we consider a circular path.
		});
	}
}
