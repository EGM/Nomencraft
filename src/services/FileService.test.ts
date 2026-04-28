// src/services/FileService.test.ts
import { assert, assertEquals } from "@std/assert";
import { exists } from "@std/fs";
import {
	ActuationFile,
	FileService,
	FileServiceOptions,
} from "./FileService.ts";
import type { InputMap, OutputMap, Result } from "../core/types.ts";

function makeExcelOnly(
	excelSource: string,
	excelDest: string,
): ActuationFile {
	return {
		excelSource,
		excelDest,
		typeCode: "T",
		typeWord: "Test",
		reason: "Test file",
		newExcelName: excelDest.split("/").pop() ?? "dest.xlsx",
	};
}

Deno.test("FileService: fails when excelSource does not exist", async () => {
	const temp = Deno.makeTempDirSync({ prefix: "BRF_", suffix: "_tests" });

	const options: FileServiceOptions = {
		action: "move",
		files: [
			makeExcelOnly(`${temp}/missing.xlsx`, `${temp}/new.xlsx`),
		],
	};

	const fs = new FileService(options);
	const result: Result<InputMap, OutputMap> = await fs.run();

	assertEquals(result.success, false);
	assert(typeof fs.undoFilePath === "string");
	assert(await exists(fs.undoFilePath!));

	const undoText = await Deno.readTextFile(fs.undoFilePath!);
	const undoData = JSON.parse(undoText);

	assert(Array.isArray(undoData));
	assertEquals(undoData.length, 1);

	const entry = undoData[0];
	assertEquals(entry.action, "noop");
	assertEquals(entry.excel.from, `${temp}/missing.xlsx`);
});

Deno.test("FileService: move succeeds and file is moved", async () => {
	const temp = Deno.makeTempDirSync({ prefix: "BRF_", suffix: "_tests" });

	const original = `${temp}/source.txt`;
	const target = `${temp}/moved.txt`;
	await Deno.writeTextFile(original, "hello world");

	const options: FileServiceOptions = {
		action: "move",
		files: [makeExcelOnly(original, target)],
	};

	const fs = new FileService(options);
	const result: Result<InputMap, OutputMap> = await fs.run();

	assertEquals(result.success, true);

	const fsResults = result.value.get("fsResults");
	assert(Array.isArray(fsResults));
	assertEquals(fsResults.length, 1);
	assertEquals(fsResults[0].success, true);

	assertEquals(await exists(original), false);
	assertEquals(await exists(target), true);

	assert(typeof fs.undoFilePath === "string");
	assert(await exists(fs.undoFilePath!));

	const undoText = await Deno.readTextFile(fs.undoFilePath!);
	const undoData = JSON.parse(undoText);

	assertEquals(undoData.length, 1);
	const entry = undoData[0];

	assertEquals(entry.action, "move");
	assertEquals(entry.excel.from, target);
	assertEquals(entry.excel.to, original);
});

Deno.test("FileService: copy succeeds and original remains", async () => {
	const temp = Deno.makeTempDirSync({ prefix: "BRF_", suffix: "_tests" });

	const original = `${temp}/source.txt`;
	const target = `${temp}/copied.txt`;
	await Deno.writeTextFile(original, "hello world");

	const options: FileServiceOptions = {
		action: "copy",
		files: [makeExcelOnly(original, target)],
	};

	const fs = new FileService(options);
	const result: Result<InputMap, OutputMap> = await fs.run();

	assertEquals(result.success, true);

	const fsResults = result.value.get("fsResults");
	assert(Array.isArray(fsResults));
	assertEquals(fsResults.length, 1);
	assertEquals(fsResults[0].success, true);

	assertEquals(await exists(original), true);
	assertEquals(await exists(target), true);

	const undoText = await Deno.readTextFile(fs.undoFilePath!);
	const undoData = JSON.parse(undoText);

	assertEquals(undoData.length, 1);
	const entry = undoData[0];

	assertEquals(entry.action, "delete");
	assertEquals(entry.excel.from, target);
});

Deno.test("FileService: mixed batch — one valid, one missing", async () => {
	const temp = Deno.makeTempDirSync({ prefix: "BRF_", suffix: "_tests" });

	const originalA = `${temp}/a.txt`;
	const targetA = `${temp}/a_moved.txt`;
	await Deno.writeTextFile(originalA, "A");

	const originalB = `${temp}/missing.txt`;
	const targetB = `${temp}/missing_moved.txt`;

	const options: FileServiceOptions = {
		action: "move",
		files: [
			makeExcelOnly(originalA, targetA),
			makeExcelOnly(originalB, targetB),
		],
	};

	const fs = new FileService(options);
	const result: Result<InputMap, OutputMap> = await fs.run();

	assertEquals(result.success, false);

	assertEquals(await exists(originalA), false);
	assertEquals(await exists(targetA), true);
	assertEquals(await exists(originalB), false);
	assertEquals(await exists(targetB), false);

	const undoText = await Deno.readTextFile(fs.undoFilePath!);
	const undoData = JSON.parse(undoText);

	assertEquals(undoData.length, 2);

	const [undoA, undoB] = undoData;

	assertEquals(undoA.action, "move");
	assertEquals(undoA.excel.from, targetA);
	assertEquals(undoA.excel.to, originalA);

	assertEquals(undoB.action, "noop");
	assertEquals(undoB.excel.from, originalB);
});

Deno.test("FileService: undo file preserves ordering", async () => {
	const temp = Deno.makeTempDirSync({ prefix: "BRF_", suffix: "_tests" });

	const a = `${temp}/a.txt`;
	const a2 = `${temp}/a2.txt`;
	const b = `${temp}/b.txt`;
	const b2 = `${temp}/b2.txt`;

	await Deno.writeTextFile(a, "A");
	await Deno.writeTextFile(b, "B");

	const options: FileServiceOptions = {
		action: "move",
		files: [
			makeExcelOnly(a, a2),
			makeExcelOnly(b, b2),
		],
	};

	const fs = new FileService(options);
	const result: Result<InputMap, OutputMap> = await fs.run();

	assertEquals(result.success, true);

	const undoText = await Deno.readTextFile(fs.undoFilePath!);
	const undoData = JSON.parse(undoText);

	assertEquals(undoData.length, 2);
	assertEquals(undoData[0].excel.from, a2);
	assertEquals(undoData[1].excel.from, b2);
});

Deno.test("FileService: undo reverses a successful move", async () => {
	const temp = Deno.makeTempDirSync({ prefix: "BRF_", suffix: "_tests" });

	const original = `${temp}/source.txt`;
	const target = `${temp}/moved.txt`;
	await Deno.writeTextFile(original, "hello world");

	const options: FileServiceOptions = {
		action: "move",
		files: [makeExcelOnly(original, target)],
	};

	const fs = new FileService(options);
	const result: Result<InputMap, OutputMap> = await fs.run();

	assertEquals(result.success, true);
	assertEquals(await exists(original), false);
	assertEquals(await exists(target), true);

	const undoText = await Deno.readTextFile(fs.undoFilePath!);
	const undoData = JSON.parse(undoText);
	const entry = undoData[0];

	assertEquals(entry.action, "move");
	await Deno.rename(entry.excel.from, entry.excel.to);

	assertEquals(await exists(original), true);
	assertEquals(await exists(target), false);
});
