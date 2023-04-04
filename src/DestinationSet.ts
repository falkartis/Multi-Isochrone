import { ICostCalculator } from './CostCalculator.js';
import { Dictionary } from './Dictionary.js';
import { CostMatrix } from './CostMatrix.js';
import { Place } from './index.js';


export interface IDestination {
	GetCosts(origins: Place[], costMatrix: CostMatrix): number[];
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

	GetCentroid(): Place {
		return new Place(this.Lat, this.Long);
	}

	GetPlaces(): Place[] {
		return [new Place(this.Lat, this.Long)];
	}

	GetCosts(origins: Place[], costMatrix: CostMatrix): number[] {
		const costs: number[] = [];
		for (const origin of origins) {
			const cost = costMatrix.Get(origin, this);
			if (cost === undefined)
				throw new Error("WeightedPlace.GetCosts: CostMatrix lacks entries, it should be filled.");
			costs.push(cost * this.Weight);
		}
		return costs;
	}
}

abstract class DestinationSet implements IDestinationSet {
	readonly Destinations: IDestination[];
	readonly Weight: number;
	readonly Name: string;

	constructor(destinations: IDestination[], weight?: number, name?: string) {
		this.Destinations = destinations;
		this.Weight = weight ?? 1;
		this.Name = name ?? "";
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

export class TravellingSalesmanBest implements IDestinationSet {

	readonly Destinations: IDestination[];
	readonly Weight: number;
	readonly Name: string;
	readonly Costs: CostMatrix;

	private CheapestPath: Place[] = [];
	private CheapestCost: number = Number.POSITIVE_INFINITY;

	constructor(destinations: IDestination[], costs: CostMatrix, weight?: number, name?: string) {
		this.Destinations = destinations;
		this.Costs = costs;
		this.Weight = weight ?? 1;
		this.Name = name ?? "";
	}
	AddDestination(dest: IDestination) {
		this.Destinations.push(dest);
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
	GetPlaces(): Place[] {
		let places: Place[] = [];

		for (let dest of this.Destinations) {
			let children = dest.GetPlaces();
			places.push(...children);
		}

		return places;
	}

	GetPathCost(destinations: Place[], costMatrix: CostMatrix): number {
		let totalCost = 0;

		// Starting with 1 instead of 0 because we substract 1 from i to get the from place.
		for (let i = 1; i < destinations.length; i++) {

			let from = destinations[i-1];
			let to = destinations[i];
			// third parameter is invertDirection, set to true to swap from and to if necessary.
			let cost = costMatrix.Get(from, to, true) as number;
			totalCost += cost;
		}
		return totalCost;
	}

	SearchBest(destinations: Place[], currentPath: Place[], costMatrix: CostMatrix) {

		let branchesHere = 0;
		for (let dest of destinations) {

			if (currentPath.indexOf(dest) === -1) {

				branchesHere++;

				let newPath = currentPath.concat([dest]);
				this.SearchBest(destinations, newPath, costMatrix);
			}
		}

		if (branchesHere === 0) {
			// We are at one of the many tips of the tree!

			let cost = this.GetPathCost(currentPath, costMatrix);

			if (cost < this.CheapestCost) {
				this.CheapestCost = cost;
				this.CheapestPath = currentPath;
			}
		}
	}

	GetCost(origin: Place, costMatrix: CostMatrix): number {

		this.CheapestCost = Number.POSITIVE_INFINITY;

		let places = this.GetPlaces();

		this.SearchBest(places, [origin], costMatrix);

		return this.CheapestCost;
	}

	GetCosts(origins: Place[], costMatrix: CostMatrix): number[] {

		let newCostMat = new CostMatrix();

		newCostMat.Add(this.Costs);
		newCostMat.Add(costMatrix);

		let costs: number[] = [];
		for (let origin of origins) {
			let cost = this.GetCost(origin, newCostMat);
			costs.push(cost);
		}
		return costs;
	}

}
