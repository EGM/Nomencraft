// src/services/PatternService.ts
import { basename, join } from "@std/path";
import { BaseService } from "../core/BaseService.ts";
import type { Result } from "../core/types.ts";
import { configDir } from "../utils/configDir.ts";
import * as YAML from "@std/yaml";
import { exists } from "@std/fs";

export interface PatternServiceOptions {
	action: "list" | "info" | "validate" | "add" | null;
	name?: string; // pattern name (no extension)
	file?: string; // source file for add()
	force: boolean; // for add(): overwrite existing pattern if true
}

/**
 * TODO: Describe the PatternService class.
 */
export class PatternService extends BaseService {
	private patternsDir!: string;

	constructor(private options: PatternServiceOptions) {
		super("PatternService");
	}

	protected override async execute(): Promise<Result<void, unknown>> {
		this.patternsDir = configDir.patterns;

		const { action, name, file, force } = this.options;

		switch (action) {
			case "list":
				return await this.listPatterns();

			case "info":
				if (!name) return this.fail(undefined, "Missing pattern name");
				return await this.getPatternInfo(name);

			case "validate":
				if (!name) return this.fail(undefined, "Missing pattern name");
				return await this.validatePattern(name);

			case "add":
				if (!file) return this.fail(undefined, "Missing file path");
				return await this.addPattern(file, force);

			default:
				return this.fail(undefined, `Unknown action: ${action}`);
		}
	}

	// ------------------------------------------------------------
	// Pattern directory utilities
	// ------------------------------------------------------------

	/**
	 * TODO: Describe the fileExists method.
	 * @param path - {string}
	 * @returns Promise<boolean>
	 */
	private async fileExists(path: string): Promise<boolean> {
		try {
			await Deno.stat(path);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Returns ALL matching files for a given pattern name.
	 * Example: ["invoice.yaml", "invoice.yml", "invoice.json"]
	 */
	private async findAllPatternFiles(name: string): Promise<string[]> {
		const candidates = [
			`${name}.yaml`,
			`${name}.yml`,
			`${name}.json`,
		];

		const results: string[] = [];

		for (const file of candidates) {
			const full = join(this.patternsDir, file);
			if (await this.fileExists(full)) {
				results.push(full);
			}
		}

		return results;
	}

	/**
	 * TODO: Describe the listPatterns method.
	 * @returns Promise<Result<void, string[]>>
	 */
	private async listPatterns(): Promise<Result<void, string[]>> {
		try {
			const names: string[] = [];

			for await (const entry of Deno.readDir(this.patternsDir)) {
				if (!entry.isFile) continue;

				if (
					entry.name.endsWith(".yaml") ||
					entry.name.endsWith(".yml") ||
					entry.name.endsWith(".json")
				) {
					const logical = basename(
						entry.name,
						entry.name.endsWith(".yaml")
							? ".yaml"
							: entry.name.endsWith(".yml")
							? ".yml"
							: ".json",
					);
					names.push(logical);
				}
			}

			const unique = [...new Set(names)];
			return this.ok(undefined, unique);
		} catch (err) {
			return this.fail(
				undefined,
				err instanceof Error ? err : String(err),
			);
		}
	}

	/**
	 * TODO: Describe the getPatternInfo method.
	 * @param name - {string}
	 * @returns Promise<Result<void, unknown>>
	 */
	private async getPatternInfo(name: string): Promise<Result<void, unknown>> {
		const matches = await this.findAllPatternFiles(name);

		if (matches.length === 0) {
			return this.fail(undefined, `Pattern '${name}' not found`);
		}

		if (matches.length > 1) {
			return this.fail(
				undefined,
				[
					`Multiple pattern files found for '${name}':`,
					...matches.map((m) => `  - ${basename(m)}`),
					"",
					"I can't guess which one you meant. Please clean up duplicates.",
				].join("\n"),
			);
		}

		const path = matches[0];

		try {
			const raw = await Deno.readTextFile(path);
			const parsed = path.endsWith(".json")
				? JSON.parse(raw)
				: YAML.parse(raw);
			return this.ok(undefined, parsed);
		} catch (err) {
			return this.fail(
				undefined,
				err instanceof Error ? err : String(err),
			);
		}
	}

	/**
	 * TODO: Describe the validatePattern method.
	 * @param name - {string}
	 * @returns Promise<Result<void, string>>
	 */
	private async validatePattern(name: string): Promise<Result<void, string>> {
		const matches = await this.findAllPatternFiles(name);

		if (matches.length === 0) {
			return this.fail(undefined, `Pattern '${name}' not found`);
		}

		if (matches.length > 1) {
			return this.fail(
				undefined,
				[
					`Multiple pattern files found for '${name}':`,
					...matches.map((m) => `  - ${basename(m)}`),
					"",
					"Validate WHICH one? Clean up duplicates and try again.",
				].join("\n"),
			);
		}

		const path = matches[0];

		try {
			const raw = await Deno.readTextFile(path);
			if (path.endsWith(".json")) {
				JSON.parse(raw);
			} else {
				YAML.parse(raw);
			}

			return this.ok(undefined, "Pattern is valid");
		} catch (err) {
			return this.fail(
				undefined,
				`Invalid pattern: ${
					err instanceof Error ? err.message : String(err)
				}`,
			);
		}
	}

	/**
	 * TODO: Describe the addPattern method.
	 * @param file - {string}
	 * @param force - {boolean}
	 * @returns Promise<Result<void, string>>
	 */
	private async addPattern(
		file: string,
		force: boolean,
	): Promise<Result<void, string>> {
		try {
			const base = basename(file);
			const dest = join(this.patternsDir, base);

			// Check if destination exists
			const isFile = await exists(dest);

			if (!force && isFile) {
				return this.fail(
					undefined,
					`Pattern '${base}' already exists. Use --force to overwrite.`,
				);
			}
			// If exists + force, remove it first (clean overwrite)
			if (force && isFile) {
				await Deno.remove(dest);
			}
			await Deno.copyFile(file, dest);

			return this.ok(
				undefined,
				isFile && force
					? `Pattern '${base}' overwritten`
					: `Pattern '${base}' added`,
			);
		} catch (err) {
			return this.fail(
				undefined,
				err instanceof Error ? err : String(err),
			);
		}
	}
}
