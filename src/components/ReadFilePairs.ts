// src/components/ReadFilePairs.ts
import { basename, join } from "@std/path";
import { BaseComponent } from "../core/BaseComponent.ts";
import type { PipelineComponent } from "../core/PipelineComponent.ts";
import type { FilePair, Result } from "../core/types.ts";
import { existsSync } from "@std/fs";

/**
 * @name ReadFilePairs
 * @class
 * @extends BaseComponent
 * @implements {PipelineComponent<Map<string, unknown>, Map<string, unknown>>}
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description Scans a directory for Excel and PDF files, extracts job IDs from filenames, and produces paired `FilePair` objects linking each Excel file to its corresponding PDF when available.
 * @intent Serves as the pipeline’s entry point for file discovery, ensuring that downstream components receive a clean, structured list of file pairs with consistent job identifiers.
 * @see {@link BaseComponent} — lifecycle behavior
 * @see {@link PipelineComponent} — interface contract
 * @see {@link FilePair} — output structure
 * @example
 * ```typescript
 * const r = new ReadFilePairs();
 * const board = new Map([["dirPath", "/path/to/files"]]);
 * const result = await r.process(board);
 * ```
 */
export class ReadFilePairs extends BaseComponent
	implements PipelineComponent<Map<string, unknown>, Map<string, unknown>> {
	/**
	 * @name constructor
	 * @constructor
	 * @access public
	 * @description Initializes the component and registers its name with the BaseComponent lifecycle system.
	 * @intent Ensures the component is identifiable in logs, lifecycle events, and error emissions.
	 */
	constructor() {
		super("ReadFilePairs");
	}

	/**
	 * @name process
	 * @method
	 * @async
	 * @param {Map<string, unknown>} input
	 * @returns {Promise<Result<Map<string, unknown>, Map<string, unknown>>>}
	 * @access public
	 * @description Validates the presence of a directory path, reads file pairs from the directory, and stores the resulting `filePairs` array back into the blackboard.
	 * @intent Acts as the orchestrator for directory scanning, delegating the actual pairing logic while maintaining consistent lifecycle behavior.
	 */
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
	/**
	 * @name readPairsFromDirectory
	 * @method
	 * @async
	 * @param {string} dirPath
	 * @returns {Promise<FilePair[]>}
	 * @access private
	 * @description Scans the target directory, identifies Excel and PDF files, extracts job IDs, and constructs `FilePair` objects linking related files.
	 * @intent Encapsulates the directory‑level logic for discovering and pairing files, isolating pattern matching, job ID extraction, and warning behavior from the main process flow.
	 */
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

	/**
	 * @name matches
	 * @method
	 * @param {string} filename
	 * @param {string} pattern
	 * @returns {boolean}
	 * @access private
	 * @description Checks whether a filename matches a simple wildcard pattern by converting the pattern into a case‑insensitive regular expression.
	 * @intent Provides lightweight glob‑style matching without requiring external libraries.
	 */
	private matches(filename: string, pattern: string): boolean {
		const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$", "i");
		return regex.test(filename);
	}

	/**
	 * @name extractJobId
	 * @method
	 * @param {string} filename
	 * @returns {string | null}
	 * @access private
	 * @description Extracts a job ID from either an Excel filename (`*_FLPivot.xlsx`) or a PDF filename (`J####-# ...`), returning the normalized job ID or null if no match is found.
	 * @intent Unifies job ID extraction across different file naming conventions so the pairing logic can rely on consistent identifiers.
	 */
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
