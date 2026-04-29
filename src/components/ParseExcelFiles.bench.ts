// src/components/ParseExcelFiles.bench.ts

import { ParseExcelFiles } from "./ParseExcelFiles.ts";
import { __setImportSheetMock } from "../utils/sheet.ts";

// --- Mock Deno.readFile (same as tests) ---
Deno.readFile = async () => new Uint8Array([1, 2, 3, 4]);

// --- Mock importSheet (same as tests) ---
let __MOCK_ROWS__: Record<string, unknown>[] = [];

const mockImportSheet = async <T>(
  _buf: ArrayBuffer,
  _type: string,
): Promise<T[]> => {
  return __MOCK_ROWS__ as T[];
};
__setImportSheetMock(mockImportSheet);

// --- Synthetic rows (copied from tests) ---
function makeRows() {
  return [
    { "__EMPTY": "Sample ID", "__EMPTY_2": "SITE-1", "__EMPTY_3": "SITE-2" },
    { "__EMPTY": "Sampled By", "__EMPTY_2": "Tech 1", "__EMPTY_3": "Tech 2" },
    {
      "__EMPTY": "Sample Collection Date",
      "__EMPTY_2": "2024-01-01",
      "__EMPTY_3": "2024-01-02",
    },
    {
      "__EMPTY": "Laboratory Order Number",
      "__EMPTY_2": "762-8118-1",
      "__EMPTY_3": "762-8118-2",
    },
    { "__EMPTY": "Parameter", "__EMPTY_1": "Reporting Units" },
    {
      "__EMPTY": "pH",
      "__EMPTY_1": "SU",
      "__EMPTY_2": "7.1",
      "__EMPTY_3": "7.3",
    },
    { "__EMPTY": "Notes:" },
  ];
}

// --- Benchmark Setup ---
const component = new ParseExcelFiles();

const input = new Map<string, unknown>([
  ["inputDir", "/fake"],
  ["filePairs", [{ jobId: "762-8118-1", excelName: "path.xlsx" }]],
]);

// --- Benchmarks ---
Deno.bench("ParseExcelFiles basic", async () => {
  __MOCK_ROWS__ = makeRows();
  await component.process(input);
});

Deno.bench({
  name: "ParseExcelFiles repeated",
  group: "ParseExcelFiles",
  baseline: true,
  async fn() {
    __MOCK_ROWS__ = makeRows();
    for (let i = 0; i < 10; i++) {
      await component.process(input);
    }
  },
});

Deno.bench({
  name: "ParseExcelFiles varied",
  group: "ParseExcelFiles",
  async fn() {
    __MOCK_ROWS__ = makeRows().map((row) => ({ ...row }));
    await component.process(input);
  },
});
