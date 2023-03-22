export interface IDiscretizer {
	Discretize(v: number): number;
	SetStep(s: number): void;
	SetOffset(o: number): void;
}

export class LinearDiscretizer implements IDiscretizer {
	Step: number;
	Offset: number;
	constructor(step: number, offset?: number) {
		this.Step = step;
		this.Offset = offset ?? 0;
	}
	Discretize(v: number) {
		return this.Step * Math.ceil((v - this.Offset) / this.Step) + this.Offset;
	}
	SetStep(s: number) {
		this.Step = s;
	}
	SetOffset(o: number) {
		this.Offset = o;
	}
}

abstract class NonLinearDiscretizer {
	Offset: number;
	Linear: LinearDiscretizer;

	constructor(step: number, offset?: number) {
		this.Linear = new LinearDiscretizer(step);
		this.Offset = offset ?? 0;
	}
	SetStep(s: number) {
		this.Linear.SetStep(s);
	}
	SetOffset(o: number) {
		this.Offset = o;
	}
}

export class LnDiscretizer extends NonLinearDiscretizer implements IDiscretizer {
	constructor(step: number, offset?: number) {
		super(step, offset);
	}
	Discretize(v: number) {
		return Math.exp(this.Linear.Discretize(Math.log(Math.abs(v - this.Offset)))) + this.Offset;
	}
}

export class Log10Discretizer extends NonLinearDiscretizer implements IDiscretizer {

	constructor(step: number, offset?: number) {
		super(step, offset);
	}
	Discretize(v: number) {
		return Math.pow(10, this.Linear.Discretize(Math.log10(Math.abs(v - this.Offset)))) + this.Offset;
	}
}

export class Log2Discretizer extends NonLinearDiscretizer implements IDiscretizer {

	constructor(step: number, offset?: number) {
		super(step, offset);
	}
	Discretize(v: number) {
		return Math.pow(2, this.Linear.Discretize(Math.log2(Math.abs(v - this.Offset)))) + this.Offset;
	}
}

export class LogDiscretizer extends NonLinearDiscretizer implements IDiscretizer {

	Base: number;
	constructor(base: number, step: number, offset?: number) {
		super(step, offset);
		this.Base = base;
	}

	LogBase(x:number, y:number) {
		return Math.log(y) / Math.log(x);
	}

	Discretize(v: number) {
		return Math.pow(this.Base, this.Linear.Discretize(this.LogBase(this.Base, Math.abs(v - this.Offset)))) + this.Offset;
	}
}

export class SqrtDiscretizer extends NonLinearDiscretizer implements IDiscretizer {

	constructor(step: number, offset?: number) {
		super(step, offset);
	}
	Discretize(v: number) {
		return Math.pow(this.Linear.Discretize(Math.sqrt(Math.abs(v - this.Offset))), 2) + this.Offset;
	}
}
