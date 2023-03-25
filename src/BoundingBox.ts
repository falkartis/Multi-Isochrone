import { Place } from './index.js';

export class BoundingBox {
	Min: Place;
	Max: Place;
	Globe: boolean;
	
	constructor(place: Place, max?: Place, globe?: boolean) {
		this.Min = new Place(place.Lat, place.Long);
		if (max == null) {
			this.Max = new Place(place.Lat, place.Long);
		} else {
			this.Max = new Place(max.Lat, max.Long);
		}
		this.Globe = globe ?? false;
		this.CheckGlobe();
	}

	get SW() {return new Place(this.Min.Lat, this.Min.Long); }
	get NW() {return new Place(this.Max.Lat, this.Min.Long); }
	get NE() {return new Place(this.Max.Lat, this.Max.Long); }
	get SE() {return new Place(this.Min.Lat, this.Max.Long); }
	
	get CW() {return new Place((this.Min.Lat + this.Max.Lat) / 2, this.Min.Long); }
	get NC() {return new Place(this.Max.Lat, (this.Min.Long + this.Max.Long) / 2); }
	get CE() {return new Place((this.Min.Lat + this.Max.Lat) / 2, this.Max.Long); }
	get SC() {return new Place(this.Min.Lat, (this.Min.Long + this.Max.Long) / 2); }

	get Center() {return new Place((this.Min.Lat + this.Max.Lat)/2,(this.Min.Long + this.Max.Long)/2); }

	get SizeLat() { return this.Max.Lat - this.Min.Lat; }
	get SizeLong() { return this.Max.Long - this.Min.Long; }

	CheckGlobe() {
		if (this.Globe) {
			this.Min.Lat = Math.max(this.Min.Lat, -90);
			this.Min.Long = Math.max(this.Min.Long, -180);
			this.Max.Lat = Math.min(this.Max.Lat, 90);
			this.Max.Long = Math.min(this.Max.Long, 180);
		}
	}
	Edges(rows: number, cols: number): Place[] {
		
		const latInterval = this.SizeLat / rows;
		const longInterval = this.SizeLong / cols;

		const result: Place[] = [];
		for (let i = 0; i <= rows; i++) {
			const lat = this.Min.Lat + i * latInterval;
			result.push(new Place(lat, this.Min.Long));
			result.push(new Place(lat, this.Max.Long));
		}
		// Second loop has two less iterations to avoid repeating corners.
		for (let i = 1; i < cols; i++) {
			const long = this.Min.Long + i * longInterval;
			result.push(new Place(this.Min.Lat, long));
			result.push(new Place(this.Max.Lat, long));
		}
		return result;
	}

	BoxGrid(rows: number, cols: number): BoundingBox[] {
		const grid: BoundingBox[] = [];
		const dLat = this.SizeLat / rows;
		const dLong = this.SizeLong / cols;

		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				const lat1 = this.Min.Lat + dLat * i;
				const lat2 = this.Min.Lat + dLat * (i + 1);
				const long1 = this.Min.Long + dLong * j;
				const long2 = this.Min.Long + dLong * (j + 1);

				grid.push(new BoundingBox(new Place(lat1, long1), new Place(lat2, long2), this.Globe));
			}
		}

		return grid;
	}

	Expand(place: Place) {
		if (place.Lat < this.Min.Lat) { this.Min.Lat = place.Lat; }
		if (place.Lat > this.Max.Lat) { this.Max.Lat = place.Lat; }
		if (place.Long < this.Min.Long) { this.Min.Long = place.Long; }
		if (place.Long > this.Max.Long) { this.Max.Long = place.Long; }
		this.CheckGlobe();
	}
	ExpandBy(percent: number) {
		let perOne: number = percent / 100;
		let dLat: number = this.Max.Lat - this.Min.Lat;
		let dLong: number = this.Max.Long - this.Min.Long;
		let latInc: number = dLat * perOne;
		let longInc: number = dLong * perOne;
		this.Min.Lat = this.Min.Lat - (latInc / 2);
		this.Max.Lat = this.Max.Lat + (latInc / 2);
		this.Min.Long = this.Min.Long - (longInc / 2);
		this.Max.Long = this.Max.Long + (longInc / 2);
		this.CheckGlobe();
	}
	ExpandByDeg(deg: number) {
		this.Min.Lat -= deg;
		this.Max.Lat += deg;
		this.Min.Long -= deg;
		this.Max.Long += deg;
		this.CheckGlobe();
	}
	ExpandLatBy(percent: number) {
		let perOne: number = percent / 100;
		let dLat: number = this.Max.Lat - this.Min.Lat;
		let latInc: number = dLat * perOne;
		this.Min.Lat = this.Min.Lat - (latInc / 2);
		this.Max.Lat = this.Max.Lat + (latInc / 2);
		this.CheckGlobe();
	}
	ExpandLongBy(percent: number) {
		let perOne: number = percent / 100;
		let dLong: number = this.Max.Long - this.Min.Long;
		let longInc: number = dLong * perOne;
		this.Min.Long = this.Min.Long - (longInc / 2);
		this.Max.Long = this.Max.Long + (longInc / 2);
		this.CheckGlobe();
	}
}
