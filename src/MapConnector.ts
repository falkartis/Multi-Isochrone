import { WeightedPlace } from './DestinationSet.js';
import { BoundingBox } from './BoundingBox.js';
import { Place } from './index.js';

export interface IMapConnector {
	AddMarker(dest: WeightedPlace): void;
	AddLine(p1: Place, p2: Place, cost: number): void;
	ClearLines(): void;
	DrawRedRectangle(box: BoundingBox, cost: number): void;
	DrawDarkRectangle(box: BoundingBox): void;
	GetBoundingBoxes(): BoundingBox[]; //Could be 2 when wrapping around the globe.
}

export class ConsoleLogConnector implements IMapConnector {

	constructor() {	}

	AddMarker(dest: WeightedPlace) {					console.log({ConsoleLogConnector: "AddMarker", dest});	}
	AddLine(p1: Place, p2: Place, cost: number) {		console.log({ConsoleLogConnector: "AddLine", p1, p2, cost});	}
	ClearLines() {										console.log({ConsoleLogConnector: "ClearLines"});	}
	DrawRedRectangle(box: BoundingBox, cost: number) {	console.log({ConsoleLogConnector: "DrawRedRectangle", box, cost});	}
	DrawDarkRectangle(box: BoundingBox) {				console.log({ConsoleLogConnector: "DrawDarkRectangle", box});	}
	GetBoundingBoxes() {
		console.log("ConsoleLogConnector is a dummy class, returning 0,0 BoundingBox.")
		return [new BoundingBox(new Place(0, 0))];
	}
}
