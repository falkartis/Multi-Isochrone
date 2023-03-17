import { GoogleMapsConnector } from './GoogleMapsConnector.js'

function initMap() {
	new Program();
}
window.initMap = initMap;

class Program {

	constructor() {

		let mapdiv = document.getElementById("map");
		if (mapdiv == null) {
			throw new Error('No div with id map found.');
		} else {
			let map = new google.maps.Map(mapdiv, {
				zoom: 2,
				center: { lat: 0, lng: 0 },
			});

			map.addListener("dblclick", (e) => { this.placeMarker(e.latLng, map); });

		}
	}

	placeMarker(latLng: google.maps.LatLng, map: google.maps.Map) {
		let marker = new google.maps.Marker({
			position: latLng,
			map: map,
			draggable: true,
			label: "1",
		});
		marker.addListener("click", () => {
			this.markerClick(marker);
		});
	}

	getMarkerLabel(marker: google.maps.Marker): string {
		const markerLabel = marker.getLabel() as google.maps.MarkerLabel | string;
		if (typeof markerLabel === "string") {
			return markerLabel;
		} else {
			return markerLabel?.text ?? "1";
		}
	}


	markerClick(marker: google.maps.Marker) {

		let div = document.createElement('div');
		let info = document.createElement('label');
		let input = document.createElement('input');
		let del = document.createElement('button');

		input.type = "number";
		input.value = this.getMarkerLabel(marker);
		input.onchange = (e) => {
			const target = e.target as HTMLInputElement;
			marker.setLabel(target.value);
		};

		info.innerHTML = "How often do you visit this place: <br>";
		info.appendChild(input);

		del.innerHTML = "delete";
		del.style.float = "right";
		del.addEventListener('click', function(){ marker.setMap(null); });

		div.appendChild(info);
		div.appendChild(del);

		const infowindow = new google.maps.InfoWindow({
			content: div,
		});
		infowindow.open(marker.getMap(), marker);
	}
}

