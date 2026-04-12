// src/core/createComponent.ts
import { BaseComponent } from "./BaseComponent.ts";
import type { Result } from "./types.ts";
import type { PipelineComponent } from "./PipelineComponent.ts";

/**
 * @name createComponent
 * @function
 * @param {string} name
 * @param {(input: I) => Promise<O> | O} fn
 * @returns {PipelineComponent<I, O> & BaseComponent}
 * @access public
 * @template I
 * @template O
 * @description Creates a pipeline‑compatible component from a pure function, wrapping it in a lightweight `BaseComponent` subclass that provides lifecycle signaling and standardized result handling.
 * @intent Allows simple functions to participate in the pipeline without requiring a full component class, enabling rapid prototyping and reducing boilerplate for stateless transformations.
 * @see {@link BaseComponent} — lifecycle behavior
 * @see {@link PipelineComponent} — interface contract
 * @example
 * ```ts
 * const c = createComponent("MyStep", (input) => input + 1);
 * const result = await c.process(41);
 * ```
 */
export function createComponent<I, O>(
	name: string,
	fn: (input: I) => Promise<O> | O,
): PipelineComponent<I, O> & BaseComponent {
	return new class extends BaseComponent implements PipelineComponent<I, O> {
		/**
		 * @name constructor
		 * @constructor
		 * @access public
		 * @description Initializes the generated component with the provided name.
		 * @intent Ensures the dynamically created component integrates seamlessly with the BaseComponent lifecycle and logging system.
		 */
		constructor() {
			super(name);
		}

		/**
		 * @name process
		 * @method
		 * @async
		 * @param {I} input
		 * @returns {Promise<Result<I, O>>}
		 * @access public
		 * @description Executes the wrapped function, emitting lifecycle events and returning a standardized `Result` object.
		 * @intent Provides consistent behavior with all other pipeline components, including debug signaling, error handling, and structured success/failure results.
		 */
		async process(input: I): Promise<Result<I, O>> {
			this.started();
			try {
				const value = await fn(input);
				this.finished();
				return { success: true, value };
			} catch (err) {
				this.failed(err);
				return { success: false, input, error: String(err) };
			}
		}
	}();
}
