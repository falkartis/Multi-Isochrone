import { IHashCode } from './index.js';

export class Dictionary<TKey extends IHashCode, TValue> {
	
	Data: Map<number, [TKey, TValue][]>;

	constructor() {
		this.Data = new Map<number, [TKey, TValue][]>();
	}
	
	Add(key: TKey, value: TValue) {

		if (this.ContainsKey(key)) {
			throw new Error("Dictionary already contains key!");
		}
		
		const hc: number = key.GetHashCode();
		const tuple: [TKey, TValue] = [key, value];
		let list = this.Data.get(hc);

		if (list == undefined) {
			list = [];
			list.push(tuple)
			this.Data.set(hc, list);
		} else {
			list.push(tuple);
			//console.log({HashcodeCollision: list});
		}
	}

	Set(key: TKey, newval: TValue) {
		const hc: number = key.GetHashCode();
		const list = this.Data.get(hc) ?? [];
		for (let tuple of list) {
			if (key.Equals(tuple[0])) {
				tuple[1] = newval;
				return;
			}
		}
		this.Add(key, newval);
	}

	Clear() {
		this.Data = new Map<number, [TKey, TValue][]>();
	}

	Get(key: TKey): TValue|undefined {
		let hc: number = key.GetHashCode();
		if (!this.Data.has(hc)) {
			return undefined;
		}
		for (let tuple of this.Data.get(hc)!) {
			if (key.Equals(tuple[0])) {
				return tuple[1];
			}
		}
		return undefined;
	}

	ContainsKey(key: TKey): boolean {
		return this.Get(key) !== undefined;
	}

	ForEach(callbackfn: (key: TKey, value: TValue) => void) {
		for (let tuples of this.Data.values()) {
			for (let tuple of tuples) {
				callbackfn(tuple[0], tuple[1]);
			}
		}
	}

}
