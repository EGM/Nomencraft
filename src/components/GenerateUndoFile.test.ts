// tests/GenerateUndoFile.test.ts

import { assertEquals } from "@std/assert";
import { GenerateUndoFile } from "./GenerateUndoFile.ts";
import type { NamedFile } from "../core/types.ts";
import * as path from "@std/path";

Deno.test("GenerateUndoFile - no PDFs", () => {
	const component = new GenerateUndoFile();

	const namedFiles: NamedFile[] = [
		{
			originalPath: "/tmp/a.xlsx",
			newPath: "/tmp/a_new.xlsx",
			typeCode: "A",
			typeWord: "Annual",
			reason: "Test",
		},
	];

	const csv = (component as GenerateUndoFile)
		// @ts-ignore - testing private method
		.buildUndoCsv(namedFiles);

	const expected = [
		`"path","original","new"`,
		`"${path.resolve("/tmp")}","a.xlsx","a_new.xlsx"`,
	].join("\n");

	assertEquals(csv, expected);
});

Deno.test("GenerateUndoFile - mixed PDFs", () => {
	const component = new GenerateUndoFile();

	const namedFiles: NamedFile[] = [
		{
			originalPath: "/tmp/a.xlsx",
			newPath: "/tmp/a_new.xlsx",
			typeCode: "A",
			typeWord: "Annual",
			reason: "Test",
		},
		{
			originalPath: "/tmp/b.xlsx",
			newPath: "/tmp/b_new.xlsx",
			typeCode: "D",
			typeWord: "Daily",
			reason: "Test",
			pdfPath: "/tmp/b.pdf",
			pdfNewName: "b_new.pdf",
		},
	];

	const csv = (component as GenerateUndoFile)
		// @ts-ignore - testing private method
		.buildUndoCsv(namedFiles);

	const expected = [
		`"path","original","new","pdfOriginal","pdfNew"`,
		`"${path.resolve("/tmp")}","a.xlsx","a_new.xlsx","",""`,
		`"${path.resolve("/tmp")}","b.xlsx","b_new.xlsx","b.pdf","b_new.pdf"`,
	].join("\n");

	assertEquals(csv, expected);
});

Deno.test("GenerateUndoFile - quoting paths with spaces", () => {
	const component = new GenerateUndoFile();

	const namedFiles: NamedFile[] = [
		{
			originalPath: "/tmp/folder with space/a.xlsx",
			newPath: "/tmp/folder with space/a_new.xlsx",
			typeCode: "A",
			typeWord: "Annual",
			reason: "Test",
		},
	];

	const csv = (component as GenerateUndoFile)
		// @ts-ignore - testing private method
		.buildUndoCsv(namedFiles);

	const expected = [
		`"path","original","new"`,
		`"${path.resolve("/tmp/folder with space")}","a.xlsx","a_new.xlsx"`,
	].join("\n");

	assertEquals(csv, expected);
});
