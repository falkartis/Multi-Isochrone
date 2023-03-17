import { GoogleMapsConnector } from './GoogleMapsConnector.js'

function initMap() {
	let mapdiv = document.getElementById("map");
	if (mapdiv == null) {
		throw new Error('No div with id map found.');
	} else {
		let map = new google.maps.Map(mapdiv, {
			zoom: 2,
			center: { lat: 0, lng: 0 },
		});

		map.addListener("dblclick", (e) => { placeMarker(e.latLng, map); });

	}
}

function placeMarker(latLng: google.maps.LatLng, map: google.maps.Map) {
	let marker = new google.maps.Marker({
		position: latLng,
		map: map,
		draggable: true,
	});
	marker.addListener("click", () => {
		markerClick(marker);
	});
}

function markerClick(marker: google.maps.Marker) {

	// Create the info window

	let div = document.createElement('div');

	div.appendChild(document.createElement('hr'));

	let b = document.createElement('button');
	b.innerHTML = "delete";

	b.addEventListener('click', function(){ marker.setMap(null); });
	div.appendChild(b);


	const infowindow = new google.maps.InfoWindow({
		content: div,
	});
	infowindow.open(marker.getMap(), marker);
	//marker.setMap(null);
}
window.initMap = initMap;