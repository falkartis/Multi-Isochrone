let map: google.maps.Map;

function initMap(): void {

	const myLatLng = { lat: -25.363, lng: 131.044 };
	map = new google.maps.Map(
		document.getElementById("map") as HTMLElement,
		{
			zoom: 4,
			center: myLatLng,
		}
	);

	new google.maps.Marker({
		position: myLatLng,
		map,
		title: "Hello World!",
	});
}

declare global {
	interface Window {
		initMap: () => void;
	}
}
window.initMap = initMap;


const form: HTMLFormElement = document.getElementById("markerForm");

form.onsubmit = () => {
	const formData = new FormData(form);

	console.log(formData);


	return false; // prevent reload
};


class Location {
	Lat: number;
	Long: number;
}