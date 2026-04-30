// src/components/GenerateNames.ts
import { BaseComponent } from "../core/BaseComponent.ts";
import type {
	FilePair,
	InputMap,
	NamedFile,
	OutputMap,
	ParsedData,
	Result,
} from "../core/types.ts";
import { parse as parseYaml } from "@std/yaml";
import { canonicalizeIdentifier } from "../utils/canonicalizeIdentifier.ts";

/**
 * @description Structure of a naming pattern loaded from YAML.
 */
interface PatternConfig {
	name: string;
	code: string;
	type_word: string;
	triggers: Array<{ parameter: string; sites: string[] }>;
	date_format: "day_of_week" | "fixed" | "quarter";
}

/**
 * @description Applies naming patterns to parsed job data and generates standardized filenames.
 */
export class GenerateNames extends BaseComponent {
	constructor() {
		super("GenerateNames");
	}

	override async process(
		input: InputMap,
	): Promise<Result<InputMap, OutputMap>> {
		this.started();

		try {
			const parsedList = input.get("parsedData");

			const patternPath = input.get("patternPath") as string | undefined;
			const filePairs = input.get("filePairs") as FilePair[] | undefined;

			// Validate inputs
			if (!parsedList || !Array.isArray(parsedList)) {
				this.failed(
					"Missing or invalid 'parsedData' (must be ParsedData[])",
				);
			}

			if (parsedList.length === 0) {
				this.emitWarning(
					"No parsed data found. Skipping GenerateNames.",
				);
				input.set("namedFiles", []); // <-- valid output, not garbage
				this.finished();
				return { success: true, value: input };
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

			if (filePairs.length !== parsedList.length) {
				this.failed(
					`Invariant broken: filePairs (${filePairs.length}) and parsedData (${parsedList.length}) must match 1:1`,
				);
			}

			this.emitDebug(
				`Received ${parsedList.length} ParsedData entries and ${filePairs.length} filePairs`,
			);

			const patterns = await this.loadPatterns(patternPath);
			if (patterns.length === 0) {
				this.failed("No patterns loaded. Check pattern path.");
			}

			this.emitDebug(`Loaded ${patterns.length} patterns`);

			const allNamedFiles: NamedFile[] = [];

			for (let i = 0; i < parsedList.length; i++) {
				const job = parsedList[i];
				const filePair = filePairs[i];

				// Hard invariant: job IDs must match
				if (filePair.jobId !== job.job_id) {
					this.failed(
						`Invariant broken: filePair.jobId (${filePair.jobId}) does not match parsed.job_id (${job.job_id})`,
					);
				}

				this.emitDebug(`Processing job ${job.job_id}`);

				const matched = this.findMatchedPattern(job, patterns);

				const pattern = matched ?? {
					name: "Unknown",
					code: "X",
					type_word: "Unknown",
					triggers: [],
					date_format: "fixed" as const,
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

				const named = this.generateNames(job, pattern, filePair);
				allNamedFiles.push(named);
			}

			input.set("namedFiles", allNamedFiles);

			this.finished();
			return { success: true, value: input };
		} catch (err) {
			this.emitError({ failed: this.name, error: err });
			return { success: false, input, error: String(err) };
		}
	}

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
					//if (!trigger.sites.includes(sample.site)) return false;
					const site = canonicalizeIdentifier(sample.site);
					const triggerSites = trigger.sites.map(
						canonicalizeIdentifier,
					);

					if (!triggerSites.includes(site)) return false;

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
	): NamedFile {
		const hasPdf = Boolean(filePair.pdfName);

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
		const labName = "EF";

		// Excel name
		const newExcelName =
			`${dateStr} (${pattern.code}) Lab Report EF WWTP1.xlsx`;

		// PDF name
		let newPdfName: string | undefined = undefined;

		if (hasPdf) {
			const pdfMiddlePart = pattern.code === "D" || pattern.code === "S"
				? dayOfWeek
				: pattern.code === "Q"
				? `Q${Math.ceil((dateObj.getMonth() + 1) / 3)}`
				: pattern.type_word;

			newPdfName =
				`${dateStr} Lab ${labName} ${pdfMiddlePart} J${jobSuffix}.pdf`;
			//2026-02-19 Lab EF Weekly J8586-1 <----- right
			//2026-04-22 Wed Lab EF Daily J9140-1 <-- wrong
		}

		return {
			newExcelName,
			typeCode: pattern.code,
			typeWord,
			reason: `Matched pattern: ${pattern.name}`,
			...(hasPdf && { newPdfName }),
		};
	}
}
