// deno-lint-ignore-file no-explicit-any
import { normalize } from "@std/path";
import type {
	DocDeclaration,
	DocFileMap,
	DocSymbol,
	JsDoc,
	JsDocTag,
} from "./types.ts";

export const trim = (s = "") => String(s ?? "").trim();
export const mdHeader = (level: number, text: string) =>
	`${"#".repeat(level)} ${text}\n\n`;
export const code = (lang: string, c: string) =>
	`\`\`\`${lang}\n${c}\n\`\`\`\n\n`;

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

export const extractDoc = (dec: DocDeclaration): string => dec.jsDoc?.doc || "";
export const extractDocTags = (dec: DocDeclaration): JsDocTag[] =>
	dec.jsDoc?.tags || [];
