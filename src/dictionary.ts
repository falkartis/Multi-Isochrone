export interface HashCode {
	GetHashCode(): number;
	Equals(other: this): boolean;
}

export class Dictionary<TKey extends HashCode, TValue> {
	
	Data: Map<number, [TKey, TValue][]>;

	constructor() {
		this.Data = new Map<number, [TKey, TValue][]>();
	}
	
	Add(key: TKey, value: TValue) {

		if (this.ContainsKey(key)) {
			console.log(key);
			throw new Error("Dictionary already contains key!");
		}
		
		var hc: number = key.GetHashCode();
		var tuple: [TKey, TValue] = [key, value];
		var list = this.Data.get(hc);

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
		throw new Error("Not Implemented!");
		//TODO:
	}
	Get(key: TKey): TValue|undefined {
		var hc: number = key.GetHashCode();
		var list = this.Data.get(hc) ?? [];
		var val: TValue|undefined = undefined;
		list.forEach(tuple => {
			if (key.Equals(tuple[0])) {
				val = tuple[1];
			}
		});
		return val;
	}
	Clear() {
		this.Data = new Map<number, [TKey, TValue][]>();
	}
	ContainsKey(key: TKey): boolean {
		var hc: number = key.GetHashCode();
		var list = this.Data.get(hc) ?? [];
		var val: boolean = false;
		list.forEach(tuple => {
			if (key.Equals(tuple[0])) {
				val = true;
			}
		});
		return val;
	}
}