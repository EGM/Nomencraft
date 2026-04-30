// utils/normalizeSampleId.test.ts
import { assertEquals } from "@std/assert";
import { normalizeSampleId } from "./normalizeSampleId.ts";

Deno.test("normalizeSampleId delegates to canonicalizeIdentifier behavior", () => {
	assertEquals(normalizeSampleId("E F A - 2"), "efa-2");
	assertEquals(normalizeSampleId("EFA‑2"), "efa-2");
	assertEquals(normalizeSampleId("EFA-2"), "efa-2");
});
