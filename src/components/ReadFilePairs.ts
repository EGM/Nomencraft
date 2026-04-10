// src/components/ReadFilePairs.ts
import { basename, join } from "@std/path";
import { BaseComponent } from "../core/BaseComponent.ts";
import type { PipelineComponent } from "../core/PipelineComponent.ts";
import type { FilePair, Result } from "../core/types.ts";
import { existsSync } from "@std/fs";

export class ReadFilePairs extends BaseComponent
	implements PipelineComponent<Map<string, unknown>, Map<string, unknown>> {
	constructor() {
		super("ReadFilePairs");
	}

	async process(
		input: Map<string, unknown>,
	): Promise<Result<Map<string, unknown>, Map<string, unknown>>> {
		this.started();
		//console.log("ReadFilePairs received input:",Object.fromEntries(input.entries()),);
		try {
			// 1. Extract dirPath from input
			const dirPath = input.get("dirPath");
			if (typeof dirPath !== "string") {
				this.failed("Missing or invalid 'dirPath' in input map");
			}

			// 2. Perform the old logic
			const filePairs = await this.readPairsFromDirectory(
				dirPath as string,
			);

			// 3. Store the result back into the map
			input.set("filePairs", filePairs);

			this.finished();
			return { success: true, value: input };
		} catch (err) {
			//this.failed(err); <-- Don't call failed() here, as it will throw and we want to return a Result object instead
			return { success: false, input, error: String(err) };
		}
	}

	// Your old logic goes here
	private async readPairsFromDirectory(dirPath: string): Promise<FilePair[]> {
		this.emitDebug(`Scanning directory: ${dirPath}`);

		if (!existsSync(dirPath)) {
			this.failed(`Directory not found: ${dirPath}`);
		}

		const excelFiles: string[] = [];
		const pdfFiles: string[] = [];

		// 1. Collect files
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

		// 2. Map PDFs by Job ID
		const pdfMap = new Map<string, string>();
		for (const pdf of pdfFiles) {
			const jobId = this.extractJobId(basename(pdf));
			if (jobId) pdfMap.set(jobId, pdf);
		}

		// 3. Pair them
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
