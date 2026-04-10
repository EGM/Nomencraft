// src/components/GenerateNames.ts

import { BaseComponent } from "../core/BaseComponent.ts";
import type { FilePair, NamedFile, ParsedData, Result } from "../core/types.ts";
import { parse as parseYaml } from "@std/yaml";

// ------------------------------------------------------------
// Shared Types
// ------------------------------------------------------------

interface PatternConfig {
	name: string;
	code: string;
	type_word: string;
	triggers: Array<{
		parameter: string;
		sites: string[];
	}>;
	date_format: "day_of_week" | "fixed" | "quarter";
}

// ------------------------------------------------------------
// findByJobId — Polymorphic Overload Set
// ------------------------------------------------------------

/**
 * findByJobId
 *
 * Overloaded helper for retrieving an item by jobId from:
 * - FilePair[]
 * - ParsedData[]
 * - NamedFile[]
 *
 * IMPORTANT:
 * This is a pure utility. It does NOT assume ordering.
 * Use it as a fallback when array index invariants are uncertain.
 */

// 1) FilePair[]
export function findByJobId(
	jobId: string,
	items: Array<{ jobId: string }>,
): { jobId: string } | null;

// 2) ParsedData[]
export function findByJobId(
	jobId: string,
	items: Array<{ job_id: string }>,
): { job_id: string } | null;

// 3) NamedFile[]
export function findByJobId(
	jobId: string,
	items: Array<{ pdfNewName?: string }>,
): { pdfNewName?: string } | null;

// Implementation
/**
 * TODO: Describe the findByJobId function.
 * @param jobId - {string}
 * @param items - {T[]}
 * @returns T
 */
export function findByJobId<T extends { jobId: string }>(
	jobId: string,
	items: T[],
): T | null {
	for (const item of items) {
		// FilePair case
		if ("jobId" in item && item.jobId === jobId) {
			return item;
		}

		// ParsedData case
		if ("job_id" in item && item.job_id === jobId) {
			return item;
		}

		// NamedFile case (match via suffix)
		if ("pdfNewName" in item) {
			const suffix = jobId.split("-").slice(1).join("-");
			if (String(item.pdfNewName).includes(`J${suffix}`)) {
				return item;
			}
		}
	}

	return null;
}

// ------------------------------------------------------------
// GenerateNames Component
// ------------------------------------------------------------

/**
 * TODO: Describe the GenerateNames class.
 */
export class GenerateNames extends BaseComponent {
	constructor() {
		super("GenerateNames");
	}

	/**
	 * IMPORTANT INVARIANT:
	 * filePairs[], parsedData[], and namedFiles[] MUST remain in the same order.
	 * Do NOT reorder, sort, or filter these arrays.
	 * If you modify upstream components, preserve this ordering.
	 * If ordering is ever uncertain, use findByJobId() as a fallback.
	 */
	async process(
		input: Map<string, unknown>,
	): Promise<Result<Map<string, unknown>, Map<string, unknown>>> {
		this.started();

		try {
			// ------------------------------------------------------------
			// 1. Validate input
			// ------------------------------------------------------------
			const parsedList = input.get("parsedData") as
				| ParsedData[]
				| undefined;
			const patternPath = input.get("patternPath") as string | undefined;
			const filePairs = input.get("filePairs") as FilePair[] | undefined;

			if (
				!parsedList || !Array.isArray(parsedList) ||
				parsedList.length === 0
			) {
				this.failed(
					"Missing or invalid 'parsedData' (must be ParsedData[])",
				);
			}

			if (!patternPath || typeof patternPath !== "string") {
				this.failed("Missing or invalid 'patternPath'");
			}

			if (
				!filePairs || !Array.isArray(filePairs) ||
				filePairs.length === 0
			) {
				this.failed(
					"Missing or invalid 'filePairs' (must be FilePair[])",
				);
			}

			if (filePairs!.length !== parsedList!.length) {
				this.failed(
					`Invariant broken: filePairs (${
						filePairs!.length
					}) and parsedData (${parsedList!.length}) must match 1:1`,
				);
			}

			this.emitDebug(
				`Received ${parsedList!.length} ParsedData entries and ${
					filePairs!.length
				} filePairs`,
			);

			// ------------------------------------------------------------
			// 2. Load patterns
			// ------------------------------------------------------------
			const patterns = await this.loadPatterns(patternPath!);
			if (patterns.length === 0) {
				this.failed("No patterns loaded. Check pattern path.");
			}

			this.emitDebug(`Loaded ${patterns.length} patterns`);

			// ------------------------------------------------------------
			// 3. Process each job (index-first)
			// ------------------------------------------------------------
			const allNamedFiles: NamedFile[] = [];

			for (let i = 0; i < parsedList!.length; i++) {
				const job = parsedList![i];
				let filePair = filePairs![i];

				this.emitDebug(`Processing job ${job.job_id}`);

				// Invariant check: jobId must match
				if (filePair.jobId !== job.job_id) {
					this.emitWarning(
						`Index mismatch at [${i}]: filePair.jobId=${filePair.jobId}, parsed.job_id=${job.job_id}. Falling back to findByJobId().`,
					);

					const fallback = findByJobId(job.job_id, filePairs!);
					if (!fallback) {
						this.failed(
							`No filePair found for job_id '${job.job_id}' via fallback. Invariant broken.`,
						);
					}

					filePair = fallback as FilePair;
				}

				// Pattern matching
				const matched = this.findMatchedPattern(job, patterns);

				const pattern = matched ?? {
					name: "Unknown",
					code: "X",
					type_word: "Unknown",
					triggers: [],
					date_format: "fixed",
				};

				if (!matched) {
					this.emitWarning(
						`No pattern matched for job ${job.job_id}. Using Unknown (X).`,
					);
				} else {
					this.emitDebug(
						`Matched pattern '${pattern.name}' (${pattern.code}) for job ${job.job_id}`,
					);
				}

				const names = this.generateNames(job, pattern, filePair);
				allNamedFiles.push(...names);
			}

			// ------------------------------------------------------------
			// 4. Mutate blackboard
			// ------------------------------------------------------------
			input.set("namedFiles", allNamedFiles);

			this.finished();
			return { success: true, value: input };
		} catch (err) {
			this.emitError({ failed: this.name, error: err });
			return { success: false, input, error: String(err) };
		}
	}

