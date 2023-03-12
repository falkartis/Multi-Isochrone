import { DegToRad, Place } from './index.js';

export interface CostCalculator {
	GetCost(p1: Place, p2: Place): number;
}

class TaxicabDistance implements CostCalculator {
	// TODO: Implement rotation, try to do as much as possible in the constructor.
	GetCost(p1: Place, p2: Place) {
		var dLat: number = Math.abs(p1.Lat - p2.Lat);
		var dLong: number = Math.abs(p1.Long - p2.Long);
		return dLat + dLong;	
	}
}

export class EuclideanDistance implements CostCalculator {
	GetCost(p1: Place, p2: Place) {
		var dLat: number = p1.Lat - p2.Lat;
		var dLong: number = p1.Long - p2.Long;
		return Math.sqrt((dLat * dLat) + (dLong * dLong));	
	}
}

class LatCorrectedEuclideanDistance implements CostCalculator {
	LatScale: number;
	LongScale: number;
	constructor(lat: number, planetRadius?: number) {
		if (planetRadius == null) {
			planetRadius = 6371;
		}
		this.LatScale = planetRadius * DegToRad(1);
		this.LongScale = planetRadius * DegToRad(1) * Math.cos(DegToRad(lat));
	}
	GetCost(p1: Place, p2: Place) {
		var dLat: number = this.LatScale * (p1.Lat - p2.Lat);
		var dLong: number = this.LongScale * (p1.Long - p2.Long);
		return Math.sqrt((dLat * dLat) + (dLong * dLong));	
	}
}

export class HaversineDistance implements CostCalculator {
	PlanetRadius: number;
	constructor(planetRadius?: number) {
		if (planetRadius == null) {
			this.PlanetRadius = 6371;
		} else {
			this.PlanetRadius = planetRadius;
		}
	}
	/*
	 *	https://stackoverflow.com/questions/365826/calculate-distance-between-2-gps-coordinates
	 *	http://www.movable-type.co.uk/scripts/latlong.html
	*/


	GetCost(p1: Place, p2: Place) {

		var dLat = DegToRad(p2.Lat - p1.Lat);
		var dLon = DegToRad(p2.Long - p1.Long);

		var lat1 = DegToRad(p1.Lat);
		var lat2 = DegToRad(p2.Lat);

		var sdLat = Math.sin(dLat / 2);
		var sdLon = Math.sin(dLon / 2);

		var a = sdLat * sdLat + sdLon * sdLon * Math.cos(lat1) * Math.cos(lat2); 
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
		return this.PlanetRadius * c;
	}
}

