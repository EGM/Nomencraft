import { importSheet as realImportSheet, ImportTypes } from "@psych/sheet";

export let importSheet = realImportSheet;
export { ImportTypes };

// Allow tests to replace importSheet
/**
 * TODO: Describe the __setImportSheetMock function.
 * @param fn - {any}
 */
export function __setImportSheetMock(fn: typeof realImportSheet) {
	importSheet = fn;
}
