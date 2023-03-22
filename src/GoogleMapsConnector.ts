import { IDestination, IDestinationSet, AllDestinations, AnyDestination, TwoOfThem } from './DestinationSet.js';
import { WeightedPlace } from './DestinationSet.js';
import { IMapConnector } from './MapConnector.js';
import { BoundingBox, Place } from './index.js';

export interface IMarker {
	GetDestination(): IDestination;
	NiceObj(): any;
	RenderCRUD(parent: HTMLElement, callback: (newval: IMarker) => void);
}

export interface IMarkerSet extends IMarker {
	GetDestinationSet(): IDestinationSet;
	AddMarker(marker: IMarker): void;
	CleanMarkers(): void;
	Markers: IMarker[];
}

export class ExtendedMarker extends google.maps.Marker implements IMarker {

	Name: string;

	constructor(map: google.maps.Map, lat: number, long: number, weight?: number, name?: string) {

		super({
			position: new google.maps.LatLng(lat, long),
			map: map,
			draggable: true,
			label: "" + (weight ?? "1"),
		});
		this.Name = name ?? "";
	}
	GetWeight(): number {
		let weight: number;

		const markerLabel = this.getLabel() as google.maps.MarkerLabel | string;
		if (typeof markerLabel === "string") {
			weight = +markerLabel;
		} else {
			weight = +(markerLabel?.text ?? "1");
		}
		return weight;
	}
	GetDestination(): IDestination {

		var latlng = this.getPosition() as google.maps.LatLng;

		return new WeightedPlace(latlng.lat(), latlng.lng(), this.GetWeight());
	}
	NiceObj() {
		return {Name: this.Name, Weight: this.GetWeight()};
	}
	RenderCRUD(parent: HTMLElement, callback: (newval: IMarker) => void) {
		let weightHtml = document.createElement('input');
		weightHtml.type = "number";
		weightHtml.value = "" + this.GetWeight();
		weightHtml.onchange = (e) => {
			const target = e.target as HTMLInputElement;
			this.setLabel(target.value);
			callback(this);
		};

		let nameHtml = document.createElement('input');
		nameHtml.value = this.Name;
		nameHtml.onchange = (e) => {
			const target = e.target as HTMLInputElement;
			this.Name = target.value;
			callback(this);
		};

		parent.appendChild(nameHtml);
		parent.appendChild(weightHtml);
	}
}

abstract class MarkerSet implements IMarkerSet {
	Markers: IMarker[];
	Weight: number;
	Name: string;

	constructor(markers: IMarker[], weight?: number, name?: string) {
		this.Markers = markers;
		this.Weight = weight ?? 1;
		this.Name = name ?? "";
	}

	abstract GetDestinationSet(): IDestinationSet;

	AddMarker(marker: IMarker) {
		this.Markers.push(marker);
	}
	
	GetDestinations() {
		return this.Markers.map( m => m.GetDestination());
	}

	GetDestination() {
		return this.GetDestinationSet();
	}

	CleanMarkers(): void {
		let newMarkers: IMarker[] = [];

		for (let marker of this.Markers) {

			if ((marker as IMarkerSet).CleanMarkers) {
				(marker as IMarkerSet).CleanMarkers();
				if ((marker as IMarkerSet).Markers.length > 0) {
					newMarkers.push(marker);
				}
			} else {
				if ((marker as ExtendedMarker).getMap() !== null) {
					newMarkers.push(marker);
				}
			}
		}
		this.Markers = newMarkers;
	}
	NiceObj() {
		return {
			Type: this.constructor.name,
			Weight: this.Weight,
			Markers: this.Markers.map(m => m.NiceObj()),
			Name: this.Name,
		};
	}
	RenderCRUD(parent: HTMLElement, callback: (newval: IMarker) => void) {
		let typeHtml = document.createElement('select');
		let allHtml = document.createElement('option');
		let anyHtml = document.createElement('option');
		let twoHtml = document.createElement('option');
		allHtml.innerHTML = "All destinations.";
		anyHtml.innerHTML = "Only the nearest destination.";
		twoHtml.innerHTML = "The two nearest destinations in a round trip.";
		allHtml.value = "AllMarkers";
		anyHtml.value = "AnyMarker";
		twoHtml.value = "TwoMarkers";
		if (this.constructor.name == "AllMarkers")			allHtml.selected = true;
		if (this.constructor.name == "AnyMarker")			anyHtml.selected = true;
		if (this.constructor.name == "TwoMarkers")			twoHtml.selected = true;
		typeHtml.appendChild(allHtml);
		typeHtml.appendChild(anyHtml);
		typeHtml.appendChild(twoHtml);
		typeHtml.onchange = (e) => {
			let newval: IMarkerSet;
			switch ((e.target as HTMLSelectElement).value){
				case "AllMarkers": {	newval = new AllMarkers(this.Markers, this.Weight, this.Name);	break;	}
				case "AnyMarker": {		newval = new AnyMarker(this.Markers, this.Weight, this.Name);	break;	}
				case "TwoMarkers": {	newval = new TwoMarkers(this.Markers, this.Weight, this.Name);	break;	}
				default: {
					console.log(`Unknown value ${(e.target as HTMLSelectElement).value}.`);
					newval = new AllMarkers(this.Markers, this.Weight);
				}
			}
			callback(newval);
		};


		let weightHtml = document.createElement('input');
		weightHtml.type = "number";
		weightHtml.value = "" + this.Weight;
		weightHtml.onchange = (e) => {
			const target = e.target as HTMLInputElement;
			this.Weight = +target.value;
			callback(this);
		};

		let nameHtml = document.createElement('input');
		nameHtml.value = this.Name;
		nameHtml.onchange = (e) => {
			const target = e.target as HTMLInputElement;
			this.Name = target.value;
			callback(this);
		};

		let ulHtml = document.createElement('ul');

		for (let i = 0; i < this.Markers.length; i++) {
			let marker = this.Markers[i];
			let liHtml = document.createElement('li');
			marker.RenderCRUD(liHtml, newchild => {
				this.Markers[i] = newchild; // Will this replace the last one?
				callback(this);
			});
			ulHtml.appendChild(liHtml);
		}
		parent.appendChild(typeHtml);
		parent.appendChild(nameHtml);
		parent.appendChild(weightHtml);
		parent.appendChild(ulHtml);
	}
}

export class AllMarkers extends MarkerSet {
	GetDestinationSet() {
		return new AllDestinations(this.GetDestinations(), this.Weight);
	}
}

export class AnyMarker extends MarkerSet {
	GetDestinationSet() {
		return new AnyDestination(this.GetDestinations(), this.Weight);
	}
}

export class TwoMarkers extends MarkerSet {
	GetDestinationSet() {
		return new TwoOfThem(this.GetDestinations(), this.Weight);
	}
}

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
	GetBoundingBoxes(): BoundingBox[] {
		let box: google.maps.LatLngBounds|undefined = this.Map.getBounds();
		if (box === undefined) {
			console.log("Map.getBounds() returned undefined, can't build BoundingBox, returning 0,0.");
			return [new BoundingBox(new Place(0, 0))];
		}
		let min = new Place(box.getSouthWest().lat(), box.getSouthWest().lng());
		let max = new Place(box.getNorthEast().lat(), box.getNorthEast().lng());

		if (min.Long > max.Long) {
			return [
				new BoundingBox(min, new Place(max.Lat,  180)),
				new BoundingBox(new Place(min.Lat, -180), max)
			];
		} else {
			return [new BoundingBox(min, max)];
		}
	}
}
