import { normalize } from "@std/path";

/**
 * @name shortenPath
 * @function
 * @param {string} path
 * @returns {string}
 * @access public
 * @description todo
 */
export function shortenPath(path: string): string {
	const parts = path.split("/");
	const srcIndex = parts.findIndex((p) => p === "src");
	if (srcIndex >= 0) {
		return parts.slice(srcIndex).join("/");
	}
	return path;
}

/**
 * @name removeCwd
 * @function
 * @param {string} path
 * @returns {string}
 * @access public
 * @description todo
 */
export function removeCwd(path: string): string {
	const cwd = normalize(Deno.cwd());
	const loc = path.indexOf(cwd);
	return loc === -1 ? path : path.slice(cwd.length + loc + 1);
}

/**
 * @name makeSafeFilename
 * @function
 * @param {string} name
 * @returns {string}
 * @access public
 * @description todo
 */
export function makeSafeFilename(name: string): string {
	return name.replace(/[:\/\\]/g, "_").replace(/^_+/, "");
}
