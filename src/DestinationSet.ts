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
	async ComputeCostFrom(origin: Place, calc: ICostCalculator): Promise<number> {
		const cost = await calc.GetCost(origin, this);
		return 2 * cost; // multiply by 2 because we consider roundtrip cost.
		
		// return calc.GetCost(origin, this).then(cost => 2 * cost); // alternative form
	}

	ClearCostCache(): void {
		// Nothing to do here since we don't store costs on this class.
	}
	GetCentroid(): Place {
		return new Place(this.Lat, this.Long);
	}
}

abstract class DestinationSet {
	Destinations: IDestination[];
	CostCache: Dictionary<Place, number>;
	Weight: number;
	// TODO: add name here and to the constructors

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

	async CacheThis(origin: Place, callback: (key: Place) => Promise<number>): Promise<number> {
		const cached = this.CostCache.Get(origin);
		if (cached !== undefined) {
			return cached;
		}

		const cost = await callback(origin);

		
		try {
			this.CostCache.Add(origin, cost);
		} catch(error) {
			// Logging it is to hard if doing so hundreds of times.
			//console.log("Cache raced.");
		}
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

	async ComputeCostFrom(origin: Place, calc: ICostCalculator) {

		return await this.CacheThis(origin, orig => {
			return new Promise<number>((resolve, reject) => {
				resolve(this.InternComputeCostFrom(origin, calc));
			});
		});
	}

	async InternComputeCostFrom(origin: Place, calc: ICostCalculator) {	
		let totalCost: number = 0;
		for (let destination of this.Destinations) {
			try {
				let cost = await destination.ComputeCostFrom(origin, calc);
				let costWeight = cost * destination.Weight;
				totalCost += costWeight;
			} catch (error) {
				console.error(`Error in InternComputeCostFrom ${origin} ${calc}: ${error}`);
			}
		}
		return totalCost;
	}

}

export class AnyDestination extends DestinationSet implements IDestinationSet {

	constructor(destinations: IDestination[], weight?: number) {
		super(destinations, weight);
	}
	async ComputeCostFrom(origin: Place, calc: ICostCalculator) {
		return await this.CacheThis(origin, orig => {
			return new Promise<number>((resolve, reject) => {
				resolve(this.InternComputeCostFrom(origin, calc));
			});

		});
	}

	async InternComputeCostFrom(origin: Place, calc: ICostCalculator) {
		let lowestCost: number = Number.POSITIVE_INFINITY;
		for (let destination of this.Destinations) {
			let cost = await destination.ComputeCostFrom(origin, calc);
			let costWeight = cost * destination.Weight;
			if (cost < lowestCost)
				lowestCost = cost;
		}
		return lowestCost;
	}
}

export class TwoOfThem extends DestinationSet implements IDestinationSet {

	constructor(destinations: IDestination[], weight?: number) {
		super(destinations, weight);
	}
	async ComputeCostFrom(origin: Place, calc: ICostCalculator) {
		return await this.CacheThis(origin, orig => {
			return new Promise<number> ((resolve, reject) => {
				resolve(this.InternComputeCostFrom(origin, calc));
			});
		});
	}

	async InternComputeCostFrom(origin: Place, calc: ICostCalculator) {
		let lowestCost: number = Number.POSITIVE_INFINITY;
		let secondLowestCost: number = Number.POSITIVE_INFINITY;
		for (let destination of this.Destinations) {
			let cost = await destination.ComputeCostFrom(origin, calc);
			let costWeight = cost * destination.Weight;
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
