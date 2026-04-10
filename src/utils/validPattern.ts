// src/utils/validPattern.ts

import { parse } from "@std/yaml";
import { basename } from "@std/path";

export interface PatternValidationResult {
	ok: boolean;
	error?: string;
}

export async function validatePatternFile(
	filePath: string,
): Promise<PatternValidationResult> {
	try {
		const text = await Deno.readTextFile(filePath);

		let data: unknown;
		try {
			data = parse(text);
		} catch (err) {
			return {
				ok: false,
				error: `Failed to parse YAML in '${
					basename(filePath)
				}': ${err}`,
			};
		}

		// Basic shape check
		if (typeof data !== "object" || data === null) {
			return {
				ok: false,
				error: `Pattern '${
					basename(filePath)
				}' must contain a YAML object`,
			};
		}

		const obj = data as Record<string, unknown>;

		// Required fields
		const required = [
			"InputFolder",
			"ExcelStructure",
			"OutputFolder",
			"Pattern",
		];
		for (const key of required) {
			if (!(key in obj)) {
				return {
					ok: false,
					error: `Missing required field '${key}' in pattern '${
						basename(filePath)
					}'`,
				};
			}
		}

		// Validate Pattern array
		if (!Array.isArray(obj.Pattern)) {
			return {
				ok: false,
				error: `Field 'Pattern' must be an array in '${
					basename(filePath)
				}'`,
			};
		}

		// Validate each pattern entry
		for (const [i, entry] of obj.Pattern.entries()) {
			if (typeof entry !== "object" || entry === null) {
				return {
					ok: false,
					error: `Pattern entry #${i + 1} is not an object`,
				};
			}

			const e = entry as Record<string, unknown>;

			if (!("Find" in e) || typeof e.Find !== "string") {
				return {
					ok: false,
					error: `Pattern entry #${
						i + 1
					} missing valid 'Find' string`,
				};
			}

			if (!("Replace" in e) || typeof e.Replace !== "string") {
				return {
					ok: false,
					error: `Pattern entry #${
						i + 1
					} missing valid 'Replace' string`,
				};
			}

			// Optional: validate regex
			try {
				new RegExp(e.Find as string);
			} catch {
				return {
					ok: false,
					error: `Invalid regex in 'Find' for entry #${i + 1}`,
				};
			}
		}

		return { ok: true };
	} catch (err) {
		return {
			ok: false,
			error: `Unexpected error validating pattern: ${err}`,
		};
	}
}
