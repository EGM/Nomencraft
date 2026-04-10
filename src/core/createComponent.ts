// src/core/createComponent.ts
import { BaseComponent } from "./BaseComponent.ts";
import type { Result } from "./types.ts";
import type { PipelineComponent } from "./PipelineComponent.ts";

/**
 * TODO: Describe the createComponent function.
 * @param name - {string}
 * @param fn - {(input: I) => Promise<O> | O}
 * @returns any
 *
 * @intent Create a pipeline component from a pure function.
 * @decision Factory enforces lifecycle events + unified Result shape.
 * @future Add support for typed DebugEvents or richer metadata.
 * @ai Generated to reduce boilerplate and enforce architectural contracts.
 */
export function createComponent<I, O>(
	name: string,
	fn: (input: I) => Promise<O> | O,
): PipelineComponent<I, O> & BaseComponent {
	return new class extends BaseComponent implements PipelineComponent<I, O> {
		constructor() {
			super(name);
		}

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
