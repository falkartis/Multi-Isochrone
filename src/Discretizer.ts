export interface IDiscretizer {
	Discretize(v: number): number;
}

export class LinearDiscretizer implements IDiscretizer {
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

export class LnDiscretizer implements IDiscretizer {

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

export class Log10Discretizer implements IDiscretizer {

	Offset: number;
	Linear: LinearDiscretizer;
	constructor(step: number, offset?: number) {
		this.Linear = new LinearDiscretizer(step);
		this.Offset = offset ?? 0;
	}
	Discretize(v: number) {
		return Math.pow(10, this.Linear.Discretize(Math.log10(Math.abs(v - this.Offset)))) + this.Offset;
	}
}

export class Log2Discretizer implements IDiscretizer {

	Offset: number;
	Linear: LinearDiscretizer;
	constructor(step: number, offset?: number) {
		this.Linear = new LinearDiscretizer(step);
		this.Offset = offset ?? 0;
	}
	Discretize(v: number) {
		return Math.pow(2, this.Linear.Discretize(Math.log2(Math.abs(v - this.Offset)))) + this.Offset;
	}
}

export class LogDiscretizer implements IDiscretizer {

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

export class SqrtDiscretizer implements IDiscretizer {

	Offset: number;
	Linear: LinearDiscretizer;
	constructor(step: number, offset?: number) {
		this.Linear = new LinearDiscretizer(step);
		this.Offset = offset ?? 0;
	}
	Discretize(v: number) {
		return Math.pow(this.Linear.Discretize(Math.sqrt(Math.abs(v - this.Offset))), 2) + this.Offset;
	}
}
