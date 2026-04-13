import { basename, join } from "@std/path";
import { BaseService } from "../core/BaseService.ts";
import type { Result } from "../core/types.ts";
import { configDir } from "../utils/configDir.ts";
import * as YAML from "@std/yaml";
import { exists } from "@std/fs";

/**
 * Options for configuring PatternService actions.
 */
export interface PatternServiceOptions {
	/** The action to perform on patterns. */
	action: "list" | "info" | "validate" | "add" | null;

	/** The logical pattern name (without extension). */
	name?: string;

	/** Source file path when adding a new pattern. */
	file?: string;

	/** Whether to overwrite an existing pattern when adding. */
	force: boolean;
}

/**
 * @description Service for listing, inspecting, validating, and adding pattern files.
 * @intent Provides a service-layer abstraction for pattern operations, keeping file logic out of controllers and components.
 * @see {@link BaseService}
 * @example
 * const svc = new PatternService({ action: "list", force: false });
 * const result = await svc.run();
 * if (result.success) console.log(result.value);
 */
export class PatternService extends BaseService {
	/** Absolute path to the patterns directory. */
	private patternsDir!: string;

	constructor(private options: PatternServiceOptions) {
		super("PatternService");
	}

	/**
	 * Executes the selected pattern action.
	 */
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

	/**
	 * Checks whether a file exists at the given path.
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
	 * Finds all pattern files matching the given logical name.
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
	 * Returns all unique logical pattern names in the patterns directory.
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
	 * Loads and parses a pattern file, returning its contents.
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
	 * Validates that a pattern file exists and contains valid YAML or JSON.
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
	 * Copies a pattern file into the patterns directory, optionally overwriting.
	 */
	private async addPattern(
		file: string,
		force: boolean,
	): Promise<Result<void, string>> {
		try {
			const base = basename(file);
			const dest = join(this.patternsDir, base);

			const isFile = await exists(dest);

			if (!force && isFile) {
				return this.fail(
					undefined,
					`Pattern '${base}' already exists. Use --force to overwrite.`,
				);
			}

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
