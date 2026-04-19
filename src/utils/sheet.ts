import { importSheet as realImportSheet, ImportTypes } from "@psych/sheet";

/** @internal */
export let importSheet = realImportSheet;
export { ImportTypes };

/**
 * @description Replaces the sheet‑import function for testing.
 * @internal
 */
export function __setImportSheetMock(fn: typeof realImportSheet) {
	importSheet = fn;
}
