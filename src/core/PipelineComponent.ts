// src/core/PipelineComponent.ts
import type { Result } from "./types.ts";

/**
 * A generic interface for stateless pipeline components.
 * Components are "dumb tools" that transform input to output.
 * They do NOT manage lifecycle (init/cleanup) or logging buffers.
 *
 * @intent Enforce explicit input/output contracts.
 * @template I - Input type
 * @template O - Output type
 */

export interface PipelineComponent<I, O> {
	/**
	 * Process the input and return a Result containing the output.
	 * If the component encounters an error, it returns Result.failure().
	 */
	process(input: I): Promise<Result<I, O>>;
}

/**
 * Optional: A component that can validate input before processing.
 */
export interface ValidatableComponent<I, O> extends PipelineComponent<I, O> {
	validate(input: I): boolean;
}
