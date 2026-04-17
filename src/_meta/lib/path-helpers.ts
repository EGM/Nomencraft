import { normalize } from "@std/path";

export function shortenPath(path: string): string {
	const parts = path.split("/");
	const srcIndex = parts.findIndex((p) => p === "src");
	if (srcIndex >= 0) {
		return parts.slice(srcIndex).join("/");
	}
	return path;
}

export function removeCwd(path: string): string {
	const cwd = normalize(Deno.cwd());
	const loc = path.indexOf(cwd);
	return loc === -1 ? path : path.slice(cwd.length + loc + 1);
}

export const makeSafeFilename = (name: string): string =>
	name.replace(/[:\/\\]/g, "_").replace(/^_+/, "");
