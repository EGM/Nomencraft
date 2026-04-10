// src/utils/compare.test.ts

import { shallowEqual } from "./compare.ts";
import { assertEquals } from "@std/assert";

Deno.test("Should compare empty objects (equal)", () => {
	assertEquals(shallowEqual({}, {}), true);
});
Deno.test("Should compare simple objects (equal)", () => {
	assertEquals(shallowEqual({ a: 1 }, { a: 1 }), true);
});
Deno.test("Should compare simple objects (not equal)", () => {
	assertEquals(shallowEqual({ a: 1 }, { b: 1 }), false);
});
Deno.test("Should compare uneven objects (not equal)", () => {
	assertEquals(shallowEqual({ a: 1, b: 2 }, { a: 1 }), false);
});
Deno.test("Should compare uneven objects (extra keys in second)", () => {
	assertEquals(shallowEqual({ a: 1 }, { a: 1, b: 2 }), false);
});
Deno.test("Should compare reordered objects (equal)", () => {
	assertEquals(shallowEqual({ a: 1, b: 2 }, { b: 2, a: 1 }), true);
});
Deno.test("Should treat 1 and '1' as not equal", () => {
	assertEquals(shallowEqual({ a: 1 }, { a: "1" }), false);
});
Deno.test("Should not compare deep objects", () => {
	assertEquals(
		shallowEqual({ a: 1, b: { c: 3 } }, { a: 1, b: { c: 3 } }),
		false,
	);
});
