// src/services/PatternService.ts
import { basename, join } from "@std/path";
import { BaseService } from "../core/BaseService.ts";
import type { InputMap, OutputMap, Result } from "../core/types.ts";
import { configDir } from "../utils/configDir.ts";
import * as YAML from "@std/yaml";
import { exists } from "@std/fs";

export interface PatternServiceOptions {
	action: "list" | "info" | "validate" | "add" | null;
	name?: string;
	file?: string;
	force: boolean;
}

export class PatternService extends BaseService {
	private patternsDir!: string;

	constructor(private options: PatternServiceOptions) {
		super("PatternService");
	}

	protected override async execute(): Promise<Result<InputMap, OutputMap>> {
		this.patternsDir = configDir.patterns;

		const { action, name, file, force } = this.options;

		switch (action) {
			case "list":
				return await this.listPatterns();

			case "info":
				if (!name) return this.fail("Missing pattern name", new Map());
				return await this.getPatternInfo(name);

			case "validate":
				if (!name) return this.fail("Missing pattern name", new Map());
				return await this.validatePattern(name);

			case "add":
				if (!file) return this.fail("Missing file path", new Map());
				return await this.addPattern(file, force);

			default:
				return this.fail(`Unknown action: ${action}`, new Map());
		}
	}

	private async fileExists(path: string): Promise<boolean> {
		try {
			await Deno.stat(path);
			return true;
		} catch {
			return false;
		}
	}

	private async findAllPatternFiles(name: string): Promise<string[]> {
		const candidates = [`${name}.yaml`, `${name}.yml`, `${name}.json`];
		const results: string[] = [];

		for (const file of candidates) {
			const full = join(this.patternsDir, file);
			if (await this.fileExists(full)) {
				results.push(full);
			}
		}

		return results;
	}

	private async listPatterns(): Promise<Result<InputMap, OutputMap>> {
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
			return this.ok(new Map([["patterns", unique]]));
		} catch (err) {
			return this.fail(
				err instanceof Error ? err.message : String(err),
				new Map(),
			);
		}
	}

	private async getPatternInfo(
		name: string,
	): Promise<Result<InputMap, OutputMap>> {
		const matches = await this.findAllPatternFiles(name);

		if (matches.length === 0) {
			return this.fail(`Pattern '${name}' not found`, new Map());
		}

		if (matches.length > 1) {
			return this.fail(
				[
					`Multiple pattern files found for '${name}':`,
					...matches.map((m) => `  - ${basename(m)}`),
					"",
					"Clean up duplicates and try again.",
				].join("\n"),
				new Map(),
			);
		}

		const path = matches[0];

		try {
			const raw = await Deno.readTextFile(path);
			const parsed = path.endsWith(".json")
				? JSON.parse(raw)
				: YAML.parse(raw);

			return this.ok(new Map([["pattern", parsed]]));
		} catch (err) {
			return this.fail(
				err instanceof Error ? err.message : String(err),
				new Map(),
			);
		}
	}

	private async validatePattern(
		name: string,
	): Promise<Result<InputMap, OutputMap>> {
		const matches = await this.findAllPatternFiles(name);

		if (matches.length === 0) {
			return this.fail(`Pattern '${name}' not found`, new Map());
		}

		if (matches.length > 1) {
			return this.fail(
				[
					`Multiple pattern files found for '${name}':`,
					...matches.map((m) => `  - ${basename(m)}`),
					"",
					"Clean up duplicates and try again.",
				].join("\n"),
				new Map(),
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

			return this.ok(new Map([["message", "Pattern is valid"]]));
		} catch (err) {
			return this.fail(
				`Invalid pattern: ${
					err instanceof Error ? err.message : String(err)
				}`,
				new Map(),
			);
		}
	}

	private async addPattern(
		file: string,
		force: boolean,
	): Promise<Result<InputMap, OutputMap>> {
		try {
			const base = basename(file);
			const dest = join(this.patternsDir, base);

			const existsAlready = await exists(dest);

			if (!force && existsAlready) {
				return this.fail(
					`Pattern '${base}' already exists. Use --force to overwrite.`,
					new Map(),
				);
			}

			if (force && existsAlready) {
				await Deno.remove(dest);
			}

			await Deno.copyFile(file, dest);

			const message = existsAlready && force
				? `Pattern '${base}' overwritten`
				: `Pattern '${base}' added`;

			return this.ok(new Map([["message", message]]));
		} catch (err) {
			return this.fail(
				err instanceof Error ? err.message : String(err),
				new Map(),
			);
		}
	}
}