	// ------------------------------------------------------------
	// Internal helpers
	// ------------------------------------------------------------

	private async loadPatterns(patternPath: string): Promise<PatternConfig[]> {
		try {
			const stat = await Deno.stat(patternPath);
			if (!stat.isFile) {
				this.failed(`Pattern path is not a file: ${patternPath}`);
			}

			const content = await Deno.readTextFile(patternPath);
			const parsed = parseYaml(content);

			if (!Array.isArray(parsed)) {
				this.failed("Pattern file must be a YAML array");
			}

			return parsed as PatternConfig[];
		} catch (err) {
			this.failed(
				`Failed to load patterns: ${
					err instanceof Error ? err.message : String(err)
				}`,
			);
		}
	}

	private findMatchedPattern(
		job: ParsedData,
		patterns: PatternConfig[],
	): PatternConfig | null {
		this.emitDebug(`Matching pattern for job ${job.job_id}`);

		for (const pattern of patterns) {
			for (const trigger of pattern.triggers) {
				const hasMatch = job.samples.some((sample) => {
					if (!trigger.sites.includes(sample.site)) return false;

					return sample.measurements.some((m) =>
						m.parameter.toLowerCase() ===
							trigger.parameter.toLowerCase()
					);
				});

				if (hasMatch) return pattern;
			}
		}

		return null;
	}

	private generateNames(
		job: ParsedData,
		pattern: PatternConfig,
		filePair: FilePair,
	): NamedFile[] {
		const hasPdf = Boolean(filePair.pdfPath);
		const results: NamedFile[] = [];

		const dateObj = new Date(job.sample_date);
		const dateStr = dateObj.toISOString().split("T")[0]; //job.sample_date.split(" ")[0];

		const dayOfWeek = dateObj.toLocaleDateString("en-US", {
			weekday: "short",
		});

		let typeWord = pattern.type_word;
		if (pattern.date_format === "quarter") {
			const q = Math.ceil((dateObj.getMonth() + 1) / 3);
			typeWord = `Q${q} MW`;
		}

		const jobSuffix = job.job_id.split("-").slice(1).join("-");
		const siteName = job.samples[0]?.site ?? "Unknown";
		const labName = "EF";

		const excelName =
			`${dateStr} (${pattern.code}) Lab Report ${labName} ${siteName}.xlsx`;

		const pdfMiddlePart = pattern.code === "D" || pattern.code === "S"
			? dayOfWeek
			: pattern.code === "Q"
			? `Q${Math.ceil((dateObj.getMonth() + 1) / 3)}`
			: pattern.type_word;

		const pdfName =
			`${dateStr} ${pdfMiddlePart} Lab ${labName} ${typeWord} J${jobSuffix}.pdf`;

		if (hasPdf) {
			console.log(
				`Generated PDF name: ${pdfName} for job ${job.job_id}. Original PDF: ${filePair.pdfPath}`,
			);
		}

		results.push({
			originalPath: filePair.excelPath,
			newPath: excelName,
			typeCode: pattern.code,
			typeWord,
			reason: `Matched pattern: ${pattern.name}`,
			...(hasPdf && {
				pdfPath: filePair.pdfPath,
				pdfNewName: pdfName,
			}),
		});

		return results;
	}
}
