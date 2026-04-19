// src/components/ParseExcelFiles.structure.test.ts
// deno-lint-ignore-file no-explicit-any
import "../_meta/test_globals.ts";
import { assert, assertEquals } from "@std/assert";
import { ParseExcelFiles } from "./ParseExcelFiles.ts";
import { __setImportSheetMock } from "../utils/sheet.ts";

// --- Mock filesystem + sheet import -------------------------------------

// @ts-ignore - override global Deno for testing
Deno.readFile = async (_path: string) => {
	await Promise.resolve();
	return new Uint8Array();
};

const mockImportSheet = async <T>(
	_buf: ArrayBuffer,
	_type: string,
): Promise<T[]> => {
	await Promise.resolve();
	return __MOCK_ROWS__ as T[];
};

__setImportSheetMock(mockImportSheet);

// --- Helper to build a realistic sheet ----------------------------------

/**
 * @description Builds a mock worksheet structure simulating a real Excel import.
 */
function buildSheet() {
	return [
		// Sample ID row
		{
			"__EMPTY": "Sample ID",
			"__EMPTY_2": "SITE-A",
			"__EMPTY_3": "SITE-B",
		},

		// Sampled By
		{
			"__EMPTY": "Sampled By",
			"__EMPTY_2": "Tech 1",
			"__EMPTY_3": "Tech 2",
		},

		// Sample Collection Date
		{
			"__EMPTY": "Sample Collection Date",
			"__EMPTY_2": "2024-01-01",
			"__EMPTY_3": "2024-01-02",
		},

		// Laboratory Order Number
		{
			"__EMPTY": "Laboratory Order Number",
			"__EMPTY_2": "762-9000-1",
			"__EMPTY_3": "762-9000-2",
		},

		// Parameter header
		{ "__EMPTY": "Parameter", "__EMPTY_1": "Reporting Units" },

		// Parameter rows
		{
			"__EMPTY": "pH",
			"__EMPTY_1": "SU",
			"__EMPTY_2": "7.1",
			"__EMPTY_3": "7.3",
		},
		{
			"__EMPTY": "Turbidity",
			"__EMPTY_1": "NTU",
			"__EMPTY_2": "1.2",
			"__EMPTY_3": "1.5",
		},

		// Notes row (terminates parsing)
		{ "__EMPTY": "Notes:" },
	];
}

// --- Test ----------------------------------------------------------------

Deno.test("ParseExcelFiles: returns correct ParsedData[] structure", async () => {
	__MOCK_ROWS__ = buildSheet();

	const component = new ParseExcelFiles();
	const input = new Map<string, unknown>([
		["filePairs", [{ excelPath: "/fake/path.xlsx" }]],
	]);

	const result = await component.process(input);
	assert(result.success);

	const parsed = result.value.get("parsedData") as any[];
	assertEquals(parsed.length, 1);

	const job = parsed[0];

	// --- Top-level fields --------------------------------------------------
	assertEquals(job.job_id, "762-9000-1");
	assertEquals(job.sample_date, "2024-01-01");
	assertEquals(job.type_code, "X");

	// --- Samples -----------------------------------------------------------
	assertEquals(job.samples.length, 2);

	assertEquals(job.samples[0], {
		id: "762-9000-1",
		site: "SITE-A",
		date: "2024-01-01",
		sampledBy: "Tech 1",
		measurements: [
			{
				labId: "762-9000-1",
				site: "SITE-A",
				parameter: "pH",
				unit: "SU",
				value: "7.1",
			},
			{
				labId: "762-9000-1",
				site: "SITE-A",
				parameter: "Turbidity",
				unit: "NTU",
				value: "1.2",
			},
		],
	});

	assertEquals(job.samples[1], {
		id: "762-9000-2",
		site: "SITE-B",
		date: "2024-01-02",
		sampledBy: "Tech 2",
		measurements: [
			{
				labId: "762-9000-2",
				site: "SITE-B",
				parameter: "pH",
				unit: "SU",
				value: "7.3",
			},
			{
				labId: "762-9000-2",
				site: "SITE-B",
				parameter: "Turbidity",
				unit: "NTU",
				value: "1.5",
			},
		],
	});
});
