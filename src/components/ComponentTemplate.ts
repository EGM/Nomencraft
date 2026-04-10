// src/components/ComponentTemplate.ts

import { BaseComponent } from "../core/BaseComponent.ts";
import type { Result } from "../core/types.ts";

/**
 * @intent
 *   Describe the purpose of this component in one or two sentences.
 *   What does it transform on the blackboard?
 *
 * @input
 *   - Map<string, unknown> (blackboard)
 *   - Required keys:
 *       - "exampleKey": string
 *
 * @output
 *   - Mutates the blackboard by setting:
 *       - "exampleOutput": unknown
 *
 * @decision
 *   - Hard failures use this.failed(), which throws and stops the pipeline.
 *   - Soft failures use emitWarning(), which logs but continues.
 *
 * @future
 *   - Notes for future‑you about potential refactors or enhancements.
 *
 * @ai
 *   - Notes for AI assistants about invariants, assumptions, or constraints.
 */
export class YourComponent extends BaseComponent {
	constructor() {
		super("YourComponent");
	}

	/**
	 * @example
	 *   const input = new Map([["exampleKey", "value"]]);
	 *   const result = await component.process(input);
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
	 * @intent
	 *   Internal helper that performs the actual transformation.
	 *
	 * @decision
	 *   Throws via this.failed() on unrecoverable conditions.
	 *
	 * @ai
	 *   Change the signature and return type as needed. The example is just a placeholder.
	 *   Async version: private async doWork(example: unknown): Promise<unknown> {
	 */

	private doWork(example: unknown): unknown {
		if (example === "bad") {
			this.failed("Encountered invalid value in doWork()");
		}

		// Normal work
		return { processed: true };
	}
}
