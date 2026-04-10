import { importSheet as realImportSheet, ImportTypes } from "@psych/sheet";

export let importSheet = realImportSheet;
export { ImportTypes };

// Allow tests to replace importSheet
export function __setImportSheetMock(fn: typeof realImportSheet) {
	importSheet = fn;
}
