import { IHashCode, Dictionary } from './Dictionary.js';
import { ICostCalculator } from './CostCalculator.js';
import { Place } from './index.js';

export interface ICostMatrixProvider {
	CreateCostMatrix(origins: Place[], destinations: Place[]): Promise<CostMatrix>;
	FillMissing(origins: Place[], destinations: Place[], costMatrix: CostMatrix): Promise<void>;
}

export class CostMatrix {
	private readonly data: Dictionary<Place, Dictionary<Place, number>>;

	constructor() {
		this.data = new Dictionary<Place, Dictionary<Place, number>>();
	}

	Set(origin: Place, destination: Place, cost: number): void {
		if (!this.data.ContainsKey(origin)) {
			this.data.Add(origin, new Dictionary<Place, number>());
		}
		const innerDict = this.data.Get(origin)!;
		innerDict.Set(destination, cost);
	}

	Get(origin: Place, destination: Place, invertDirection: boolean = false): number|undefined {
		const cost = this.data.Get(origin)?.Get(destination);
		if (cost === undefined && invertDirection) {
			return this.Get(destination, origin, false);
		}
		return cost;
	}

	Add(other: CostMatrix): void {
		other.ForEach((origin, destination, cost) => {
			this.Set(origin, destination, cost);
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

	private readonly CostCalculator: ICostCalculator;

	constructor(costCalculator: ICostCalculator) {
		this.CostCalculator = costCalculator;
	}

	CreateCostMatrix(origins: Place[], destinations: Place[]): Promise<CostMatrix> {

		return new Promise<CostMatrix>((resolve, reject)=>{

			const costMatrix = new CostMatrix();

			for (const origin of origins) {

				for (const destination of destinations) {
					const cost = this.CostCalculator.GetCost(origin, destination);
					costMatrix.Set(origin, destination, cost);
				}
			}
			resolve(costMatrix);
		});
	}

	FillMissing(origins: Place[], destinations: Place[], costMatrix: CostMatrix): Promise<void> {

		return new Promise<void>((resolve, reject)=>{
			for (const origin of origins) {
				for (const destination of destinations) {
					if (!costMatrix.Get(origin, destination)) {
						const cost = this.CostCalculator.GetCost(origin, destination);
						costMatrix.Set(origin, destination, cost);
					}
				}
			}
			resolve();
		});
	}
}
