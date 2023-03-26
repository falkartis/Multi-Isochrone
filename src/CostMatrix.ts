import { IHashCode, Dictionary } from './Dictionary.js';
import { ICostCalculator } from './CostCalculator.js';
import { Place } from './index.js';

interface ICostMatrixProvider {
	createCostMatrix(origins: Place[], destinations: Place[]): Promise<CostMatrix>;
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

	get(origin: Place, destination: Place): number {
		const innerDict = this.data.Get(origin)?.Get(destination);
		if (innerDict === undefined) {
			throw new Error(`CostMatrix does not contain cost for origin ${origin} and destination ${destination}`);
		}
		return innerDict;
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

	createCostMatrix(origins: Place[], destinations: Place[]): Promise<CostMatrix> {

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
}




