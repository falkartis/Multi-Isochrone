export interface IHashCode {
	GetHashCode(): number;
	Equals(other: this): boolean;
}

export class Dictionary<TKey extends IHashCode, TValue> {
	
	Data: Map<number, [TKey, TValue][]>;

	constructor() {
		this.Data = new Map<number, [TKey, TValue][]>();
	}
	
	Add(key: TKey, value: TValue) {

		if (this.ContainsKey(key)) {
			throw new Error("Dictionary already contains key!", { key, value });
		}
		
		let hc: number = key.GetHashCode();
		let tuple: [TKey, TValue] = [key, value];
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
		throw new Error("Not Implemented!");
		//TODO:
	}
	Get(key: TKey): TValue|undefined {
		let hc: number = key.GetHashCode();
		let list = this.Data.get(hc) ?? [];
		let val: TValue|undefined = undefined;
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
		let hc: number = key.GetHashCode();
		let list = this.Data.get(hc) ?? [];
		let val: boolean = false;
		list.forEach(tuple => {
			if (key.Equals(tuple[0])) {
				val = true;
			}
		});
		return val;
	}
}