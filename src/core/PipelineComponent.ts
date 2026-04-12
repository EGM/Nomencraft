// src/core/PipelineComponent.ts
import type { Result } from "./types.ts";

/**
 * @interface
 * @name PipelineComponent
 * @template I
 * @template O
 * @description Defines the minimal contract for a pipeline component: a single asynchronous `process()` method that accepts input of type `I` and returns a standardized `Result<I, O>`.
 * @intent Establishes a uniform interface so all pipeline components can be composed, sequenced, and executed consistently regardless of their internal behavior.
 */
export interface PipelineComponent<I, O> {
	/**
	 * @name process
	 * @method
	 * @param {I} input
	 * @returns {Promise<Result<I, O>>}
	 * @access public
	 * @description Processes the given input and returns a Result describing either a successful transformation or a failure.
	 * @intent Provides the core execution hook for all pipeline components, enabling deterministic chaining and error propagation.
	 */
	process(input: I): Promise<Result<I, O>>;
}

/**
 * @interface
 * @extends PipelineComponent<I, O>
 * @name ValidatableComponent
 * @template I
 * @template O
 * @description Extends `PipelineComponent` by adding a synchronous `validate()` method for pre‑execution input checks.
 * @intent Allows components to enforce structural or semantic input requirements before running their main logic, enabling early failure detection and cleaner error handling.
 */
export interface ValidatableComponent<I, O> extends PipelineComponent<I, O> {
	/**
	 * @name validate
	 * @method
	 * @param {I} input
	 * @returns {boolean}
	 * @access public
	 * @description Performs a synchronous validation check on the input and returns `true` if the component can safely process it.
	 * @intent Provides a lightweight guard mechanism to prevent invalid data from entering the component’s main processing logic.
	 */
	validate(input: I): boolean;
}
