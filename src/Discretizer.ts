export interface Discretizer {
	Discretize(v: number): number;
}

export class LinearDiscretizer implements Discretizer {
	Step: number;
	Offset: number;
	constructor(step: number, offset?: number) {
		this.Step = step;
		if (offset == null)		this.Offset = 0;
		else 					this.Offset = offset;
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
		if (offset == null)		this.Offset = 0;
		else 					this.Offset = offset;
	}

	Discretize(v: number) {
		return Math.exp(this.Linear.Discretize(Math.log(v - this.Offset))) + this.Offset;
	}
}

export class LogDiscretizer implements Discretizer {

	Base: number;
	Offset: number;
	Linear: LinearDiscretizer;
	constructor(base: number, step: number, offset?: number) {
		this.Base = base;
		this.Linear = new LinearDiscretizer(step);
		if (offset == null)		this.Offset = 0;
		else 					this.Offset = offset;
	}

	LogBase(x:number, y:number) {
		return Math.log(y) / Math.log(x);
	}

	Discretize(v: number) {
		return Math.pow(this.Base, this.Linear.Discretize(this.LogBase(this.Base, v - this.Offset))) + this.Offset;
	}
}
