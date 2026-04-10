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

/** */
/**
 * TODO: Describe the createPipeline function.
 * @param components - {any[]}
 * @returns { components: any[]; observeWith(service: { observe: (c: BaseComponent) => void; }): void; run(input: I): Promise<Result<I, I>>; }
 *
 * @intent Build a deterministic, observable pipeline.
 */
export function createPipeline<I>(
	...components: Array<PipelineComponent<I, I> & BaseComponent>
) {
	return {
		components,

		/**
		 * TODO: Describe the observeWith method.
		 * @param service - {{ observe: (c: BaseComponent) => void; }}
		 */
		observeWith(service: { observe: (c: BaseComponent) => void }) {
			for (const c of components) service.observe(c);
		},

		/**
		 * TODO: Describe the run method.
		 * @param input - {I}
		 * @returns Promise<Result<I, I>>
		 */
		async run(input: I): Promise<Result<I, I>> {
			return runPipeline(input, components);
		},
	};
}
