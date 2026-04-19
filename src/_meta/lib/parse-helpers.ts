// deno-lint-ignore-file no-explicit-any
import type {
	DocDeclaration,
	DocFileMap,
	DocSymbol,
	JsDoc,
	JsDocTag,
} from "./types.ts";

// runtime guard + parse
/**
 * @name parseDoc
 * @function
 * @param {string} raw
 * @returns {DocFileMap}
 * @access public
 * @throws {Error}
 * @description todo
 */
export function parseDoc(raw: string): DocFileMap {
	const parsed = JSON.parse(raw);
	if (
		typeof parsed !== "object" ||
		parsed === null ||
		typeof (parsed as any).version !== "number" ||
		typeof (parsed as any).nodes !== "object" ||
		(parsed as any).nodes === null
	) {
		throw new Error("Unexpected deno doc JSON");
	}
	return parsed as DocFileMap;
}

/**
 * @name allSymbols
 * @function
 * @param {DocFileMap} doc
 * @returns {DocSymbol[]}
 * @access public
 * @description todo
 */
export function allSymbols(doc: DocFileMap): DocSymbol[] {
	const out: DocSymbol[] = [];
	for (const node of Object.values(doc.nodes)) {
		if (!Array.isArray(node.symbols)) continue;
		out.push(...node.symbols);
	}
	return out;
}

/** todo */
export function mapToNames(s: DocSymbol): string {
	return s.name;
}

/** todo */
export function sortByNames(a: DocSymbol, b: DocSymbol): number {
	return a.name.localeCompare(b.name);
}

/** todo */
export function filterByType(type: string): (sym: DocSymbol) => boolean {
	return (sym: DocSymbol): boolean => {
		if (!sym.declarations) return false;
		return sym.declarations.some((d) => d.kind === type);
	};
}

/** todo */
export function filterByTypes(types: string[]): (sym: DocSymbol) => boolean {
	return (sym: DocSymbol): boolean => {
		if (!sym.declarations) return false;
		return sym.declarations.some((d) => types.includes(d.kind || ""));
	};
}

/**
 * @name allFilePaths
 * @function
 * @param {DocFileMap} doc
 * @returns {string[]}
 * @access public
 * @description todo
 */
export function allFilePaths(doc: DocFileMap): string[] {
	return Object.keys(doc.nodes);
}

// export type ExcludeByFilenames = (	exclude: string[]) => (sym: DocSymbol) => boolean;

/**
 * @name excludeByFilenames
 * @function
 * @param {string[]} exclude
 * @returns {(sym: DocSymbol) => boolean}
 * @access public
 * @description todo
 */
export function excludeByFilenames(
	exclude: string[],
): (sym: DocSymbol) => boolean {
	return (sym: DocSymbol): boolean => {
		if (!sym.declarations) return true;
		return sym.declarations.every((d) => {
			const filename = d.location?.filename || "";
			return !exclude.some((substr) => filename.includes(substr));
		});
	};
}

/** todo */
export const extractDoc = (dec: DocDeclaration): string => dec.jsDoc?.doc || "";

/** todo */
export const extractDocTags = (dec: DocDeclaration): JsDocTag[] =>
	dec.jsDoc?.tags || [];
