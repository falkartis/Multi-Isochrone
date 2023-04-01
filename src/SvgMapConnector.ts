import { WeightedPlace } from './DestinationSet.js';
import { IMapConnector } from './MapConnector.js';
import { BoundingBox } from './BoundingBox.js';
import { Place } from './index.js';

import Svg, { Circle, Line, Rect } from 'svg.js';


export class SvgMapConnector implements IMapConnector {
    private svg: Svg.Doc;
    private markers: Svg.G;
    private lines: Svg.G;
    private redRectangles: Svg.G;
    private darkRectangles: Svg.G;

    constructor(svgElement: HTMLElement) {
        this.svg = Svg(svgElement);
        this.markers = this.svg.group();
        this.lines = this.svg.group();
        this.redRectangles = this.svg.group();
        this.darkRectangles = this.svg.group();
    }

    public AddMarker(dest: WeightedPlace): void {
        const marker = this.svg.circle(10).center(dest.Long, dest.Lat);
        this.markers.add(marker);
    }

    public AddLine(p1: Place, p2: Place, cost: number): void {
        const line = this.svg.line(p1.Long, p1.Lat, p2.Long, p2.Lat);
        line.stroke({ color: 'black', width: cost });
        this.lines.add(line);
    }

    public ClearLines(): void {
        this.lines.clear();
        this.redRectangles.clear();
        this.darkRectangles.clear();
    }

    public DrawRedRectangle(box: BoundingBox, cost: number): void {
        const rect = this.svg.rect(box.Max.Long - box.Min.Long, box.Max.Lat - box.Min.Lat)
            .attr({ fill: 'red', opacity: 0.3 })
            .move(box.Min.Long, box.Min.Lat);
        this.redRectangles.add(rect);
    }

    public DrawDarkRectangle(box: BoundingBox): void {
        const rect = this.svg.rect(box.Max.Long - box.Min.Long, box.Max.Lat - box.Min.Lat)
            .attr({ fill: 'black', opacity: 0.3 })
            .move(box.Min.Long, box.Min.Lat);
        this.darkRectangles.add(rect);
    }

    public GetBoundingBoxes(): BoundingBox[] {
        const viewBox = this.svg.viewbox();
        const min = new Place(viewBox.y, viewBox.x);
        const max = new Place(viewBox.y + viewBox.height, viewBox.x + viewBox.width);
        return [new BoundingBox(min, max)];
    }
}
