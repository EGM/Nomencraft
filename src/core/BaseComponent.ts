// src/core/BaseComponent.ts
/**
 * @name BaseComponent
 * @class
 * @abstract
 * @extends EventTarget
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description Abstract lifecycle base class providing standardized event‑driven debugging, warnings, errors, and failure handling for all pipeline components.
 * @intent Defines the behavioral contract for all components in the pipeline, ensuring consistent lifecycle signaling (`started`, `finished`, `failed`) and a unified event‑based logging mechanism across the entire system.
 * @see {@link EventTarget} — underlying event dispatch system
 * @see {@link CustomEvent} — event payload mechanism
 * @example
 * ```typescript
 * class MyComponent extends BaseComponent {
 *   constructor() {
 *     super("MyComponent");
 *   }
 * }
 * ```
 */
export abstract class BaseComponent extends EventTarget {
	/**
	 * @property
	 * @type {string}
	 * @name name
	 * @description The registered name of the component, used in lifecycle events and error reporting.
	 * @intent Provides a stable identifier for debugging, logging, and pipeline orchestration.
	 */
	readonly name: string;

	/**
	 * @name constructor
	 * @constructor
	 * @param {string} name
	 * @access public
	 * @description The registered name of the component, used in lifecycle events and error reporting.
	 * @intent Provides a stable identifier for debugging, logging, and pipeline orchestration.
	 */
	constructor(name: string) {
		super();
		this.name = name;
	}

	/**
	 * @name emitDebug
	 * @method
	 * @param {unknown} detail
	 * @access protected
	 * @description Emits a `"debug"` event with the provided detail payload.
	 * @intent Allows components to surface internal state changes or diagnostic information without interrupting execution.
	 */
	protected emitDebug(detail: unknown) {
		this.dispatchEvent(
			new CustomEvent("debug", { detail }),
		);
	}

	/**
	 * @name emitWarning
	 * @method
	 * @param {unknown} detail
	 * @access protected
	 * @description Emits a `"warning"` event with the provided detail payload.
	 * @intent Provides a non‑fatal signaling mechanism for recoverable issues or unexpected conditions.
	 */
	protected emitWarning(detail: unknown) {
		this.dispatchEvent(
			new CustomEvent("warning", { detail }),
		);
	}

	/**
	 * @name emitError
	 * @method
	 * @param {unknown} detail
	 * @access protected
	 * @description Emits an `"error"` event with the provided detail payload.
	 * @intent Allows components to surface structured error information without necessarily throwing, enabling upstream handlers to react appropriately.
	 */
	protected emitError(detail: unknown) {
		this.dispatchEvent(
			new CustomEvent("error", { detail }),
		);
	}

	/**
	 * @name started
	 * @method
	 * @access protected
	 * @description Emits a debug event indicating that the component has begun processing.
	 * @intent Standardizes lifecycle start signaling so pipeline orchestrators and loggers can track component execution flow.
	 */
	protected started() {
		this.emitDebug({ started: this.name });
	}

	/**
	 * @name finished
	 * @method
	 * @access protected
	 * @description Emits a debug event indicating that the component has completed processing.
	 * @intent Standardizes lifecycle completion signaling for consistent pipeline monitoring.
	 */
	protected finished() {
		this.emitDebug({ finished: this.name });
	}

	/**
	 * @name failed
	 * @method
	 * @param {unknown} error
	 * @returns {never}
	 * @access protected
	 * @throws {Error}
	 * @description Emits an error event and throws a new Error constructed from the provided value.
	 * @intent Provides a unified mechanism for hard failures that both signal the error event system and immediately halt component execution.
	 */
	protected failed(error: unknown): never {
		this.emitError({ failed: this.name, error });
		throw new Error(String(error));
	}
}
