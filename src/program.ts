import { ICostCalculator, TaxicabDist, EightDirections, EuclideanDist, LatCorrectedEuclidean, HaversineDist } from './CostCalculator.js';
import { GoogleMapsConnector, IMarkerSet, IMarker, ExtendedMarker, AllMarkers, AnyMarker, TwoMarkers } from './GoogleMapsConnector.js';
import { IDiscretizer, LinearDiscretizer, LnDiscretizer, Log10Discretizer, Log2Discretizer, SqrtDiscretizer } from './Discretizer.js';
import { IDestination, IDestinationSet, WeightedPlace, AllDestinations, AnyDestination, TwoOfThem } from './DestinationSet.js';
import { BoundingBox, Explorer, Place } from './index.js';


function initMap() {
	new Program();
}
window.initMap = initMap;
window.addEventListener('load', function() {
	initMap();
});

class Program {

	RedrawTimer: ReturnType<typeof setTimeout>;
	MapConnector: GoogleMapsConnector;
	Discretizer: IDiscretizer;
	DiscretizerStep: number;
	DiscretizerOffset: number;
	CostCalculator: ICostCalculator;
	//Markers: google.maps.Marker[];
	//DestinationSet: IDestinationSet;
	MarkerSet: IMarkerSet;
	ActiveMarkerSet: IMarkerSet;

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
		map.addListener("dragend",		() => { this.Redraw(); });

		this.RedrawTimer = setTimeout(()=>{ console.log("RedrawTimer"); }, 1);
		this.MapConnector = new GoogleMapsConnector(map);
		this.CostCalculator = new HaversineDist();
		this.DiscretizerOffset = 0;
		this.DiscretizerStep = 0.25;
		this.Discretizer = new LnDiscretizer(this.DiscretizerStep, this.DiscretizerOffset);

		this.MarkerSet = new AllMarkers([]);
		this.ActiveMarkerSet = this.MarkerSet;

