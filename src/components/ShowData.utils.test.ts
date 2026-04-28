import { assertEquals } from "@std/assert";
import { getLength, mapToObject } from "./ShowData.ts";

Deno.test("mapToObject converts a Map into a plain object", () => {
	const map = new Map<string, unknown>([
		["a", 1],
		["b", "two"],
		["c", { nested: true }],
	]);

	assertEquals(mapToObject(map), {
		a: 1,
		b: "two",
		c: { nested: true },
	});
});

Deno.test("mapToObject handles null and undefined", () => {
	assertEquals(mapToObject(null), {});
	assertEquals(mapToObject(undefined), {});
});

Deno.test("mapToObject handles empty Map", () => {
	assertEquals(mapToObject(new Map()), {});
});

Deno.test("getLength handles strings", () => {
	assertEquals(getLength("hello"), 5);
});

Deno.test("getLength handles arrays", () => {
	assertEquals(getLength([1, 2, 3]), 3);
});

Deno.test("getLength handles objects", () => {
	assertEquals(getLength({ a: 1, b: 2 }), 2);
});

Deno.test("getLength handles empty object", () => {
	assertEquals(getLength({}), 0);
});

Deno.test("getLength handles null and undefined safely", () => {
	assertEquals(getLength(null), 0);
	assertEquals(getLength(undefined), 0);
});

Deno.test("getLength returns 0 for non-string primitives", () => {
	assertEquals(getLength(42), 0);
	assertEquals(getLength(true), 0);
});
