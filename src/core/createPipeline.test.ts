// src/core/createPipeline.test.ts
// deno-lint-ignore-file
import { assert, assertEquals } from "@std/assert";
import { createPipeline } from "./createPipeline.ts";
import { BaseComponent } from "./BaseComponent.ts";

/**
 * @name MockA
 * @class
 * @extends BaseComponent
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description Test component that simulates a successful pipeline step by writing `"a" → 1` into the blackboard.
 * @intent Provides a predictable, always‑successful component for verifying that the pipeline executes steps in order and mutates the shared map correctly.
 * @see
 * @example
 */
class MockA extends BaseComponent {
	/**
	 * @name constructor
	 * @constructor
	 * @access public
	 * @description Initializes the mock component with the name `"MockA"`.
	 */
	constructor() {
		super("MockA");
	}
	/**
	 * @name process
	 * @method
	 * @async
	 * @param {Map<string, unknown>} input
	 * @returns {Promise<{ success: true; input: Map<string, unknown>; value: Map<string, unknown>; }>}
	 * @access public
	 * @description Simulates async work, writes `"a" → 1` into the input map, and returns a successful result.
	 * @intent Acts as a controlled success case for pipeline sequencing tests.
	 */
	async process(input: Map<string, unknown>) {
		await Promise.resolve(); // simulate async work
		input.set("a", 1);
		return { success: true as const, input, value: input };
	}
}

/**
 * @name MockB
 * @class
 * @extends BaseComponent
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description Test component that simulates a successful pipeline step by writing "b" → 2 into the blackboard.
 * @intent Used to verify that multiple components run sequentially and that state accumulates across steps.
 */
class MockB extends BaseComponent {
	/**
	 * @name constructor
	 * @constructor
	 * @access public
	 * @description Initializes the mock component with the name `"MockB"`.
	 */
	constructor() {
		super("MockB");
	}
	/**
	 * @name process
	 * @method
	 * @async
	 * @param {Map<string, unknown>} input
	 * @returns {Promise<{ success: true; input: Map<string, unknown>; value: Map<string, unknown>; }>}
	 * @access public
	 * @description Simulates async work, writes `"b" → 2` into the input map, and returns a successful result.
	 * @intent Provides a second success case to confirm that the pipeline continues after earlier components succeed.
	 */
	async process(input: Map<string, unknown>) {
		await Promise.resolve(); // simulate async work
		input.set("b", 2);
		return { success: true as const, input, value: input };
	}
}
/**
 * @name FailAtB
 * @class
 * @extends BaseComponent
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description Test component that simulates a failure during pipeline execution by returning a failed result with error `"boom"`.
 * @intent Used to verify that the pipeline stops immediately on failure and does not execute subsequent components.
 */
class FailAtB extends BaseComponent {
	/**
	 * @name constructor
	 * @constructor
	 * @access public
	 * @description Initializes the mock component with the name `"FailAtB"`.
	 */
	constructor() {
		super("FailAtB");
	}
	/**
	 * @name process
	 * @method
	 * @async
	 * @param {Map<string, unknown>} input
	 * @returns {Promise<{ success: false; input: Map<string, unknown>; error: string; }>}
	 * @access public
	 * @description Simulates async work, writes `"b" → 2`, and returns a failure result with error `"boom"`.
	 * @intent Provides a deterministic failure point for testing pipeline short‑circuit behavior.
	 */
	async process(input: Map<string, unknown>) {
		await Promise.resolve(); // simulate async work
		input.set("b", 2);
		return { success: false as const, input, error: "boom" };
	}
}
/**
 * @name MockC
 * @class
 * @extends BaseComponent
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description Test component that simulates a successful pipeline step by writing "c" → 3 into the blackboard.
 * @intent Used to verify that this component is skipped when earlier components fail.
 */
class MockC extends BaseComponent {
	/**
	 * @name constructor
	 * @constructor
	 * @access public
	 * @description Initializes the mock component with the name `"MockC"`.
	 */
	constructor() {
		super("MockC");
	}
	/**
	 * @name process
	 * @method
	 * @async
	 * @param {Map<string, unknown>} input
	 * @returns {Promise<{ success: true; input: Map<string, unknown>; value: Map<string, unknown>; }>}
	 * @access public
	 * @description Simulates async work, writes `"c" → 3` into the input map, and returns a successful result.
	 * @intent Acts as a final success case to confirm that the pipeline reaches later components only when earlier ones succeed.
	 */
	async process(input: Map<string, unknown>) {
		await Promise.resolve(); // simulate async work
		input.set("c", 3);
		return { success: true as const, input, value: input };
	}
}

Deno.test("createPipeline: runs components in order and mutates blackboard", async () => {
	const pipeline = createPipeline(
		new MockA(),
		new MockB(),
		new MockC(),
	);

	const input = new Map<string, unknown>();
	const result = await pipeline.run(input);

	assert(result.success);

	const out = result.value;
	assertEquals(out.get("a"), 1);
	assertEquals(out.get("b"), 2);
	assertEquals(out.get("c"), 3);
});

Deno.test("createPipeline: stops on first failure", async () => {
	const pipeline = createPipeline(
		new MockA(),
		new FailAtB(),
		new MockC(), // should never run
	);

	const input = new Map<string, unknown>();
	const result = await pipeline.run(input);

	assert(!result.success);
	assertEquals(result.error, "boom");
	assertEquals(input.has("c"), false); // C never ran
});
