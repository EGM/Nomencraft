// src/components/ReadFilePairs.test.ts
import { assert, assertEquals } from "@std/assert";
import { ReadFilePairs } from "./ReadFilePairs.ts";
import * as path from "@std/path";
import { FilePair } from "../core/types.ts";

Deno.test("ReadFilePairs: pairs Excel and PDF files", async () => {
	const temp = Deno.makeTempDirSync({ prefix: "BRF_", suffix: "_tests" });

	// Create mock files
	const excel1 = path.join(temp, "123-4567-8_FLPivot.xlsx");
	const excel2 = path.join(temp, "555-9999-1_FLPivot.xlsx");

	const pdf1 = path.join(temp, "J4567-8 UDS Level 2 Report.pdf");
	const pdf2 = path.join(temp, "J9999-1 UDS Level 2 Report.pdf");

	// Write empty files
	for (const f of [excel1, excel2, pdf1, pdf2]) {
		Deno.writeTextFileSync(f, "");
	}

	const component = new ReadFilePairs();
	const input = new Map<string, unknown>([["dirPath", temp]]);

	const result = await component.process(input);

	assert(result.success);
	const out = result.value;
	const pairs = out.get("filePairs") as Array<FilePair>;
	assert(Array.isArray(pairs));
	assertEquals(pairs.length, 2);

	// Validate job IDs and matching
	const jobIds = pairs.map((p: FilePair) => p.jobId).sort();
	assertEquals(jobIds, ["123-4567-8", "555-9999-1"]);
});

Deno.test("ReadFilePairs: missing PDF produces undefined pdfPath", async () => {
	const temp = Deno.makeTempDirSync({ prefix: "BRF_", suffix: "_tests" });

	const excel = path.join(temp, "123-4567-8_FLPivot.xlsx");
	Deno.writeTextFileSync(excel, "");

	const component = new ReadFilePairs();
	const input = new Map<string, unknown>([["dirPath", temp]]);

	const result = await component.process(input);

	assert(result.success);
	const pairs = result.value.get("filePairs") as FilePair[];

	assertEquals(pairs.length, 1);
	assertEquals(pairs[0].jobId, "123-4567-8");
	assertEquals(pairs[0].pdfPath, undefined);
});

Deno.test("ReadFilePairs: fails when dirPath missing", async () => {
	const component = new ReadFilePairs();
	const input = new Map<string, unknown>(); // no dirPath

	const result = await component.process(input);

	// Component should not succeed
	assert(!result.success);

	// Error message should clearly mention dirPath
	assert(result.error.includes("dirPath"));
});

Deno.test("ReadFilePairs: fails when directory does not exist", async () => {
	const component = new ReadFilePairs();
	const input = new Map<string, unknown>([["dirPath", "/no/such/path"]]);

	const result = await component.process(input);

	// Component should not succeed
	assert(!result.success);
	assert(result.error.includes("Directory not found"));
});
