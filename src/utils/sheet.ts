import { importSheet as realImportSheet, ImportTypes } from "@psych/sheet";

export let importSheet = realImportSheet;
export { ImportTypes };

/**
 * @description Replaces the sheet‑import function for testing.
 */
export function __setImportSheetMock(fn: typeof realImportSheet) {
	importSheet = fn;
}
