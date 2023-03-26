import { IHashCode } from './Dictionary.js';
export { IDestination } from 'DestinationSet.js';

export function Lerp(v1: number, v2: number, t: number): number {
	return v1 * (1 - t) + v2 * t;
}

export class Place implements IHashCode {
	Lat: number;
	Long: number;
	constructor(lat: number, long: number) {
		if (isNaN(lat) || isNaN(long)) {
			throw new Error('Invalid latitude or longitude');
		}
		this.Lat = lat;
		this.Long = long;
	}
	Scale(t: number) {
		return new Place(this.Lat * t, this.Long * t);
	}
	Add(o: Place) {
		return new Place(this.Lat + o.Lat, this.Long + o.Long);
	}
	Lerp(t: number, o: Place) {
		return this.Scale(1 - t).Add(o.Scale(t));
	}
	GetHashCode() {
		let la = 90 / this.Lat;
		let lo = 180 / this.Long;
		return la * 7919 + lo;
	}
	Equals(other: Place) {
		return this.Lat == other.Lat && this.Long == other.Long;
	}
}
