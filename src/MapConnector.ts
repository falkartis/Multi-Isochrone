import { Destination, Place, BoundingBox } from './index.js';

export interface MapConnector {
	AddMarker(dest: Destination): void;
	AddLine(p1: Place, p2: Place, cost: number): void;
	ClearLines(): void;
	DrawRedRectangle(box: BoundingBox, cost: number): void;
	DrawDarkRectangle(box: BoundingBox): void;
	GetBoundingBox(): BoundingBox;
}


export class ConsoleLogConnector implements MapConnector {

	constructor() {	}

	AddMarker(dest: Destination) {						console.log({ConsoleLogConnector: "AddMarker", dest});	}
	AddLine(p1: Place, p2: Place, cost: number) {		console.log({ConsoleLogConnector: "AddLine", p1, p2, cost});	}
	ClearLines() {										console.log({ConsoleLogConnector: "ClearLines"});	}
	DrawRedRectangle(box: BoundingBox, cost: number) {	console.log({ConsoleLogConnector: "DrawRedRectangle", box, cost});	}
	DrawDarkRectangle(box: BoundingBox) {				console.log({ConsoleLogConnector: "DrawDarkRectangle", box});	}
	GetBoundingBox() {
		console.log("ConsoleLogConnector is a dummy class, returning 0,0 BoundingBox.")
		return new BoundingBox(new Place(0, 0));
	}
}
