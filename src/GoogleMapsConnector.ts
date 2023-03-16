import { Destination, BoundingBox, Place } from './index.js';
import { MapConnector } from './MapConnector.js';

export class GoogleMapsConnector implements MapConnector {

	Map: google.maps.Map;
	LatLngList: google.maps.LatLng[] = [];
	PolylineList: Map<number, google.maps.Polyline[]> = new Map<number, google.maps.Polyline[]>();
	AddedLabels: Map<number, google.maps.Marker> = new Map<number, google.maps.Marker>();

	constructor(map: google.maps.Map) {
		this.Map = map
	}

	AddMarker(dest: Destination) {

		var newlatLng: google.maps.LatLng = new google.maps.LatLng(dest.Place.Lat, dest.Place.Long);

		new google.maps.Marker({
			position: newlatLng,
			label: { text: "" + dest.Wheight + "" },
			map: this.Map
		});

		this.LatLngList.push(newlatLng);

		var latlngbounds: google.maps.LatLngBounds = new google.maps.LatLngBounds();

		for(var latLng of this.LatLngList)
			latlngbounds.extend(latLng);

		this.Map.setCenter(latlngbounds.getCenter());
		this.Map.fitBounds(latlngbounds); 
	}

	AddLabel(p: Place, cost: number) {

		var newlatLng: google.maps.LatLng = new google.maps.LatLng(p.Lat, p.Long);

		var mark = new google.maps.Marker({
			position: newlatLng,
			label: { text: cost.toFixed(2) },
			map: this.Map,
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
			//draggable: true,
		});
		var toAdd = true;
		if (this.PolylineList.has(cost)) {

			var PlList = this.PolylineList.get(cost) ?? []; // ?? [] is syntax shugar
			
			for(let pl of PlList){
				var path = pl.getPath();
				var arr = path.getArray();
				if (arr[0].equals(lineCoords[0])){				path.insertAt(0, lineCoords[1]);			toAdd = false; break; }
				if (arr[0].equals(lineCoords[1])){				path.insertAt(0, lineCoords[0]);			toAdd = false; break; }
				if (arr[arr.length - 1].equals(lineCoords[0])){	path.insertAt(arr.length, lineCoords[1]);	toAdd = false; break; }
				if (arr[arr.length - 1].equals(lineCoords[1])){	path.insertAt(arr.length, lineCoords[0]);	toAdd = false; break; }
			}

			if (toAdd) {
				PlList.push(line);
			}

		} else {
			var list: google.maps.Polyline[] = [];
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
	}

	DrawRectangle(box: BoundingBox, color: string) {
		var north: number = box.Max.Lat;
		var south: number = box.Min.Lat;
		var east: number = box.Max.Long;
		var west: number = box.Min.Long;

		const rectangle = new google.maps.Rectangle({
			strokeColor: color,
			strokeOpacity: 0.35,
			strokeWeight: 1,
			fillColor: color,
			fillOpacity: 0.3,
			map: this.Map,
			bounds: {north, south, east, west},
		});		
	}

	DrawRedRectangle(box: BoundingBox, cost: number) {
		this.DrawRectangle(box, "#F00");
	}
	DrawDarkRectangle(box: BoundingBox) {
		this.DrawRectangle(box, "#211");
	}
	GetBoundingBox() {
		var box: google.maps.LatLngBounds|undefined = this.Map.getBounds();
		if (box === undefined) {
			console.log("Map.getBounds() returned undefined, can't build BoundingBox, returning 0,0.");
			return new BoundingBox(new Place(0, 0))
		}
		var min = new Place(box.getSouthWest().lat(), box.getSouthWest().lng());
		var max = new Place(box.getNorthEast().lat(), box.getNorthEast().lng());
		var bb = new BoundingBox(min);
		// Using expand method instead of the constructor with min anb max becaus google may mess up in some cases.
		bb.Expand(max);
		return bb;
	}
}
