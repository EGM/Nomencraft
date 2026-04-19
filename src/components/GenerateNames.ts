// src/components/GenerateNames.ts
import { BaseComponent } from "../core/BaseComponent.ts";
import type { FilePair, NamedFile, ParsedData, Result } from "../core/types.ts";
import { parse as parseYaml } from "@std/yaml";

/**
 * @description Structure of a naming pattern loaded from YAML.
 */
interface PatternConfig {
	/** Human‑readable name of the pattern. */
	name: string;

	/** Short code used in generated filenames. */
	code: string;

	/** Descriptive label used in PDF filenames. */
	type_word: string;

	/** Trigger rules determining when the pattern applies. */
	triggers: Array<{ parameter: string; sites: string[] }>;

	/** How dates should be interpreted when generating names. */
	date_format: "day_of_week" | "fixed" | "quarter";
}

/**
 * @description Retrieves an item matching the given jobId from arrays with differing identifier shapes.
 */
export function findByJobId(
	jobId: string,
	items: Array<{ jobId: string }>,
): { jobId: string } | null;
/**
 * @description Retrieves an item matching the given jobId from arrays with differing identifier shapes.
 */
export function findByJobId(
	jobId: string,
	items: Array<{ job_id: string }>,
): { job_id: string } | null;
/**
 * @description Retrieves an item matching the given jobId from arrays with differing identifier shapes.
 */
export function findByJobId(
	jobId: string,
	items: Array<{ pdfNewName?: string }>,
): { pdfNewName?: string } | null;
/**
 * @name findByJobId
 * @function
 * @param {string} jobId
 * @param {T[]} items
 * @returns {T | null}
 * @access public
 * @template T
 * @description todo
 */
export function findByJobId<T extends { jobId: string }>(
	jobId: string,
	items: T[],
): T | null {
	for (const item of items) {
		if ("jobId" in item && item.jobId === jobId) return item;
		if ("job_id" in item && item.job_id === jobId) return item;

		if ("pdfNewName" in item) {
			const suffix = jobId.split("-").slice(1).join("-");
			if (String(item.pdfNewName).includes(`J${suffix}`)) return item;
		}
	}
	return null;
}

/**
 * @description Applies naming patterns to parsed job data and generates standardized filenames.
 * @see BaseComponent
 * @see Result
 */
export class GenerateNames extends BaseComponent {
	/** @description Registers the component name with the BaseComponent lifecycle. */
	constructor() {
		super("GenerateNames");
	}

	/**
	 * @description Validates inputs, loads patterns, processes each job, and writes generated filenames to the blackboard.
	 */
	async process(
		input: Map<string, unknown>,
	): Promise<Result<Map<string, unknown>, Map<string, unknown>>> {
		this.started();

		try {
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

			const patterns = await this.loadPatterns(patternPath!);
			if (patterns.length === 0) {
				this.failed("No patterns loaded. Check pattern path.");
			}

			this.emitDebug(`Loaded ${patterns.length} patterns`);

			const allNamedFiles: NamedFile[] = [];

			for (let i = 0; i < parsedList!.length; i++) {
				const job = parsedList![i];
				let filePair = filePairs![i];

				this.emitDebug(`Processing job ${job.job_id}`);

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

			input.set("namedFiles", allNamedFiles);

			this.finished();
			return { success: true, value: input };
		} catch (err) {
			this.emitError({ failed: this.name, error: err });
			return { success: false, input, error: String(err) };
		}
	}

	/**
	 * @description Loads and parses the YAML pattern file.
	 */
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

	/**
	 * @description Finds a pattern whose triggers match the job’s parameters and sites.
	 */
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

	/**
	 * @description Generates Excel and PDF filenames for a job based on metadata and the matched pattern.
	 */
	private generateNames(
		job: ParsedData,
		pattern: PatternConfig,
		filePair: FilePair,
	): NamedFile[] {
		const hasPdf = Boolean(filePair.pdfPath);
		const results: NamedFile[] = [];

		const dateObj = new Date(job.sample_date);
		const dateStr = dateObj.toISOString().split("T")[0];
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
