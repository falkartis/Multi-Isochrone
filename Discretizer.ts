interface Discretizer {
	Discretize(v: number): number;
}

class LinearDiscretizer implements Discretizer {
	Step: number;
	Offset: number;
	constructor(step: number, offset?: number) {
		this.Step = step;
		if (offset == null) {
			this.Offset = 0;
		} else {
			this.Offset = offset;
		}
	}
	Discretize(v: number) {
		// ceil or floor, that is the question

		return this.Step * Math.ceil((v - this.Offset) / this.Step) + this.Offset;
	}
}
