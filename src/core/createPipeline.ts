// src/core/createPipeline.ts
/**
 * @intent Build a deterministic pipeline with explicit contracts.
 * @decision Pipelines should be observable, ordered, and replayable.
 * @future Add validation, typed pipeline metadata, or parallel branches.
 * @ai Generated to unify pipeline creation across the ecosystem.
 */
// deno-lint-ignore-file require-await

import type { BaseComponent } from "./BaseComponent.ts";
import type { PipelineComponent } from "./PipelineComponent.ts";
import type { Result } from "./types.ts";
import { runPipeline } from "./runPipeline.ts";

/**
 * @intent Build a deterministic, observable pipeline.
 */
export function createPipeline<I>(
	...components: Array<PipelineComponent<I, I> & BaseComponent>
) {
	return {
		components,

		observeWith(service: { observe: (c: BaseComponent) => void }) {
			for (const c of components) service.observe(c);
		},

		async run(input: I): Promise<Result<I, I>> {
			return runPipeline(input, components);
		},
	};
}
