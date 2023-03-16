export interface Discretizer {
	Discretize(v: number): number;
}

export class LinearDiscretizer implements Discretizer {
	Step: number;
	Offset: number;
	constructor(step: number, offset?: number) {
		this.Step = step;
		this.Offset = offset ?? 0;
	}
	Discretize(v: number) {
		// ceil or floor, that is the question
		return this.Step * Math.ceil((v - this.Offset) / this.Step) + this.Offset;
	}
}

export class LnDiscretizer implements Discretizer {

	Offset: number;
	Linear: LinearDiscretizer;
	constructor(step: number, offset?: number) {
		this.Linear = new LinearDiscretizer(step);
		this.Offset = offset ?? 0;
	}

	Discretize(v: number) {
		return Math.exp(this.Linear.Discretize(Math.log(Math.abs(v - this.Offset)))) + this.Offset;
	}
}

export class LogDiscretizer implements Discretizer {

	Base: number;
	Offset: number;
	Linear: LinearDiscretizer;
	constructor(base: number, step: number, offset?: number) {
		this.Base = base;
		this.Offset = offset ?? 0;
		this.Linear = new LinearDiscretizer(step);
	}

	LogBase(x:number, y:number) {
		return Math.log(y) / Math.log(x);
	}

	Discretize(v: number) {
		return Math.pow(this.Base, this.Linear.Discretize(this.LogBase(this.Base, Math.abs(v - this.Offset)))) + this.Offset;
	}
}