		this.ToolBar();
	}

	ToolBar() {
		let topBar = document.getElementById("topBar");
		if (topBar == null) {
			throw new Error('No div with id topBar found.');
		}

		const costCompTag = topBar.querySelector('[name="costComp"]') as HTMLSelectElement;
		if (costCompTag != null) {
			this.SelectCostCalculator(costCompTag.value);
			costCompTag.onchange = (e) => {
				const target = e.target as HTMLSelectElement;
				let newval = target.value;
				this.SelectCostCalculator(newval);
			}
		}

		const discretizerTag = topBar.querySelector('[name="Discretizer"]') as HTMLSelectElement;
		if (discretizerTag != null) {
			this.SelectDiscretizer(discretizerTag.value);
			discretizerTag.onchange = (e) => {
				const target = e.target as HTMLSelectElement;
				let newval = target.value;
				this.SelectDiscretizer(newval);
			}
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
				this.Discretizer.SetStep(newval);
				// TODO: this should update the discretizer, or the discretizer should be regenerated somehow.
				this.Redraw();
			}
		};
		topBar.appendChild(discStepInput);

		let complexExample = document.createElement('button');
		complexExample.innerHTML = 'Complex Example';
		complexExample.addEventListener('click', () => {
			this.ComplexExample();
		});
		topBar.appendChild(complexExample);
	}

	SelectDiscretizer(name: string) {		
		switch (name) {
		case "LinearDiscretizer": {
			this.Discretizer = new LinearDiscretizer(this.DiscretizerStep, this.DiscretizerOffset);
			break;
		}
		case "LnDiscretizer": {
			this.Discretizer = new LnDiscretizer(this.DiscretizerStep, this.DiscretizerOffset);
			break;
		}
		case "Log10Discretizer": {
			this.Discretizer = new Log10Discretizer(this.DiscretizerStep, this.DiscretizerOffset);
			break;
		}
		case "Log2Discretizer": {
			this.Discretizer = new Log2Discretizer(this.DiscretizerStep, this.DiscretizerOffset);
			break;
		}
		case "LogDiscretizer": {
			console.log("Technical debt: get the base somehow!"); // UI parameter
			//this.Discretizer = new LogDiscretizer(base, this.DiscretizerStep, this.DiscretizerOffset);
			break;
		}
		case "SqrtDiscretizer": {
			this.Discretizer = new SqrtDiscretizer(this.DiscretizerStep, this.DiscretizerOffset);
			break;
		}
		default: {
			console.log(`Discretizer of name '${name}' not here.`)
			break;
		}
		}
		this.Redraw();
	}

	SelectCostCalculator(name: string) {
		switch (name) {
		case "TaxicabDist": {
			this.CostCalculator = new TaxicabDist();
			break;
		}
		case "EightDirections": {
			this.CostCalculator = new EightDirections();
			break;
		}
		case "EuclideanDist": {
			this.CostCalculator = new EuclideanDist();
			break;
		}
		case "LatCorrectedEuclidean": {
			console.log("Technical debt: get the latitude somehow!");
			//this.CostCalculator = new LatCorrectedEuclidean(lat);
			break;
		}
		case "HaversineDist": {
			this.CostCalculator = new HaversineDist();
			break;
		}
		default: {
			console.log(`CostCalculator of name '${name}' not here.`)
			break;
		}
		}
		this.Redraw();
	}

	ComplexExample() {
		console.log("ComplexExample start.");
		let paris =		new ExtendedMarker(this.MapConnector.Map, 48.8603237,	 2.3106225, 1, "paris");
		let london =	new ExtendedMarker(this.MapConnector.Map, 51.5287714,	-0.2420236, 1, "london");
		let berlin =	new ExtendedMarker(this.MapConnector.Map, 52.50697,		13.2843069, 1, "berlin");
		let rome =		new ExtendedMarker(this.MapConnector.Map, 41.9102411,	12.3955719, 1, "rome");
		let barcelona =	new ExtendedMarker(this.MapConnector.Map, 41.3927754,	 2.0699778, 1, "barcelona");
		let amsterdam =	new ExtendedMarker(this.MapConnector.Map, 52.3546527,	 4.8481785, 1, "amsterdam");

		let cities = [paris, london, berlin, rome, barcelona, amsterdam];

		let box: BoundingBox = new BoundingBox(paris.GetDestination().GetCentroid());
		for (let city of cities) {
				city.addListener("click", () => {
					this.markerClick(city);
				});
				city.addListener("dragend", () => {
					this.Redraw();
				});
			box.Expand(city.GetDestination().GetCentroid());
		}
		box.ExpandBy(80);

		let shuffled = cities.map(value => ({ value, r: Math.random() })).sort((a, b) => a.r - b.r).map(({ value }) => value);
		let any = new AnyMarker([shuffled[0], shuffled[1], shuffled[2]]);
		let two = new TwoMarkers([shuffled[3], shuffled[4], shuffled[5]]);
		let all = new AllMarkers([any, two]);

		console.log(all.NiceObj());
		this.MarkerSet = all;
		this.ActiveMarkerSet = all;

		let boxSize: number = Math.min(box.SizeLat, box.SizeLong);

		let dSet = this.MarkerSet.GetDestinationSet();

		let explorer = new Explorer(dSet, boxSize/25, boxSize/50, this.Discretizer, this.CostCalculator, this.MapConnector);
		explorer.Explore(box);

		console.log("ComplexExample end.");
	}

	placeMarker(latLng: google.maps.LatLng, map: google.maps.Map) {
		let marker = new ExtendedMarker(map, latLng.lat(), latLng.lng());
		marker.addListener("click", () => {
			this.markerClick(marker);
		});
		marker.addListener("dragend", () => {
			this.Redraw();
		});
		this.ActiveMarkerSet.AddMarker(marker);
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
		this.MarkerSet.CleanMarkers();
	}

	Redraw() {

		if (this.MarkerSet.Markers.length < 1)
			return;

		let box: BoundingBox = this.MapConnector.GetBoundingBox();
		box.ExpandBy(50);
		let boxSize: number = Math.min(box.SizeLat, box.SizeLong);

		let dSet = this.MarkerSet.GetDestinationSet();

		let explorer = new Explorer(dSet, boxSize/2, boxSize/80, this.Discretizer, this.CostCalculator, this.MapConnector);

		clearTimeout(this.RedrawTimer);

		this.RedrawTimer = setTimeout(()=>{
			console.time('Redraw');
			this.MapConnector.ClearLines();
			explorer.DestSet.ClearCostCache();
			let box: BoundingBox = this.MapConnector.GetBoundingBox();
			
			//box.ExpandBy(50);

			let boxSize: number = Math.min(box.SizeLat, box.SizeLong);
			explorer.SetMaxSize(boxSize/10);
			explorer.SetMinSize(boxSize/80);
			//explorer.Debug = true;
			explorer.Explore(box);
			console.timeEnd('Redraw')
		}, 1000);

	}
}

