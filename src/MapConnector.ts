import { Destination, Place, BoundingBox } from './index.js';

export interface MapConnector {
	AddMarker(dest: Destination): void;
	AddLine(p1: Place, p2: Place): void;
	DrawRedRectangle(box: BoundingBox, cost: number): void;
	DrawDarkRectangle(box: BoundingBox): void;
}


export class ConsoleLogConnector implements MapConnector {

	constructor() {	}

	AddMarker(dest: Destination) {						console.log({ConsoleLogConnector:"AddMarker", dest});	}
	AddLine(p1: Place, p2: Place) {						console.log({ConsoleLogConnector:"AddLine", p1, p2});	}
	DrawRedRectangle(box: BoundingBox, cost: number) {	console.log({ConsoleLogConnector: "DrawRedRectangle", box, cost});	}
	DrawDarkRectangle(box: BoundingBox) {				console.log({ConsoleLogConnector: "DrawDarkRectangle", box});	}
}
