// src/core/createPipeline.test.ts
import { assert, assertEquals } from "@std/assert";
import { createPipeline } from "./createPipeline.ts";
import { BaseComponent } from "./BaseComponent.ts";

class MockA extends BaseComponent {
	constructor() {
		super("MockA");
	}
	async process(input: Map<string, unknown>) {
		await Promise.resolve(); // simulate async work
		input.set("a", 1);
		return { success: true as const, input, value: input };
	}
}

class MockB extends BaseComponent {
	constructor() {
		super("MockB");
	}
	async process(input: Map<string, unknown>) {
		await Promise.resolve(); // simulate async work
		input.set("b", 2);
		return { success: true as const, input, value: input };
	}
}
class FailAtB extends BaseComponent {
	constructor() {
		super("FailAtB");
	}
	async process(input: Map<string, unknown>) {
		await Promise.resolve(); // simulate async work
		input.set("b", 2);
		return { success: false as const, input, error: "boom" };
	}
}
class MockC extends BaseComponent {
	constructor() {
		super("MockC");
	}
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
