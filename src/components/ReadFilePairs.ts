// src/components/ReadFilePairs.ts
import { existsSync } from "@std/fs";
import { BaseComponent } from "../core/BaseComponent.ts";
import type { PipelineComponent } from "../core/PipelineComponent.ts";
import type { FilePair, InputMap, OutputMap, Result } from "../core/types.ts";

/**
 * @name ReadFilePairs
 * @class
 * @extends BaseComponent
 * @implements {PipelineComponent<InputMap, OutputMap>}
 * @description Scans a directory for Excel and PDF files, extracts job IDs from Excel filenames,
 * and produces paired `FilePair` objects linking each Excel file to its corresponding PDF when available.
 *
 * NOTE: This component is intentionally impure — it interacts with the filesystem.
 * It produces *pure* FilePair objects containing only names, not paths.
 */
export class ReadFilePairs extends BaseComponent
	implements PipelineComponent<InputMap, OutputMap> {
	constructor() {
		super("ReadFilePairs");
	}

	override async process(
		input: InputMap,
	): Promise<Result<InputMap, OutputMap>> {
		this.started();

		try {
			const dirPath = input.get("inputDir");
			if (typeof dirPath !== "string") {
				this.failed("Missing or invalid 'inputDir' in input map");
			}

			const filePairs = await this.readPairsFromDirectory(
				dirPath as string,
			);

			input.set("filePairs", filePairs);

			this.finished();
			return { success: true, value: input };
		} catch (err) {
			this.emitError({ failed: this.name, error: err });
			return { success: false, input, error: String(err) };
		}
	}

	/** This is the function responsible for selecting the files to read, read the selected files, and pairing them. */
	private async readPairsFromDirectory(dirPath: string): Promise<FilePair[]> {
		this.emitDebug(`Scanning directory: ${dirPath}`);

		if (!existsSync(dirPath)) {
			this.failed(`Directory not found: ${dirPath}`);
		}

		const excelNames: string[] = [];
		const pdfNames: string[] = [];

		for await (const entry of Deno.readDir(dirPath)) {
			if (!entry.isFile) continue;

			const name = entry.name;

			if (this.matches(name, "*_FLPivot.xlsx")) {
				excelNames.push(name);
			} else if (
				this.matches(name, "*UDS Level 2 Report Final Report.pdf")
			) {
				pdfNames.push(name);
			}
		}

		this.emitDebug(
			`Found ${excelNames.length} Excel and ${pdfNames.length} PDF files`,
		);

		// Map jobId → pdfName (but jobId comes ONLY from Excel)
		const pdfMap = new Map<string, string>();

		for (const pdfName of pdfNames) {
			// We do NOT extract job IDs from PDFs anymore.
			// PDFs are matched only if their jobId matches an Excel jobId.
			// So we temporarily store them by name and match later.
			pdfMap.set(this.extractJobIdPdf(pdfName), pdfName);
		}

		const pairs: FilePair[] = [];

		for (const excelName of excelNames) {
			const jobId = this.extractJobId(excelName);

			if (!jobId) {
				this.emitWarning(`Could not extract Job ID from: ${excelName}`);
				continue;
			}

			// Find a PDF whose name contains the jobId
			/*
			const pdfName = [...pdfMap.keys()].find((pdf) =>
				pdf.includes(jobId)
			);
			*/
			const pdfName = pdfMap.get(this.partialId(jobId));

			pairs.push({
				jobId,
				excelName,
				pdfName,
			});

			if (!pdfName) {
				this.emitWarning(`No matching PDF for Job ID: ${jobId}`);
			}
		}

		this.emitDebug(`Processed ${pairs.length} file pairs`);
		return pairs;
	}

	private matches(filename: string, pattern: string): boolean {
		const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$", "i");
		return regex.test(filename);
	}

	/**
	 * Extracts job ID ONLY from Excel filenames.
	 * Example: "762-7832-1_FLPivot.xlsx" → "762-7832-1"
	 */
	private extractJobId(filename: string): string | null {
		const excelMatch = filename.match(
			/^(\d{3}-\d{4,5}-\d)_FLPivot\.xlsx$/i,
		);

		return excelMatch ? excelMatch[1] : null;
	}
	private extractJobIdPdf(filename: string): string {
		const pdfMatch = filename.match(
			/^J(\d{4,5}-\d) UDS Level 2 Report Final Report\.pdf$/i,
		);

		return pdfMatch ? pdfMatch[1] : filename;
	}
	private partialId(jobId: string): string {
		const idMatch = jobId.match(
			/^\d{3}-(\d{4,5}-\d)$/i,
		);

		return idMatch ? idMatch[1] : jobId;
	}
}
