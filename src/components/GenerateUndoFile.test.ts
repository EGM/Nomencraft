// components/GenerateUndoFile.test.ts

import { assert, assertEquals } from "@std/assert";
import { GenerateUndoFile } from "./GenerateUndoFile.ts";
import type { FilePair, NamedFile } from "../core/types.ts";

Deno.test("GenerateUndoFile - no PDFs", async () => {
	const component = new GenerateUndoFile();

	const filePairs: FilePair[] = [
		{
			jobId: "762-8118-1",
			excelName: "a.xlsx",
		},
	];

	const namedFiles: NamedFile[] = [
		{
			newExcelName: "a_new.xlsx",
			typeCode: "A",
			typeWord: "Annual",
			reason: "Test",
		},
	];

	const input = new Map<string, unknown>([
		["filePairs", filePairs],
		["namedFiles", namedFiles],
	]);

	const result = await component.process(input);

	assert(result.success);
	const undoEntries = result.value.get("undoEntries") as unknown[];

	assert(Array.isArray(undoEntries));
	assertEquals(undoEntries.length, 1);

	const entry = undoEntries[0] as any;
	assertEquals(entry.jobId, "762-8118-1");
	assertEquals(entry.excel.originalName, "a.xlsx");
	assertEquals(entry.excel.newName, "a_new.xlsx");
	assertEquals(entry.pdf, undefined);
});

Deno.test("GenerateUndoFile - mixed PDFs", async () => {
	const component = new GenerateUndoFile();

	const filePairs: FilePair[] = [
		{
			jobId: "762-8118-1",
			excelName: "a.xlsx",
		},
		{
			jobId: "762-8118-2",
			excelName: "b.xlsx",
			pdfName: "b.pdf",
		},
	];

	const namedFiles: NamedFile[] = [
		{
			newExcelName: "a_new.xlsx",
			typeCode: "A",
			typeWord: "Annual",
			reason: "Test",
		},
		{
			newExcelName: "b_new.xlsx",
			newPdfName: "b_new.pdf",
			typeCode: "D",
			typeWord: "Daily",
			reason: "Test",
		},
	];

	const input = new Map<string, unknown>([
		["filePairs", filePairs],
		["namedFiles", namedFiles],
	]);

	const result = await component.process(input);

	assert(result.success);
	const undoEntries = result.value.get("undoEntries") as unknown[];

	assert(Array.isArray(undoEntries));
	assertEquals(undoEntries.length, 2);

	const first = undoEntries[0] as any;
	assertEquals(first.jobId, "762-8118-1");
	assertEquals(first.excel.originalName, "a.xlsx");
	assertEquals(first.excel.newName, "a_new.xlsx");
	assertEquals(first.pdf, undefined);

	const second = undoEntries[1] as any;
	assertEquals(second.jobId, "762-8118-2");
	assertEquals(second.excel.originalName, "b.xlsx");
	assertEquals(second.excel.newName, "b_new.xlsx");
	assertEquals(second.pdf.originalName, "b.pdf");
	assertEquals(second.pdf.newName, "b_new.pdf");
});

Deno.test("GenerateUndoFile - mismatched lengths fails", async () => {
	const component = new GenerateUndoFile();

	const filePairs: FilePair[] = [
		{
			jobId: "762-8118-1",
			excelName: "a.xlsx",
		},
	];

	const namedFiles: NamedFile[] = [
		{
			newExcelName: "a_new.xlsx",
			typeCode: "A",
			typeWord: "Annual",
			reason: "Test",
		},
		{
			newExcelName: "extra.xlsx",
			typeCode: "X",
			typeWord: "Extra",
			reason: "Should fail",
		},
	];

	const input = new Map<string, unknown>([
		["filePairs", filePairs],
		["namedFiles", namedFiles],
	]);

	const result = await component.process(input);

	assert(!result.success);
	assert(
		String(result.error).includes(
			"filePairs (1) and namedFiles (2) must match 1:1",
		),
	);
});
