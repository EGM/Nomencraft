import { BaseComponent } from "../core/BaseComponent.ts";
import type { Result } from "../core/types.ts";

/**
 * @description Template component demonstrating the expected lifecycle pattern for new components.
 * @intent Serves as a reference implementation for building components that follow the BaseComponent lifecycle.
 * @see {@link BaseComponent}
 * @see {@link Result}
 * @example
 * const c = new ComponentTemplate();
 * const board = new Map([["exampleKey", "value"]]);
 * const result = await c.process(board);
 */
export class ComponentTemplate extends BaseComponent {
	/**
	 * @description Registers the component name with the BaseComponent lifecycle system.
	 */
	constructor() {
		super("ComponentTemplate");
	}

	/**
	 * @description Validates input, performs work, mutates the blackboard, and returns a structured Result.
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
	 * @description Performs the component's internal operation and throws on invalid input.
	 */
	private doWork(example: unknown): unknown {
		if (example === "bad") {
			this.failed("Encountered invalid value in doWork()");
		}

		// Normal work
		return { processed: true };
	}
}
