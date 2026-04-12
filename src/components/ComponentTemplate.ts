// src/components/ComponentTemplate.ts

import { BaseComponent } from "../core/BaseComponent.ts";
import type { Result } from "../core/types.ts";

/**
 * @name ComponentTemplate
 * @class
 * @extends BaseComponent
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description Implements a template component that validates input, performs a unit of work, and writes deterministic results back into the shared blackboard. Serves as a reference implementation for building new components that follow the BaseComponent lifecycle.
 * @intent Provides a minimal but complete demonstration of the expected lifecycle pattern (started → validate → work → mutate → finished) so new components can follow a consistent structure.
 * @see {@link BaseComponent} — lifecycle behavior
 * @see {@link Result} — structure returned by `process()`
 * @example
 * ```typescript
 * const c = new ComponentTemplate();
 * const board = new Map([["exampleKey", "value"]]);
 * const result = await c.process(board);
 * ```
 */
export class ComponentTemplate extends BaseComponent {
	/**
	 * @name constructor
	 * @constructor
	 * @access public
	 * @description Initializes the component and registers its name with the BaseComponent lifecycle system.
	 * @intent Ensures the component is identifiable in logs, lifecycle events, and error emissions.
	 */
	constructor() {
		super("ComponentTemplate");
	}

	/**
	 * @name process
	 * @method
	 * @async
	 * @param {Map<string, unknown>} input
	 * @returns {Promise<Result<Map<string, unknown>, Map<string, unknown>>>}
	 * @access public
	 * @description Validates required input, performs the component’s core work, updates the blackboard with results, and returns a structured Result indicating success or failure.
	 * @intent Acts as the orchestrator for the component’s lifecycle: enforcing input requirements, delegating work, and ensuring deterministic blackboard mutation while preventing unhandled exceptions from escaping.
	 */
	async process(
		input: Map<string, unknown>,
	): Promise<Result<Map<string, unknown>, Map<string, unknown>>> {
		this.started();

		try {
			// 1. Validate input
			const example = input.get("exampleKey");
			if (!example) {
				this.failed(`Missing required field: exampleKey`);
			}

			// 2. Perform work (may throw)
			const output = await this.doWork(example);

			// 3. Mutate blackboard deterministically
			input.set("exampleOutput", output);

			this.finished();
			return { success: true, value: input };
		} catch (err) {
			// DO NOT call this.failed() here — it throws again.
			this.emitError({ failed: this.name, error: err });
			return { success: false, input, error: String(err) };
		}
	}

	/**
	 * @name doWork
	 * @method
	 * @param {unknown} example
	 * @returns {unknown}
	 * @access private
	 * @description Executes the component’s internal operation and throws a controlled failure if the provided value is invalid.
	 * @intent Encapsulates the component’s actual business logic so the process() method can remain focused on lifecycle flow and error handling.
	 */
	private doWork(example: unknown): unknown {
		if (example === "bad") {
			this.failed("Encountered invalid value in doWork()");
		}

		// Normal work
		return { processed: true };
	}
}
