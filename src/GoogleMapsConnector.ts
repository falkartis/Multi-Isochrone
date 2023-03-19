import { BoundingBox, Place, WeightedPlace } from './index.js';
import { IMapConnector } from './MapConnector.js';


export class GoogleMapsConnector implements IMapConnector {

	Map: google.maps.Map;
	LatLngList: google.maps.LatLng[] = [];
	PolylineList: Map<number, google.maps.Polyline[]> = new Map<number, google.maps.Polyline[]>();
	AddedLabels: Map<number, google.maps.Marker> = new Map<number, google.maps.Marker>();
	Rectangles: google.maps.Rectangle[] = [];

	constructor(map: google.maps.Map) {
		this.Map = map
	}

	AddMarker(dest: WeightedPlace) {

		let newlatLng: google.maps.LatLng = new google.maps.LatLng(dest.Lat, dest.Long);

		new google.maps.Marker({
			position: newlatLng,
			label: { text: "" + dest.Weight + "" },
			map: this.Map
		});

		this.LatLngList.push(newlatLng);

		let latlngbounds: google.maps.LatLngBounds = new google.maps.LatLngBounds();

		for(let latLng of this.LatLngList)
			latlngbounds.extend(latLng);

		this.Map.setCenter(latlngbounds.getCenter());
		this.Map.fitBounds(latlngbounds); 
	}

	AddLabel(p: Place, cost: number) {

		let newlatLng: google.maps.LatLng = new google.maps.LatLng(p.Lat, p.Long);

		let mark = new google.maps.Marker({
			position: newlatLng,
			label: { text: cost.toFixed(2) },
			map: this.Map,
			// Shortest possible transparent pixel:
			icon: { url: "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" }
		});
		this.AddedLabels.set(cost, mark);
	}

	AddLine(p1: Place, p2: Place, cost: number) {
		//TODO: Refactor this method.
		const lineCoords: google.maps.LatLng[] = [
			new google.maps.LatLng(p1.Lat, p1.Long),
			new google.maps.LatLng(p2.Lat, p2.Long)
		];
		const line = new google.maps.Polyline({
			path: lineCoords,
			// geodesic: does it go faster when set to false?
			// geodesic: does it look more precise when set to true?
			geodesic: false,
			strokeColor: "#411",
			strokeOpacity: 0.6,
			strokeWeight: 2,
			draggable: true,
		});
		let toAdd = true;
		if (this.PolylineList.has(cost)) {

			let PlList = this.PolylineList.get(cost) ?? []; // ?? [] is syntax shugar
			
			for(let pl of PlList){
				let path = pl.getPath();
				let arr = path.getArray();
				if (arr[0].equals(lineCoords[0])){				path.insertAt(0, lineCoords[1]);			toAdd = false; break; }
				if (arr[0].equals(lineCoords[1])){				path.insertAt(0, lineCoords[0]);			toAdd = false; break; }
				if (arr[arr.length - 1].equals(lineCoords[0])){	path.insertAt(arr.length, lineCoords[1]);	toAdd = false; break; }
				if (arr[arr.length - 1].equals(lineCoords[1])){	path.insertAt(arr.length, lineCoords[0]);	toAdd = false; break; }
			}

			if (toAdd) {
				PlList.push(line);
			}

		} else {
			let list: google.maps.Polyline[] = [];
			list.push(line);
			this.PolylineList.set(cost, list);
			if (!this.AddedLabels.has(cost)) {
				this.AddLabel(p1, cost);
			}
		}
		if (toAdd) {
			line.setMap(this.Map);
		}
	}

	ClearLines() {
		this.PolylineList.forEach((li, cost) => li.forEach(pl => pl.setMap(null)));
		this.PolylineList = new Map<number, google.maps.Polyline[]>();

		this.AddedLabels.forEach( l => l.setMap(null));
		this.AddedLabels = new Map<number, google.maps.Marker>();

		this.Rectangles.forEach( r => r.setMap(null));
		this.Rectangles = [];
	}

	DrawRectangle(box: BoundingBox, color: string) {
		let north: number = box.Max.Lat;
		let south: number = box.Min.Lat;
		let east: number = box.Max.Long;
		let west: number = box.Min.Long;

		const rectangle = new google.maps.Rectangle({
			strokeColor: color,
			strokeOpacity: 0.3,
			strokeWeight: 1,
			fillColor: color,
			fillOpacity: 0.25,
			map: this.Map,
			bounds: {north, south, east, west},
		});
		this.Rectangles.push(rectangle);
	}

	DrawRedRectangle(box: BoundingBox, cost: number) {
		this.DrawRectangle(box, "#F00");
	}
	DrawDarkRectangle(box: BoundingBox) {
		this.DrawRectangle(box, "#211");
	}
	GetBoundingBox() {
		let box: google.maps.LatLngBounds|undefined = this.Map.getBounds();
		if (box === undefined) {
			console.log("Map.getBounds() returned undefined, can't build BoundingBox, returning 0,0.");
			return new BoundingBox(new Place(0, 0))
		}
		let min = new Place(box.getSouthWest().lat(), box.getSouthWest().lng());
		let max = new Place(box.getNorthEast().lat(), box.getNorthEast().lng());
		let bb = new BoundingBox(min);
		// Using expand method instead of the constructor with min anb max becaus google may mess up in some cases.
		bb.Expand(max);
		return bb;
	}
}
