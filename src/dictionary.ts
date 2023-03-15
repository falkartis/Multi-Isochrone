export interface HashCode<T> {
	GetHashCode(): number;
	Equals<T>(other: T): boolean;
}

//TODO: Implement tuples for all those keys who have same hashcode but aren't actually equal

export class Dictionary<TKey extends HashCode, TValue> {
	//Data: Map<TKey, TValue[]>; // WRONG

	constructor() {
		//this.Data = new Map<TKey, TValue[]>(); // WRONG!
	}
	Add(key: TKey, value: TValue) {
		//TODO:
	}
	Get(key: TKey): TValue {
		//TODO:
	}
	Clear() {
		//TODO:
	}
	ContainsKey(key: TKey): boolean {
		//TODO:
	}
	ContainsValue(value: TValue): boolean {
		//TODO:
	}
	Remove(key: TKey): boolean {
		//TODO:
	}
}