import { ICostCalculator } from './CostCalculator.js';
import { Dictionary } from './Dictionary.js';
import { Place } from './index.js';

export interface IDestination {
	ComputeCostFrom(origin: Place, calc: ICostCalculator): Promise<number>;
	ClearCostCache(): void;
	GetCentroid(): Place;
	get Weight(): number;
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
	ComputeCostFrom(origin: Place, calc: ICostCalculator): Promise<number> {
		return calc.GetCost(origin, this).then(cost => {
			return 2 * cost; // multiply by 2 because we consider roundtrip cost.
		});
	}

	ClearCostCache(): void {
		// Nothing to do here since we don't store costs on this class.
	}
	GetCentroid(): Place {
		return new Place(this.Lat, this.Long);
	}
}

abstract class DestinationSet {
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

	ComputeCostFrom(origin: Place, calc: ICostCalculator): Promise<number> {

		return new Promise<number> ((resolve, reject) => {

			const cached = this.CostCache.Get(origin);

			if (cached !== undefined) {
				resolve(cached);
			} else {

				this.InternComputeCostFrom(origin, calc).then(cost => {

					if (!this.CostCache.ContainsKey(origin)) {
						this.CostCache.Add(origin, cost);
					}
					resolve(cost);
				});
			}
		});
	}

	InternComputeCostFrom(origin: Place, calc: ICostCalculator): Promise<number> {
		return new Promise<number>((resolve, reject) => {
			let promises = this.Destinations.map(d => d.ComputeCostFrom(origin, calc).then(c => c * d.Weight));
			Promise.all(promises).then(costs => {
				resolve(this.AggregateCosts(costs));
			});
		});
	}
	abstract AggregateCosts(costs: number[]): number;
}

export class AllDestinations extends DestinationSet implements IDestinationSet {

	AggregateCosts(costs: number[]): number {
		let totalCost: number = 0;
		for (let i = 0; i < this.Destinations.length; i++) {
			let cost = costs[i];
			totalCost += cost;
		}
		return totalCost;
	}
}

export class AnyDestination extends DestinationSet implements IDestinationSet {

	AggregateCosts(costs: number[]): number {
		let lowestCost: number = Number.POSITIVE_INFINITY;
		for (let i = 0; i < this.Destinations.length; i++) {
			let cost = costs[i];
			let costWeight = cost;
			if (cost < lowestCost){
				lowestCost = cost;
			}
		}
		return lowestCost;
	}
}

export class TwoOfThem extends DestinationSet implements IDestinationSet {

	AggregateCosts(costs: number[]): number {
		let lowestCost: number = Number.POSITIVE_INFINITY;
		let secondLowestCost: number = Number.POSITIVE_INFINITY;
		for (let i = 0; i < this.Destinations.length; i++) {
			let cost = costs[i];
			let costWeight = cost;
			if (cost < secondLowestCost) {
				secondLowestCost = lowestCost;
				lowestCost = cost;
			}
		}
		if (secondLowestCost == Number.POSITIVE_INFINITY)
			return lowestCost;
		else
			return (lowestCost + secondLowestCost) / 2; // Divide by 2 because here we consider a circular path.
	}
}
