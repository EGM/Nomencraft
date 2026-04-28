import { extname } from "@std/path";

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
