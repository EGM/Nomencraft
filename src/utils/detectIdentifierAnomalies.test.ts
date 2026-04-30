// utils/detectIdentifierAnomalies.test.ts
import { assert, assertEquals } from "@std/assert";
import { detectIdentifierAnomalies } from "../../src/utils/detectIdentifierAnomalies.ts";

Deno.test("detectIdentifierAnomalies detects whitespace", () => {
	const issues = detectIdentifierAnomalies("EFA -2");
	assert(issues.some((i) => i.type === "whitespace"));
});

Deno.test("detectIdentifierAnomalies detects unicode hyphens", () => {
	const issues = detectIdentifierAnomalies("EFA–2");
	assert(issues.some((i) => i.type === "unicodeHyphen"));
});

Deno.test("detectIdentifierAnomalies detects invisible characters", () => {
	const issues = detectIdentifierAnomalies("EFA\u200B2");
	assert(issues.some((i) => i.type === "invisible"));
});

Deno.test("detectIdentifierAnomalies detects uppercase", () => {
	const issues = detectIdentifierAnomalies("EFA-2");
	assert(issues.some((i) => i.type === "case"));
});

Deno.test("detectIdentifierAnomalies returns empty array for clean identifiers", () => {
	const issues = detectIdentifierAnomalies("efa-2");
	assertEquals(issues.length, 0);
});
