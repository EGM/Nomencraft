// src/core/BaseComponent.ts
export abstract class BaseComponent extends EventTarget {
	readonly name: string;

	constructor(name: string) {
		super();
		this.name = name;
	}

	protected emitDebug(detail: unknown) {
		this.dispatchEvent(
			new CustomEvent("debug", { detail }),
		);
	}

	protected emitWarning(detail: unknown) {
		this.dispatchEvent(
			new CustomEvent("warning", { detail }),
		);
	}

	protected emitError(detail: unknown) {
		this.dispatchEvent(
			new CustomEvent("error", { detail }),
		);
	}

	protected started() {
		this.emitDebug({ started: this.name });
	}

	protected finished() {
		this.emitDebug({ finished: this.name });
	}

	protected failed(error: unknown): never {
		this.emitError({ failed: this.name, error });
		throw new Error(String(error));
	}
}
