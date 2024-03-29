import { ICostCalculator, TaxicabDist, EightDirections, EuclideanDist, LatCorrectedEuclidean, HaversineDist } from './CostCalculator.js';
import { GoogleMapsConnector, IMarkerSet, IMarker, ExtendedMarker, AllMarkers, AnyMarker, TwoMarkers } from './GoogleMapsConnector.js';
import { IDiscretizer, LinearDiscretizer, LnDiscretizer, Log10Discretizer, Log2Discretizer, SqrtDiscretizer } from './Discretizer.js';
import { IDestination, IDestinationSet, WeightedPlace, AllDestinations, AnyDestination, TwoOfThem } from './DestinationSet.js';
import { DefaultCostMatrixProvider } from './CostMatrix.js';
import { BoundingBox } from './BoundingBox.js';
import { Explorer } from './Explorer.js';
import { Place } from './index.js';

console.log("In program.js");
window.addEventListener('load', function() {
	new Program();
	console.log("In load");
});

declare global {
	interface Window { googleMap: any; }
}

class Program {

	RedrawTimer: ReturnType<typeof setTimeout>;
	Redrawing: boolean;
	MapConnector: GoogleMapsConnector;
	Discretizer: IDiscretizer;
	DiscretizerStep: number;
	DiscretizerOffset: number;
	CostCalculator: ICostCalculator;
	MarkerSet: IMarkerSet;
	ActiveMarkerSet: IMarkerSet;

	constructor() {

		let map = window.googleMap;

		map.addListener("dblclick", 	(e) => { this.placeMarker(e.latLng, map); });
		map.addListener("zoom_changed",	() => { this.Redraw(); });
		map.addListener("dragend",		() => { this.Redraw(); });

		this.RedrawTimer = setTimeout(()=>{ console.log("RedrawTimer"); }, 1);
		this.Redrawing = false;
		this.MapConnector = new GoogleMapsConnector(map);
		this.CostCalculator = new HaversineDist();
		this.DiscretizerOffset = 0;
		this.DiscretizerStep = 0.5;
		this.Discretizer = new LnDiscretizer(this.DiscretizerStep, this.DiscretizerOffset);

		this.MarkerSet = new AllMarkers([]);
		this.ActiveMarkerSet = this.MarkerSet;

		this.ToolBar();
		this.SideBar();
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
	SideBar() {
		//markerSetUI
		let sideBar = document.getElementById("markerSetUI");
		if (sideBar == null) {
			throw new Error('No div with id markerSetUI found.');
		}
		sideBar.innerHTML = "";
		this.MarkerSet.RenderCRUD(sideBar,
			newval => {
				let newValAsSet = newval as IMarkerSet;
				if (newValAsSet.Markers) {
					this.MarkerSet = newValAsSet;
				}
				this.Redraw();
			},
			radioSet => {
				this.ActiveMarkerSet = radioSet;
			},
			marker => {
				this.CleanMarkers();
				this.Redraw();
		});
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
			//TODO: Get base from UI.
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
			const boxes = this.MapConnector.GetBoundingBoxes();
			if (boxes.length > 0) {
				const box = boxes[0];
				const lat = box.Center.Lat;
				this.CostCalculator = new LatCorrectedEuclidean(lat);
			}
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
		let paris =		new ExtendedMarker(this.MapConnector.Map, 48.8603237,	 2.3106225, 1, "Paris");
		let london =	new ExtendedMarker(this.MapConnector.Map, 51.5287714,	-0.2420236, 1, "London");
		let berlin =	new ExtendedMarker(this.MapConnector.Map, 52.50697,		13.2843069, 1, "Berlin");
		let rome =		new ExtendedMarker(this.MapConnector.Map, 41.9102411,	12.3955719, 1, "Rome");
		let barcelona =	new ExtendedMarker(this.MapConnector.Map, 41.3927754,	 2.0699778, 1, "Barcelona");
		let amsterdam =	new ExtendedMarker(this.MapConnector.Map, 52.3546527,	 4.8481785, 1, "Amsterdam");

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

		this.MarkerSet.Name = "Old"

		let any = new AnyMarker([shuffled[0], shuffled[1], shuffled[2]], 1, "Any");
		let two = new TwoMarkers([shuffled[3], shuffled[4], shuffled[5]], 1, "Two");
		let all = new AllMarkers([any, two, this.MarkerSet], 1, "All");

		this.MarkerSet = all;
		//this.ActiveMarkerSet = all;
		this.CleanMarkers();
		this.Redraw();

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

	markerClick(marker: ExtendedMarker) {

		let div = document.createElement('div');

		let info = document.createElement('label');
		info.innerHTML = "How often do you visit this place: <br>";
		div.appendChild(info);

		marker.RenderCRUD(div, n => {}, n => {}, m => {
				this.CleanMarkers();
				this.Redraw();
		});

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

		let dSet = this.MarkerSet.GetDestinationSet();

		let matrixProv = new DefaultCostMatrixProvider(this.CostCalculator);

		let explorer = new Explorer(dSet, this.Discretizer, matrixProv, this.MapConnector);

		clearTimeout(this.RedrawTimer);

		if (!this.Redrawing) {

			this.RedrawTimer = setTimeout(()=>{

				console.time('Redraw');
				this.Redrawing = true;
				//console.log(this.MarkerSet.NiceObj());
				this.MapConnector.ClearLines();
				
				let boxes: BoundingBox[] = this.MapConnector.GetBoundingBoxes();
				let i = 0;
				for (let box of boxes) {
					i++;
					let ii = i;
					console.time('Draw' + ii);
					console.log({box});
					box.ExpandBy(20);
					let boxSize: number = Math.min(box.SizeLat, box.SizeLong);
					//explorer.Debug = true;
					explorer.Explore(box, boxSize/2, boxSize/30).then(()=>{
						console.timeEnd('Draw' + ii);
						this.Redrawing = false;
					});
				}
				this.SideBar();
				console.timeEnd('Redraw');

			}, 1000);
		}
	}
}

