import { SvgMapConnector } from './SvgMapConnector.js';

const svgElement = document.getElementById('map-container') as HTMLElement;
const map = new SvgMapConnector(svgElement);
