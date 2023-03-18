import { DestinationSet, AllDestinations, AnyDestination } from './DestinationSet.js'
import { CostCalculator, HaversineDistance } from './CostCalculator.js';
import { BoundingBox, Explorer, Place, Destination } from './index.js';
import { GoogleMapsConnector } from './GoogleMapsConnector.js'
import { LnDiscretizer } from './Discretizer.js'

function initMap() {
	new Program();
}
window.initMap = initMap;

class Program {

	RedrawTimer: ReturnType<typeof setTimeout>;
	MapConnector: GoogleMapsConnector;
	Markers: google.maps.Marker[];
	DiscretizerStep: number;
	DiscretizerOffset: number;

	constructor() {

		let mapdiv = document.getElementById("map");
		if (mapdiv == null) {
			throw new Error('No div with id map found.');
		}

		let map = new google.maps.Map(mapdiv, {
			zoom: 2,
			center: { lat: 0, lng: 0 },
		});

		map.addListener("dblclick", 	(e) => { this.placeMarker(e.latLng, map); });
		map.addListener("zoom_changed",	() => { this.Redraw(); });
		map.addListener("dragend",		() => { this.Redraw();	});

		this.RedrawTimer = setTimeout(()=>{ console.log("RedrawTimer"); }, 1);
		this.MapConnector = new GoogleMapsConnector(map);
		this.DiscretizerOffset = 0;
		this.DiscretizerStep = 0.5;
		this.Markers = [];

		this.TopBarIcons();
	}

	TopBarIcons() {
		let topBar = document.getElementById("topBar");
		if (topBar == null) {
			throw new Error('No div with id topBar found.');
		}

		let discStepInput = document.createElement('input');
		discStepInput.type = "number";
		discStepInput.value = "" + this.DiscretizerStep;
		discStepInput.step = "0.01";
		discStepInput.onchange = (e) => {
			const target = e.target as HTMLInputElement;
			let newval = +target.value;
			if (newval > 0) {
				this.DiscretizerStep = newval;
				this.Redraw();
			}
		};
		topBar.appendChild(discStepInput);

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
		marker.addListener("dragend", () => {
			this.Redraw();
		});
		this.Markers.push(marker);
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
		let del = document.createElement('button');
		let input = document.createElement('input');

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
		del.addEventListener('click', () => {
			marker.setMap(null);
			this.CleanMarkers();
			this.Redraw();
		});

		div.appendChild(info);
		div.appendChild(del);

		const infowindow = new google.maps.InfoWindow({ content: div });
		infowindow.open(marker.getMap(), marker);
		infowindow.addListener('closeclick', () => this.Redraw());
	}

	CleanMarkers(): void {
		this.Markers = this.Markers.filter((marker) => marker.getMap());
	}

	GetDestinations(): Destination[] {

		let dests: Destination[] = [];
		for (let marker of this.Markers) {
			let wheight: number = +this.getMarkerLabel(marker);
			var latlng = marker.getPosition() as google.maps.LatLng;
			dests.push(new Destination(new Place(latlng.lat(), latlng.lng()), wheight));
		}
		return dests;
	}

	Redraw() {

		let destinations = this.GetDestinations();

		if (destinations.length < 2) {
			return;
		}

		let costCalc: CostCalculator = new HaversineDistance();
		//let dset: DestinationSet = new AllDestinations(destinations);
		let dset: DestinationSet = new AnyDestination(destinations);
		let box: BoundingBox = this.MapConnector.GetBoundingBox();
		box.ExpandBy(50);
		let boxSize: number = Math.min(box.SizeLat, box.SizeLong);

		let disc = new LnDiscretizer(this.DiscretizerStep, this.DiscretizerOffset);

		let explorer: Explorer = new Explorer(dset, boxSize/2, boxSize/80, disc, costCalc, this.MapConnector);

		clearTimeout(this.RedrawTimer);

		this.RedrawTimer = setTimeout(()=>{
			console.time('Redraw');
			this.MapConnector.ClearLines();
			explorer.DestSet.ClearCostCache();
			let box: BoundingBox = this.MapConnector.GetBoundingBox();
			box.ExpandBy(50);
			let boxSize: number = Math.min(box.SizeLat, box.SizeLong);
			explorer.SetMaxSize(boxSize/10);
			explorer.SetMinSize(boxSize/80);
			//explorer.Debug = true;
			explorer.Explore(box);
			console.timeEnd('Redraw')
		}, 1000);

	}
}

