// src/core/runPipeline.ts
import type { PipelineComponent } from "./PipelineComponent.ts";
import type { Result } from "./types.ts";

/**
 * @name runPipeline
 * @function
 * @async
 * @param {I} initial
 * @param {Array<PipelineComponent<I, I>>} components
 * @returns {Promise<Result<I, I>>}
 * @access public
 * @template I
 * @description Executes a sequence of pipeline components in order, passing the evolving state from one component to the next and stopping immediately on the first failure.
 * @intent Provides the deterministic execution engine behind createPipeline, ensuring consistent state propagation, predictable short‑circuit behavior, and a uniform Result contract across all components.
 */
export async function runPipeline<I>(
	initial: I,
	components: Array<PipelineComponent<I, I>>,
): Promise<Result<I, I>> {
	let state = initial;

	for (const c of components) {
		const result = await c.process(state);
		if (!result.success) {
			return { success: false, input: result.input, error: result.error };
		}
		state = result.value;
	}

	return { success: true, value: state };
}
