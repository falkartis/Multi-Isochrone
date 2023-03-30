import { ICostCalculator } from './CostCalculator';
import { IHashCode, Place } from './index';
import { Dictionary } from './Dictionary';

export interface ICostMatrixProvider {
	CreateCostMatrix(origins: Place[], destinations: Place[]): Promise<CostMatrix>;
	FillMissing(origins: Place[], destinations: Place[], costMatrix: CostMatrix): Promise<void>;
}

export class CostMatrix {
	private readonly data: Dictionary<Place, Dictionary<Place, number>>;

	constructor() {
		this.data = new Dictionary<Place, Dictionary<Place, number>>();
	}

	set(origin: Place, destination: Place, cost: number): void {
		if (!this.data.ContainsKey(origin)) {
			this.data.Add(origin, new Dictionary<Place, number>());
		}
		const innerDict = this.data.Get(origin)!;
		innerDict.Set(destination, cost);
	}

	get(origin: Place, destination: Place): number|undefined {
		const cost = this.data.Get(origin)?.Get(destination);
		return cost;
	}

	Add(other: CostMatrix): void {
		other.ForEach((origin, destination, cost) => {
			this.set(origin, destination, cost);
		});
	}

	ForEach(callback: (origin: Place, destination: Place, cost: number) => void): void {
		this.data.ForEach((origin, innerDict) => {
			innerDict.ForEach((destination, cost) => {
				callback(origin, destination, cost);
			});
		});
	}
}

export class DefaultCostMatrixProvider implements ICostMatrixProvider {
	constructor(private readonly costCalculator: ICostCalculator) {}

	CreateCostMatrix(origins: Place[], destinations: Place[]): Promise<CostMatrix> {

		const promises: Promise<void>[] = [];
		const costMatrix = new CostMatrix();

		for (const origin of origins) {

			for (const destination of destinations) {
				const promise = this.costCalculator.GetCost(origin, destination)
					.then(cost => {
						costMatrix.set(origin, destination, cost);
					});
				promises.push(promise);
			}
		}
		return Promise.all(promises).then(() => costMatrix);
	}

	FillMissing(origins: Place[], destinations: Place[], costMatrix: CostMatrix): Promise<void> {
		const promises: Promise<void>[] = [];

		// Iterate over all combinations of origins and destinations
		for (const origin of origins) {
			for (const destination of destinations) {
				// Check if there is already a cost for this combination
				if (!costMatrix.get(origin, destination)) {
					// If there isn't, calculate the cost and set it in the costMatrix
					const promise = this.costCalculator.GetCost(origin, destination)
						.then(cost => {
							costMatrix.set(origin, destination, cost);
						});
					promises.push(promise);
				}
			}
		}

		return Promise.all(promises).then(() => {});
	}


}
