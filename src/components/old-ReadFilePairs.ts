// src/components/ReadFilePairs.ts
import { basename, join } from "@std/path";
import { existsSync } from "@std/fs";
import { BaseComponent } from "../core/BaseComponent.ts";
import type { PipelineComponent } from "../core/PipelineComponent.ts";
import type { FilePair, InputMap, OutputMap, Result } from "../core/types.ts";

/**
 * @name ReadFilePairs
 * @class
 * @extends BaseComponent
 * @implements {PipelineComponent<InputMap, OutputMap>}
 * @description Scans a directory for Excel and PDF files, extracts job IDs from filenames,
 * and produces paired `FilePair` objects linking each Excel file to its corresponding PDF when available.
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

	private async readPairsFromDirectory(dirPath: string): Promise<FilePair[]> {
		this.emitDebug(`Scanning directory: ${dirPath}`);

		if (!existsSync(dirPath)) {
			this.failed(`Directory not found: ${dirPath}`);
		}

		const excelFiles: string[] = [];
		const pdfFiles: string[] = [];

		for await (const entry of Deno.readDir(dirPath)) {
			if (!entry.isFile) continue;
			const fullPath = join(dirPath, entry.name);

			if (this.matches(entry.name, "*_FLPivot.xlsx")) {
				excelFiles.push(fullPath);
			} else if (this.matches(entry.name, "*UDS Level 2 Report*.pdf")) {
				pdfFiles.push(fullPath);
			}
		}

		this.emitDebug(
			`Found ${excelFiles.length} Excel and ${pdfFiles.length} PDF files`,
		);

		const pdfMap = new Map<string, string>();
		for (const pdf of pdfFiles) {
			const jobId = this.extractJobId(basename(pdf));
			if (jobId) pdfMap.set(jobId, pdf);
		}

		const pairs: FilePair[] = [];
		for (const excel of excelFiles) {
			const jobId = this.extractJobId(basename(excel));
			if (!jobId) {
				this.emitWarning(`Could not extract Job ID from: ${excel}`);
				continue;
			}

			const pdfPath = pdfMap.get(jobId);
			pairs.push({ excelPath: excel, pdfPath, jobId });

			if (!pdfPath) {
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

	private extractJobId(filename: string): string | null {
		const excelMatch = filename.match(
			/^(\d{3}-\d{4,5}-\d)_FLPivot\.xlsx$/i,
		);

		if (excelMatch) return excelMatch[1];

		const pdfMatch = filename.match(/^J(\d{4}-\d)\s+/i);
		if (pdfMatch) return `762-${pdfMatch[1]}`;

		return null;
	}
}
