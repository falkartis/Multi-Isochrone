import { Place } from './index.js';

export function DegToRad(degrees: number) {
	return degrees * (Math.PI / 180);
}

export interface ICostCalculator {
	GetCost(p1: Place, p2: Place): number;
	get Units(): string;
}

export class TaxicabDist implements ICostCalculator {
	// TODO: Implement rotation, try to do as much as possible in the constructor.
	// TODO: Get the right units.
	get Units(): string { return ""; }
	GetCost(p1: Place, p2: Place) {
		let dLat: number = Math.abs(p1.Lat - p2.Lat);
		let dLong: number = Math.abs(p1.Long - p2.Long);
		return dLat + dLong;	
	}
}

export class EightDirections implements ICostCalculator {
	DiagonalCost: number;
	constructor(diagonalCost?: number)	{
		this.DiagonalCost = diagonalCost ?? Math.sqrt(2);
	}
	// TODO: Get the right units, maybe from constructor.
	get Units(): string { return ""; }
	GetCost(p1: Place, p2: Place) {
		let dLat: number = Math.abs(p1.Lat - p2.Lat);
		let dLong: number = Math.abs(p1.Long - p2.Long);
		let min = Math.min(dLat, dLong);
		let max = Math.max(dLat, dLong);
		return min * this.DiagonalCost + (max - min);
	}
}

export class EuclideanDist implements ICostCalculator {
	// TODO: Get the right units, maybe from constructor.
	get Units(): string { return ""; }
	GetCost(p1: Place, p2: Place) {
		let dLat: number = p1.Lat - p2.Lat;
		let dLong: number = p1.Long - p2.Long;
		return Math.sqrt((dLat * dLat) + (dLong * dLong));	
	}
}

export class LatCorrectedEuclidean implements ICostCalculator {
	LatScale: number;
	LongScale: number;
	constructor(lat: number, planetRadius?: number) {
		if (planetRadius == null) {
			planetRadius = 6371; // Earth's radius
		}
		this.LatScale = planetRadius * DegToRad(1);
		this.LongScale = planetRadius * DegToRad(1) * Math.cos(DegToRad(lat));
	}
	get Units(): string { return "Km"; }
	GetCost(p1: Place, p2: Place) {
		let dLat: number = this.LatScale * (p1.Lat - p2.Lat);
		let dLong: number = this.LongScale * (p1.Long - p2.Long);
		return Math.sqrt((dLat * dLat) + (dLong * dLong));	
	}
}

export class HaversineDist implements ICostCalculator {
	PlanetRadius: number;
	constructor(planetRadius?: number) {
		if (planetRadius == null) {
			this.PlanetRadius = 6371;
		} else {
			this.PlanetRadius = planetRadius;
		}
	}
	get Units(): string { return "Km"; }
	/*
	 *	https://stackoverflow.com/questions/365826/calculate-distance-between-2-gps-coordinates
	 *	http://www.movable-type.co.uk/scripts/latlong.html
	*/
	GetCost(p1: Place, p2: Place) {

		let dLat = DegToRad(p2.Lat - p1.Lat);
		let dLon = DegToRad(p2.Long - p1.Long);

		let lat1 = DegToRad(p1.Lat);
		let lat2 = DegToRad(p2.Lat);

		let sdLat = Math.sin(dLat / 2);
		let sdLon = Math.sin(dLon / 2);

		let a = sdLat * sdLat + sdLon * sdLon * Math.cos(lat1) * Math.cos(lat2); 
		let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
		return this.PlanetRadius * c;
	}
}

