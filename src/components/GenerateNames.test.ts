// src/components/GenerateNames.test.ts
import { assert, assertEquals } from "@std/assert";
import { GenerateNames } from "./GenerateNames.ts";
import { NamedFile, ParsedData } from "../core/types.ts";

// --- Helpers -------------------------------------------------------------

/**
 * @name makeFilePair
 * @function
 * @returns {{ jobId: string; excelPath: string; pdfPath: string; }[]}
 * @access public
 * @description Creates a mock file pair for testing purposes.
 */
function makeFilePair() {
	return [{
		jobId: "762-8118-1",
		excelPath: "path/to/excel.xlsx",
		pdfPath: "path/to/pdf.pdf",
	}];
}

/**
 * @name makeParsedData
 * @function
 * @param {Partial<ParsedData>} overrides
 * @returns {{ job_id: string; sample_date: string; type_code?: string; samples: { site: string; id: string; date: string; sampledBy: string; measurements: { parameter: string; unit: string; value: string; site: string; labId: string; }[]; }[]; }[]}
 * @access public
 * @description Creates a mock parsed data object for testing purposes. Allows overriding specific fields to test different scenarios.
 */
function makeParsedData(overrides: Partial<ParsedData> = {}) {
	return [{
		job_id: "762-8118-1",
		sample_date: "2024-01-01",
		samples: [
			{
				site: "SITE-1",
				id: "8118-1",
				date: "2024-01-01",
				sampledBy: "Tech 1",
				measurements: [
					{
						parameter: "pH",
						unit: "SU",
						value: "7.1",
						site: "SITE-1",
						labId: "8118-1",
					},
				],
			},
		],
		...overrides,
	}];
}

// Mock patterns so we don’t hit the filesystem
const mockPatterns = [
	{
		name: "pH Pattern",
		code: "P",
		type_word: "Weekly",
		triggers: [
			{ parameter: "pH", sites: ["SITE-1"] },
		],
		date_format: "fixed",
	},
];

// Monkey‑patch loadPatterns
// @ts-ignore – we know this is a test and we want to override the method
GenerateNames.prototype.loadPatterns = async function () {
	await Promise.resolve(); // simulate async delay
	return mockPatterns;
};

// --- Tests ---------------------------------------------------------------

Deno.test("GenerateNames: fails when data is missing", async () => {
	const component = new GenerateNames();
	const input = new Map<string, unknown>([
		["patternPath", "some/path/patterns.yaml"],
	]);

	const result = await component.process(input);

	assert(!result.success);
	assert(
		result.error.includes(
			"Missing or invalid 'parsedData' (must be ParsedData[])",
		),
	);
});

Deno.test("GenerateNames: fails when patternPath is missing", async () => {
	const component = new GenerateNames();
	const input = new Map<string, unknown>([
		["parsedData", makeParsedData()],
		["filePairs", makeFilePair()],
	]);

	const result = await component.process(input);

	assert(!result.success);

	assert(result.error.includes("Missing or invalid 'patternPath'"));
});

Deno.test("GenerateNames: succeeds with valid data + patterns", async () => {
	const component = new GenerateNames();
	const input = new Map<string, unknown>([
		["parsedData", makeParsedData()],
		["patternPath", "fake/path.yaml"],
		["filePairs", makeFilePair()],
	]);

	const result = await component.process(input);
	if (!result.success) {
		console.error("Error:", result.error);
	}
	assert(result.success);

	const named = result.value.get("namedFiles") as NamedFile[];
	assertEquals(named.length, 1);

	assertEquals(named[0].typeCode, "P");
	assertEquals(named[0].typeWord, "Weekly");
	assertEquals(named[0].reason.includes("pH Pattern"), true);
});

Deno.test("GenerateNames: falls back to Unknown when no pattern matches", async () => {
	const component = new GenerateNames();

	// Override mock to return no matching triggers
	// @ts-ignore – we know this is a test and we want to override the method
	GenerateNames.prototype.loadPatterns = async function () {
		await Promise.resolve();
		return [
			{
				name: "Other Pattern",
				code: "Z",
				type_word: "Zeta",
				triggers: [
					{ parameter: "NotPH", sites: ["SITE-99"] },
				],
				date_format: "fixed",
			},
		];
	};

	const input = new Map<string, unknown>([
		["parsedData", makeParsedData()],
		["patternPath", "fake/path.yaml"],
		["filePairs", makeFilePair()],
	]);

	const result = await component.process(input);

	if (!result.success) {
		console.error("Error:", result.error);
	}
	assert(result.success);

	const named = result.value.get("namedFiles") as NamedFile[];
	assertEquals(named[0].typeCode, "X"); // Unknown
	assertEquals(named[0].typeWord, "Unknown");
	assertEquals(named[0].reason.includes("Unknown"), true);
});
