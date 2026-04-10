// src/core/BaseComponent.ts
/**
 * TODO: Describe the BaseComponent class.
 */
export abstract class BaseComponent extends EventTarget {
	readonly name: string;

	constructor(name: string) {
		super();
		this.name = name;
	}

	/**
	 * TODO: Describe the emitDebug method.
	 * @param detail - {unknown}
	 */
	protected emitDebug(detail: unknown) {
		this.dispatchEvent(
			new CustomEvent("debug", { detail }),
		);
	}

	/**
	 * TODO: Describe the emitWarning method.
	 * @param detail - {unknown}
	 */
	protected emitWarning(detail: unknown) {
		this.dispatchEvent(
			new CustomEvent("warning", { detail }),
		);
	}

	/**
	 * TODO: Describe the emitError method.
	 * @param detail - {unknown}
	 */
	protected emitError(detail: unknown) {
		this.dispatchEvent(
			new CustomEvent("error", { detail }),
		);
	}

	/**
	 * TODO: Describe the started method.
	 */
	protected started() {
		this.emitDebug({ started: this.name });
	}

	/**
	 * TODO: Describe the finished method.
	 */
	protected finished() {
		this.emitDebug({ finished: this.name });
	}

	/**
	 * TODO: Describe the failed method.
	 * @param error - {unknown}
	 * @returns never
	 */
	protected failed(error: unknown): never {
		this.emitError({ failed: this.name, error });
		throw new Error(String(error));
	}
}
