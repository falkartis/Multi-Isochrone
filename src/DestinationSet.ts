import { ICostCalculator } from './CostCalculator.js';
import { Dictionary } from './Dictionary.js';
import { CostMatrix } from './CostMatrix.js';
import { Place } from './index.js';


export interface IDestination {
	ComputeCostFrom(origin: Place, calc: ICostCalculator): number;
	GetCosts(origins: Place[], costMatrix: CostMatrix): number[];
	ClearCostCache(): void;
	GetCentroid(): Place;
	get Weight(): number;
	GetPlaces(): Place[];
}
export interface IDestinationSet extends IDestination {
	AddDestination(dest: IDestination): void;
}

export class WeightedPlace extends Place implements IDestination {
	Weight: number;
	Name: string;

	constructor(latitude: number, longitude: number, weight: number, name?: string) {
		super(latitude, longitude);
		this.Name = name ?? "";
		this.Weight = weight;
	}
	ComputeCostFrom(origin: Place, calc: ICostCalculator): number {
		// multiply by 2 because we consider roundtrip cost.
		return 2 * calc.GetCost(origin, this);
	}

	ClearCostCache(): void {
		// Nothing to do here since we don't store costs on this class.
	}
	GetCentroid(): Place {
		return new Place(this.Lat, this.Long);
	}
	GetPlaces(): Place[] {
		return [new Place(this.Lat, this.Long)];
	}
	GetCosts(origins: Place[], costMatrix: CostMatrix): number[] {
		const costs: number[] = [];
		for (const origin of origins) {
			const cost = costMatrix.get(origin, this);
			if (cost === undefined)
				throw new Error("WeightedPlace.GetCosts: CostMatrix lacks entries, it should be filled.");
			costs.push(cost * this.Weight);
		}
		return costs;
	}
}

abstract class DestinationSet implements IDestinationSet {
	readonly Destinations: IDestination[];
	readonly CostCache: Dictionary<Place, number>;
	readonly Weight: number;
	readonly Name: string;

	constructor(destinations: IDestination[], weight?: number, name?: string) {
		this.Destinations = destinations;
		this.Weight = weight ?? 1;
		this.Name = name ?? "";
		this.CostCache = new Dictionary<Place, number>();
	}

	ClearCostCache(): void {
		this.CostCache.Clear();
		for (let dest of this.Destinations) {
			dest.ClearCostCache();
		}
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

	ComputeCostFrom(origin: Place, calc: ICostCalculator): number {
		const cached = this.CostCache.Get(origin);

		if (cached !== undefined) {
			return cached;
		}

		const costs = this.Destinations.map(d => d.ComputeCostFrom(origin, calc) * d.Weight);

		const cost = this.AggregateCosts(costs);

		if (!this.CostCache.ContainsKey(origin)) {
			this.CostCache.Add(origin, cost);
		}
		return cost;
	}

	abstract AggregateCosts(costs: number[]): number;

	GetCosts(origins: Place[], costMatrix: CostMatrix): number[] {

		//TODO: refactor this method! without AI!!!
		const allCosts: number[] = [];

		for (const origin of origins) {

			let costs: number[] = [];
			for (const destination of this.Destinations) {

				const local = destination.GetCosts([origin], costMatrix);
				costs.push(local[0] * destination.Weight);
			}
			allCosts.push(this.AggregateCosts(costs));
		}
		return allCosts;
	}

	GetPlaces(): Place[] {
		let places: Place[] = [];

		for (let dest of this.Destinations) {
			let children = dest.GetPlaces();
			places.push(...children);
		}

		return places;
	}

}

export class AllDestinations extends DestinationSet {

	AggregateCosts(costs: number[]): number {
		return costs.reduce((totalCost, cost) => totalCost + cost, 0);
	}
}

export class AnyDestination extends DestinationSet {

	AggregateCosts(costs: number[]): number {
		return Math.min(...costs);
	}
}

export class TwoOfThem extends DestinationSet {

	AggregateCosts(costs: number[]): number {
		let lowestCost: number = Number.POSITIVE_INFINITY;
		let secondLowestCost: number = Number.POSITIVE_INFINITY;

		for (let cost of costs){
			if (cost < lowestCost) {
				secondLowestCost = lowestCost;
				lowestCost = cost;
			} else if (cost < secondLowestCost) {
				secondLowestCost = cost;
			}
		}
		if (secondLowestCost == Number.POSITIVE_INFINITY)
			return lowestCost;
		else
			return (lowestCost + secondLowestCost) / 2; // Divide by 2 because here we consider a circular path.
	}
}
