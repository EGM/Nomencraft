// src/core/createPipeline.ts
// deno-lint-ignore-file require-await

import type { BaseComponent } from "./BaseComponent.ts";
import type { PipelineComponent } from "./PipelineComponent.ts";
import type { Result } from "./types.ts";
import { runPipeline } from "./runPipeline.ts";

/**
 * @name createPipeline
 * @function
 * @param {Array<PipelineComponent<I, I> & BaseComponent>} components
 * @access public
 * @template I
 * @description Constructs a deterministic pipeline composed of ordered components, returning an object that can observe component events and execute the pipeline with a single run() call.
 * @intent Provides a lightweight orchestration wrapper that binds components together into a predictable execution chain while exposing a minimal API for running and observing the pipeline.
 * @see {@link runPipeline} — underlying execution engine
 * @see {@link PipelineComponent} — component contract
 * @see {@link BaseComponent} — lifecycle and event behavior
 * @example
 * ```typescript
 * const pipeline = createPipeline(stepA, stepB, stepC);
 * const result = await pipeline.run(initialInput);
 * ```
 */
export function createPipeline<I>(
	...components: Array<PipelineComponent<I, I> & BaseComponent>
) {
	return {
		/**
		 * @name components
		 * @type Array<PipelineComponent<I, I> & BaseComponent>
		 * @property
		 * @description The ordered list of pipeline components provided to `createPipeline`.
		 * @intent Preserves the exact execution order so the pipeline behaves deterministically.
		 */
		components,

		/**
		 * @name observeWith
		 * @method
		 * @param service
		 * @description Registers each component with an external service that exposes an observeComponent() method.
		 * @intent Allows services (e.g., loggers, monitors) to subscribe to component lifecycle events without modifying the pipeline itself.
		 */
		observeWith(service: { observeComponent: (c: BaseComponent) => void }) {
			for (const c of components) service.observeComponent(c);
		},

		/**
		 * @name run
		 * @method
		 * @param input
		 * @returns Promise<Result<I, I>>
		 * @description Executes the pipeline by delegating to runPipeline, passing the initial input and the ordered component list.
		 * @intent Provides a simple, unified entry point for running the entire pipeline, abstracting away the internal execution mechanics.
		 */
		async run(input: I): Promise<Result<I, I>> {
			return runPipeline(input, components);
		},
	};
}
