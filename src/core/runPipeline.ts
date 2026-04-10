// src/core/runPipeline.ts
import type { PipelineComponent } from "./PipelineComponent.ts";
import type { Result } from "./types.ts";

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
