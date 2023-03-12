import { Destination, BoundingBox, Place } from './index.js';
import { MapConnector } from './MapConnector.js';

export class GoogleMapsConnector implements MapConnector {

	Map: google.maps.Map;
	LatLngList: google.maps.LatLng[] = [];

	constructor(map: google.maps.Map) {
		this.Map = map
	}

	AddMarker(dest: Destination) {

		var newlatLng: google.maps.LatLng = new google.maps.LatLng(dest.Place.Lat, dest.Place.Long);

		new google.maps.Marker({
			position: newlatLng,
			label: "" + dest.Wheight + "",
			map: this.Map,
		});

		this.LatLngList.push(newlatLng);

		var latlngbounds: google.maps.LatLngBounds = new google.maps.LatLngBounds();

		for(var latLng of this.LatLngList)
			latlngbounds.extend(latLng);

		this.Map.setCenter(latlngbounds.getCenter());
		this.Map.fitBounds(latlngbounds); 
	}

	AddLine(p1: Place, p2: Place) {
		const lineCoords = [{ lat: p1.Lat, lng: p1.Long }, { lat: p2.Lat, lng: p2.Long } ];
		const line = new google.maps.Polyline({
			path: lineCoords,
			// geodesic: does it go faster when set to false?
			// geodesic: does it look more precise when set to true?
			geodesic: false,
			strokeColor: "#211",
			strokeOpacity: 0.6,
			strokeWeight: 1,
		});

		line.setMap(this.Map);
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

}
