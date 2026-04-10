// src/components/ParseExcelFiles.test.ts
import "../test_globals.ts";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { ParseExcelFiles } from "./ParseExcelFiles.ts";
import { __setImportSheetMock } from "../utils/sheet.ts";
import { ParsedData } from "../core/types.ts";

// --- Mocks -------------------------------------------------------------

// Mock Deno.readFile to avoid filesystem access
// @ts-ignore - override global Deno for testing
Deno.readFile = async (_path: string) => {
	await Promise.resolve(); // simulate async delay
	return new Uint8Array([1, 2, 3, 4]); //as unknown as Uint8Array;
};

// Mock importSheet from @psych/sheet
const mockImportSheet = async <T>(
	_buf: ArrayBuffer,
	_type: string,
): Promise<T[]> => {
	await Promise.resolve(); // simulate async delay
	return __MOCK_ROWS__ as T[];
};
__setImportSheetMock(mockImportSheet);
// --- Helpers -------------------------------------------------------------
function normalizeSheet(
	raw: Record<string, unknown>[],
): Record<string, unknown>[] {
	return raw.map((row) => {
		const normalized: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(row)) {
			if (key === "__EMPTY") {
				normalized["A"] = value;
			} else if (key.startsWith("__EMPTY_")) {
				const index = Number(key.replace("__EMPTY_", ""));
				normalized[String.fromCharCode(65 + index)] = value; // 65 = 'A'
			} else {
				normalized[key] = value;
			}
		}

		return normalized;
	});
}

function makeRows({
	samples = 2,
	parameters = [{ name: "pH", unit: "SU", values: ["7.1", "7.3"] }],
}: {
	samples?: number;
	parameters?: { name: string; unit: string; values: string[] }[];
}) {
	const rows: Record<string, unknown>[] = [];

	// Sample ID row
	const sampleIdRow: Record<string, unknown> = { "__EMPTY": "Sample ID" };
	for (let i = 0; i < samples; i++) {
		sampleIdRow[`__EMPTY_${i + 2}`] = `SITE-${i + 1}`;
	}
	rows.push(sampleIdRow);

	// Sampled By
	const sampledByRow: Record<string, unknown> = { "__EMPTY": "Sampled By" };
	for (let i = 0; i < samples; i++) {
		sampledByRow[`__EMPTY_${i + 2}`] = `Tech ${i + 1}`;
	}
	rows.push(sampledByRow);

	// Sample Collection Date
	const dateRow: Record<string, unknown> = {
		"__EMPTY": "Sample Collection Date",
	};
	for (let i = 0; i < samples; i++) {
		dateRow[`__EMPTY_${i + 2}`] = `2024-01-0${i + 1}`;
	}
	rows.push(dateRow);

	// Laboratory Order Number
	const jobRow: Record<string, unknown> = {
		"__EMPTY": "Laboratory Order Number",
	};
	for (let i = 0; i < samples; i++) {
		jobRow[`__EMPTY_${i + 2}`] = `762-8118-${i + 1}`;
	}
	rows.push(jobRow);

	// Parameter header
	rows.push({
		"__EMPTY": "Parameter",
		"__EMPTY_1": "Reporting Units",
	});

	// Parameter rows
	for (const param of parameters) {
		const row: Record<string, unknown> = {
			"__EMPTY": param.name,
			"__EMPTY_1": param.unit,
		};
		for (let i = 0; i < samples; i++) {
			row[`__EMPTY_${i + 2}`] = param.values[i] ?? "";
		}
		rows.push(row);
	}

	// Add Notes row to stop parameter parsing
	rows.push({ "__EMPTY": "Notes:" });

	//console.log("Mock rows created:", rows);
	return rows;
}

// --- Tests --------------------------------------------------------------

Deno.test("ParseExcelFiles: succeeds with valid sheet", async () => {
	__MOCK_ROWS__ = makeRows({});

	// 🔍 Add this line right here
	console.log("MOCK ROWS:", __MOCK_ROWS__);

	const component = new ParseExcelFiles();
	const input = new Map<string, unknown>([
		["filePairs", [{ excelPath: "/fake/path.xlsx" }]],
	]);

	const result = await component.process(input);
	/*
	console.log(
		`Result is '${
			result.success
				? `success', with value -> ${result.value}`
				: `failure', with error -> ${result.error}`
		}`,
	);
  */
	assert(result.success);
	const parsed = result.value.get("parsedData") as ParsedData[];

	assertEquals(parsed.length, 1);
	assertEquals(parsed[0].samples.length, 2);
	assertEquals(parsed[0].samples[0].measurements.length, 1);
});

Deno.test("ParseExcelFiles: fails when filePairs missing", async () => {
	const component = new ParseExcelFiles();
	const input = new Map<string, unknown>();

	const result = await component.process(input);

	assert(!result.success);
	assert(result.error.includes("Missing required field: filePairs"));
});

Deno.test("ParseExcelFiles: fails when sheet is empty", async () => {
	__MOCK_ROWS__ = [];

	const component = new ParseExcelFiles();
	const input = new Map<string, unknown>([
		["filePairs", [{ excelPath: "/fake/path.xlsx" }]],
	]);

	const result = await component.process(input);

	assert(!result.success);
	assert(result.error.includes("Sheet is empty"));
});

Deno.test("ParseExcelFiles: fails when missing Sample ID row", async () => {
	__MOCK_ROWS__ = [
		{ "__EMPTY": "Not Sample ID" },
	];

	const component = new ParseExcelFiles();
	const input = new Map<string, unknown>([
		["filePairs", [{ excelPath: "/fake/path.xlsx" }]],
	]);

	const result = await component.process(input);

	assert(!result.success);
	assert(result.error.includes("Failed to parse sheet structure"));
});

Deno.test("ParseExcelFiles: fails validation when sample has no measurements", async () => {
	__MOCK_ROWS__ = makeRows({
		parameters: [], // no parameters → no measurements
	});

	const component = new ParseExcelFiles();
	const input = new Map<string, unknown>([
		["filePairs", [{ excelPath: "/fake/path.xlsx" }]],
	]);

	const result = await component.process(input);

	assert(!result.success);
	assert(result.error.includes("Ragnarok Failure"));
});
