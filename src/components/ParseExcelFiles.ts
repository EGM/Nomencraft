// src/components/ParseExcelFiles.ts

import { importSheet, ImportTypes } from "../utils/sheet.ts";
import { BaseComponent } from "../core/BaseComponent.ts";
import type {
	FilePair,
	Measurement,
	ParsedData,
	Result,
	Sample,
} from "../core/types.ts";

/**
 * @intent
 *   Parse all Excel files listed in `filePairs` and extract structured
 *   laboratory sample data (samples, measurements, metadata).
 *
 * @input
 *   - Map<string, unknown> (blackboard)
 *   - Required keys:
 *       - "filePairs": Array<{ excelPath: string }>
 *
 * @output
 *   - Mutates blackboard by setting:
 *       - "parsedData": ParsedData[]
 *
 * @decision
 *   - Hard failures use this.failed(), which throws and stops the pipeline.
 *   - Soft failures use emitWarning(), which logs but continues.
 *   - Missing or malformed sheets produce hard failures.
 *   - Missing metadata rows produce warnings and return null for that file.
 *
 * @future
 *   - Consider parallelizing file parsing for performance.
 *   - Consider caching parsed sheets for debugging or replay.
 *
 * @ai
 *   - Invariants:
 *       - ParsedData must contain at least one sample.
 *       - Each sample must contain at least one measurement.
 *       - Sheet structure is assumed to follow the UDS template.
 */
export class ParseExcelFiles extends BaseComponent {
	constructor() {
		super("ParseExcelFiles");
	}

	/**
	 * TODO: Describe the process method.
	 * @param input - {Map<string, unknown>}
	 * @returns Promise<Result<Map<string, unknown>, Map<string, unknown>>>
	 */
	async process(
		input: Map<string, unknown>,
	): Promise<Result<Map<string, unknown>, Map<string, unknown>>> {
		this.started();
		//console.log("ParseExcelFiles received input:",Object.fromEntries(input.entries()),);

		try {
			const filePairs = input.get("filePairs");
			if (!filePairs || !Array.isArray(filePairs)) {
				this.failed("Missing required field: filePairs");
			}

			const parsedResults: ParsedData[] = [];

			for (const pair of filePairs as FilePair[]) {
				if (!pair.excelPath) {
					this.emitWarning("Skipping file pair with no excelPath");
					continue;
				}

				const parsed = await this.parseFile(pair.excelPath);
				if (parsed) parsedResults.push(parsed);
			}

			input.set("parsedData", parsedResults);

			this.finished();
			return { success: true, value: input };
		} catch (err) {
			this.emitError({ failed: this.name, error: err });
			return {
				success: false,
				input,
				error: String(err),
			};
		}
	}

	/**
	 * Parse a single Excel file into structured ParsedData.
	 * @param filePath - {string}
	 * @returns Promise<any>
	 */
	private async parseFile(filePath: string): Promise<ParsedData | null> {
		this.emitDebug(`Parsing Excel file: ${filePath}`);

		try {
			const fileBuffer = await Deno.readFile(filePath);
			const arrayBuffer = fileBuffer.buffer.slice(
				fileBuffer.byteOffset,
				fileBuffer.byteOffset + fileBuffer.byteLength,
			);

			const rows = await importSheet(arrayBuffer, "xlsx" as ImportTypes);

			if (rows.length === 0) {
				this.failed("Sheet is empty");
			}

			const parsed = this.parseSheet(rows);
			if (!parsed) {
				this.failed(
					"Failed to parse sheet structure (missing headers)",
				);
			}

			const validationError = this.validate(parsed);
			if (validationError) {
				this.failed(validationError);
			}

			this.emitDebug(
				`Parsed ${parsed.samples.length} samples with ${
					parsed.samples.reduce((acc, s) =>
						acc + s.measurements.length, 0)
				} total measurements`,
			);

			return parsed;
		} catch (err) {
			this.failed(err);
		}
	}

	/**
	 * Extract a cell value by column index.
	 * Excel import uses "__EMPTY", "__EMPTY_1", "__EMPTY_2", etc.
	 */
	/*
	private getVal(row: Record<string, unknown>, colIndex: number): string {
		const key = colIndex === 0 ? "__EMPTY" : `__EMPTY_${colIndex}`;
		return row[key]?.toString() || "";
	}
	*/
	private getVal(row: Record<string, unknown>, colIndex: number): string {
		// Try letter-based keys first (after normalization)
		const letterKey = String.fromCharCode(65 + colIndex); // 0=A, 1=B, 2=C
		if (row[letterKey] !== undefined) {
			return row[letterKey]?.toString() || "";
		}

		// Fall back to __EMPTY_N format (raw import)
		const key = colIndex === 0 ? "__EMPTY" : `__EMPTY_${colIndex}`;
		return row[key]?.toString() || "";
	}

