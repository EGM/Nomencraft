// src/components/ParseExcelFiles.ts

import { importSheet, ImportTypes } from "../utils/sheet.ts";
import { BaseComponent } from "../core/BaseComponent.ts";
import type { FilePair, ParsedData, Result, Sample } from "../core/types.ts";

/**
 * @name ParseExcelFiles
 * @class
 * @extends BaseComponent
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description Parses all Excel files listed in `filePairs` and extract structured laboratory sample data (samples, measurements, metadata).
 * @intent Implements the core Excel‑to‑structured‑data transformation for the pipeline, enforcing strict validation rules and surfacing malformed sheets through controlled failures while allowing soft warnings for recoverable issues.
 * @ai Invariants:
 *   - ParsedData must contain at least one sample.
 *   - Each sample must contain at least one measurement.
 *   - Sheet structure is assumed to follow the UDS template.
 *   - Hard failures use this.failed(), which throws and stops the pipeline.
 *   - Soft failures use emitWarning(), which logs but continues.
 *   - Missing or malformed sheets produce hard failures.
 *   - Missing metadata rows produce warnings and return null for that file.
 * @see {@link BaseComponent} — lifecycle behavior
 * @see {@link Result} — structure returned by 'process()'
 * @see {@link importSheet} — raw sheet import mechanism
 * @example
 * ```typescript
 * const p = new ParseExcelFiles();
 * const board = new Map([["filePairs", [{ excelPath: "/path/to/file.xlsx" }]]]);
 * const result = await p.process(board);
 * ```
 */
export class ParseExcelFiles extends BaseComponent {
	/**
	 * @name constructor
	 * @constructor
	 * @access public
	 * @description Initializes the component and registers its name with the BaseComponent lifecycle system.
	 * @intent Ensures the component is identifiable in logs, lifecycle events, and error emissions.
	 */
	constructor() {
		super("ParseExcelFiles");
	}

	/**
	 * @name process
	 * @method
	 * @async
	 * @param {Map<string, unknown>} input
	 * @returns {Promise<Result<Map<string, unknown>, Map<string, unknown>>>}
	 * @access public
	 * @description Validates the `filePairs` input, parses each Excel file, collects all successfully parsed results, and writes the aggregated `parsedData` array back into the blackboard.
	 * @intent Acts as the orchestrator for file‑level parsing, ensuring each file is processed independently while maintaining consistent lifecycle and error‑handling behavior.
	 */
	async process(
		input: Map<string, unknown>,
	): Promise<Result<Map<string, unknown>, Map<string, unknown>>> {
		this.started();

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
	 * @name parseFile
	 * @method
	 * @async
	 * @param {string} filePath
	 * @returns {Promise<ParsedData | null>}
	 * @access private
	 * @description Reads an Excel file from disk, imports its sheet data, parses it into structured sample information, validates the result, and returns either a `ParsedData` object or null.
	 * @intent Encapsulates the full workflow for handling a single Excel file, isolating file I/O, sheet parsing, and validation so `process()` remains focused on orchestration.
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
	 * @name getVal
	 * @method
	 * @param {Record<string, unknown>} row
	 * @param {number} colIndex
	 * @returns {string}
	 * @access private
	 * @description Extracts a cell value from a row using either normalized letter‑based keys or raw `__EMPTY_n` keys.
	 * @intent Provides a unified access method that shields the rest of the parser from inconsistencies in sheet import formats.
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
	 * @name parseSheet
	 * @method
	 * @param {Record<string, unknown>[]} rows
	 * @returns {ParsedData | null}
	 * @access private
	 * @description Parses raw worksheet rows into structured sample metadata and measurement data, including sample IDs, sites, dates, and parameter values.
	 * @intent Implements the sheet‑level parsing logic that transforms loosely structured Excel rows into strongly typed ParsedData, handling missing rows, malformed structures, and termination conditions.
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
	 * @name validate
	 * @method
	 * @param {ParsedData} data
	 * @returns {string | null}
	 * @access private
	 * @description Applies validation rules to a parsed dataset, ensuring each sample has measurements and that no duplicate measurement tuples exist.
	 * @intent Prevents downstream components from receiving incomplete or contradictory data by enforcing structural integrity at the parsing stage.
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
