import { walk } from "@std/fs";
import { globToRegExp, resolve, toFileUrl } from "@std/path";
import { extname } from "@std/path";
import { doc, DocOptions } from "@deno/doc";

function normalizeExclude(input: string | undefined): string[] {
	if (!input) return [];
	return input
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

export function toResolvedFileUrl(filePath: string): string {
	return toFileUrl(resolve(filePath)).href;
}

export async function loadDocs(
	source: string,
	exclude: string = "",
	importMap: string,
) {
	const include = source;
	const defaultExcludes = ["_meta"];
	const userExcludes = normalizeExclude(exclude);
	const specifiers = await resolveSpecifiers(include, [
		...defaultExcludes,
		...userExcludes,
	]);
	const docOptions: DocOptions = {
		importMap: toResolvedFileUrl(importMap),
		printImportMapDiagnostics: false,
	};

	return await doc(specifiers, docOptions);
}

export function buildGlob(
	input: string | string[],
	defaultExt = ".ts",
): string[] {
	const items = Array.isArray(input) ? input : [input];

	return items.map((item) => {
		const trimmed = item.replace(/\\/g, "/").replace(/\/+$/, "");

		// Case 1: Already a glob
		if (trimmed.includes("*")) {
			return trimmed;
		}

		// Case 2: Looks like a file (has an extension)
		if (extname(trimmed)) {
			return trimmed;
		}

		// Case 3: Folder → expand to folder/**/*.ts
		return `${trimmed}/**/*${defaultExt}`;
	});
}

export async function buildSpecifiers(inputGlob: string): Promise<string[]> {
	const pattern = globToRegExp(inputGlob);

	// Derive the root folder from the glob
	const root = inputGlob.split("*")[0] || ".";
	const rootDir = root.replace(/\/+$/, "") || ".";

	const specifiers: string[] = [];

	for await (
		const entry of walk(rootDir, {
			includeDirs: false,
			followSymlinks: false,
		})
	) {
		const path = entry.path;

		if (!path.endsWith(".ts")) continue;

		if (pattern.test(path)) {
			const url = toResolvedFileUrl(path);
			specifiers.push(url);
			//console.log(`✅ In selection: ${url}`);
		}
	}

	return specifiers;
}

export async function resolveSpecifiers(
	source: string | string[],
	exclude: string[],
) {
	const includeGlobs = buildGlob(source);
	const excludeGlobs = exclude.map((e) => e.toLowerCase());

	const all: string[] = [];

	for (const glob of includeGlobs) {
		const files = await buildSpecifiers(glob);
		all.push(...files);
	}

	// Apply excludes
	const filtered = all.filter((file) => {
		const lower = file.toLowerCase();
		return !excludeGlobs.some((ex) => lower.includes(ex));
	});

	return Array.from(new Set(filtered));
}