	/**
	 * Parse the sheet into structured sample + measurement data.
	 * Returns null on soft structural failures.
	 */
	private parseSheet(
		rows: Record<string, unknown>[],
	): ParsedData | null {
		// 1. Locate "Sample ID" row
		const sampleIdRowIdx = rows.findIndex((r) =>
			this.getVal(r, 0).toLowerCase() === "sample id"
		);

		if (sampleIdRowIdx === -1) {
			this.emitWarning("Could not find 'Sample ID' row");
			return null;
		}

		const sampleIdRow = rows[sampleIdRowIdx];

		// 2. Determine number of samples
		let maxCol = 0;
		for (const key of Object.keys(sampleIdRow)) {
			const match = key.match(/__EMPTY_(\d+)/);
			if (match) {
				const colNum = parseInt(match[1]);
				if (colNum > maxCol) maxCol = colNum;
			}
		}

		const numSamples = maxCol >= 2 ? maxCol - 1 : 0;
		if (numSamples <= 0) {
			this.emitWarning(`No sample columns found (maxCol: ${maxCol})`);
			return null;
		}

		this.emitDebug(
			`Found ${numSamples} sample columns (indices 2 to ${maxCol})`,
		);

		// 3. Helper to find rows by label
		const findRow = (label: string) =>
			rows.findIndex((r) =>
				this.getVal(r, 0).toLowerCase() === label.toLowerCase()
			);

		// 4. Extract metadata rows
		const sampledByRow = rows[findRow("sampled by")] || {};
		const dateRow = rows[findRow("sample collection date")] || {};
		const jobRow = rows[findRow("laboratory order number")] || {};

		// 5. Build sample objects
		const samples: Sample[] = [];
		for (let i = 0; i < numSamples; i++) {
			const colIndex = i + 2;

			samples.push({
				id: this.getVal(jobRow, colIndex),
				site: this.getVal(sampleIdRow, colIndex),
				date: this.getVal(dateRow, colIndex),
				sampledBy: this.getVal(sampledByRow, colIndex),
				measurements: [],
			});
		}

		// 6. Parse parameters + measurements
		const paramStartIdx = rows.findIndex((r) =>
			this.getVal(r, 0).toLowerCase() === "parameter" &&
			this.getVal(r, 1).toLowerCase() === "reporting units"
		);

		if (paramStartIdx === -1) {
			this.emitWarning("Could not find 'Parameter, Reporting Units' row");
			return null;
		}

		for (let i = paramStartIdx + 1; i < rows.length; i++) {
			const row = rows[i];
			const firstCell = this.getVal(row, 0).toLowerCase();

			if (firstCell.startsWith("notes:")) break;
			if (!firstCell) continue;
			if (firstCell.includes("wet chemistry")) continue;

			const paramName = this.getVal(row, 0);
			const unit = this.getVal(row, 1);

			for (let s = 0; s < samples.length; s++) {
				const colIndex = s + 2;
				const raw = this.getVal(row, colIndex);

				if (raw !== "") {
					samples[s].measurements.push({
						labId: samples[s].id,
						site: samples[s].site,
						parameter: paramName,
						unit,
						value: String(raw),
					});
				}
			}
		}

		// 7. Finalize
		const firstSample = samples[0];
		const jobId = firstSample.id;
		// ? firstSample.id.substring(0, firstSample.id.lastIndexOf("-"))	: "";

		return {
			job_id: jobId,
			sample_date: firstSample.date,
			type_code: "X",
			samples,
		};
	}

	/**
	 * Validation Rules
	 */
	private validate(data: ParsedData): string | null {
		// 1. Every sample must have at least one measurement
		for (const sample of data.samples) {
			if (sample.measurements.length === 0) {
				return `Ragnarok Failure: Sample '${sample.id}' (${sample.site}) has no measurements.`;
			}
		}

		// 2. No duplicate [labId, parameter] tuples
		const seen = new Set<string>();
		for (const sample of data.samples) {
			for (const m of sample.measurements) {
				const key = `${m.labId}|${m.parameter}`;
				if (seen.has(key)) {
					return `Duplicate measurement found: ${m.parameter} for sample ${m.labId}`;
				}
				seen.add(key);
			}
		}

		return null;
	}
}
