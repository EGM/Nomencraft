// deno-lint-ignore-file no-explicit-any
import type {
	DocDeclaration,
	DocFileMap,
	DocSymbol,
	JsDoc,
	JsDocTag,
} from "./types.ts";

// runtime guard + parse
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

export function allSymbols(doc: DocFileMap): DocSymbol[] {
	const out: DocSymbol[] = [];
	for (const node of Object.values(doc.nodes)) {
		if (!Array.isArray(node.symbols)) continue;
		out.push(...node.symbols);
	}
	return out;
}

export const mapToNames = (s: DocSymbol) => s.name;

export const sortByNames = (a: DocSymbol, b: DocSymbol) =>
	a.name.localeCompare(b.name);

export const filterByType = (type: string) => (sym: DocSymbol) => {
	if (!sym.declarations) return false;
	return sym.declarations.some((d) => d.kind === type);
};

export const filterByTypes = (types: string[]) => (sym: DocSymbol) => {
	if (!sym.declarations) return false;
	return sym.declarations.some((d) => types.includes(d.kind || ""));
};

export function allFilePaths(doc: DocFileMap): string[] {
	return Object.keys(doc.nodes);
}

export const excludeByFilenames = (exclude: string[]) => (sym: DocSymbol) => {
	if (!sym.declarations) return true; // Keep symbols with no declarations (safe default)
	return sym.declarations.every((d) => {
		const filename = d.location?.filename || "";
		return !exclude.some((substr) => filename.includes(substr));
	});
};

export const extractDoc = (dec: DocDeclaration): string => dec.jsDoc?.doc || "";

export const extractDocTags = (dec: DocDeclaration): JsDocTag[] =>
	dec.jsDoc?.tags || [];
