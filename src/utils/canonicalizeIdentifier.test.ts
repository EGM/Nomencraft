import { assert, assertEquals } from "@std/assert";
import { canonicalizeIdentifier } from "./canonicalizeIdentifier.ts";

Deno.test("canonicalizeIdentifier removes all whitespace", () => {
	assertEquals(canonicalizeIdentifier("E F A - 2"), "efa-2");
	assertEquals(canonicalizeIdentifier(" EFA -2 "), "efa-2");
});

Deno.test("canonicalizeIdentifier normalizes unicode hyphens", () => {
	assertEquals(canonicalizeIdentifier("EFA‑2"), "efa-2"); // U+2011
	assertEquals(canonicalizeIdentifier("EFA–2"), "efa-2"); // U+2013
	assertEquals(canonicalizeIdentifier("EFA—2"), "efa-2"); // U+2014
});

Deno.test("canonicalizeIdentifier lowercases the result", () => {
	assertEquals(canonicalizeIdentifier("EFA-2"), "efa-2");
});

Deno.test("canonicalizeIdentifier handles invisible unicode characters", () => {
	assertEquals(canonicalizeIdentifier("EFA\u200B-2"), "efa-2");
});

Deno.test("canonicalizeIdentifier handles non-string input safely", () => {
	// @ts-expect-error
	assertEquals(canonicalizeIdentifier(null), "");
	// @ts-expect-error
	assertEquals(canonicalizeIdentifier(undefined), "");
});
