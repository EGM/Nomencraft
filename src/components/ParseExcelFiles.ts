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
 * const p = new ParseExcelFiles();
 * const board = new Map([["filePairs", [{ excelPath: "/path/to/file.xlsx" }]]]);
 * const result = await p.process(board);
 */
export class ParseExcelFiles extends BaseComponent {
	/** @description Registers the component name with the BaseComponent lifecycle. */
	constructor() {
		super("ParseExcelFiles");
	}

	/** @description Validates filePairs, parses each Excel file, and writes parsedData to the blackboard. */
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

	/** @description Reads, imports, parses, and validates a single Excel file. */
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

	/** @description Extracts a cell value using normalized or raw Excel placeholder keys. */
	private getVal(row: Record<string, unknown>, colIndex: number): string {
		const letterKey = String.fromCharCode(65 + colIndex);
		if (row[letterKey] !== undefined) {
			return row[letterKey]?.toString() || "";
		}

		const key = colIndex === 0 ? "__EMPTY" : `__EMPTY_${colIndex}`;
		return row[key]?.toString() || "";
	}

	/** @description Parses worksheet rows into structured ParsedData. */
	private parseSheet(
		rows: Record<string, unknown>[],
	): ParsedData | null {
		const sampleIdRowIdx = rows.findIndex((r) =>
			this.getVal(r, 0).toLowerCase() === "sample id"
		);

		if (sampleIdRowIdx === -1) {
			this.emitWarning("Could not find 'Sample ID' row");
			return null;
		}

		const sampleIdRow = rows[sampleIdRowIdx];

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

		const findRow = (label: string) =>
			rows.findIndex((r) =>
				this.getVal(r, 0).toLowerCase() === label.toLowerCase()
			);

		const sampledByRow = rows[findRow("sampled by")] || {};
		const dateRow = rows[findRow("sample collection date")] || {};
		const jobRow = rows[findRow("laboratory order number")] || {};

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

		const firstSample = samples[0];
		const jobId = firstSample.id;

		return {
			job_id: jobId,
			sample_date: firstSample.date,
			type_code: "X",
			samples,
		};
	}

	/** @description Validates parsed data for required measurements and duplicate entries. */
	private validate(data: ParsedData): string | null {
		for (const sample of data.samples) {
			if (sample.measurements.length === 0) {
				return `Ragnarok Failure: Sample '${sample.id}' (${sample.site}) has no measurements.`;
			}
		}

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
