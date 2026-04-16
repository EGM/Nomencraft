// gen_md_docs.ts
// Usage: deno run --allow-read --allow-write --allow-run gen_md_docs.ts <srcDir> <outDir>
// Deno 2.7+ compatible. Produces index.md and one .md per module. Renders @context and @agent tags.
import { join } from "@std/path";
import { byModule, indexEntries } from "./gen_md_docs.ts";
import type { DenoDocV2Output, Param, Signature, DocItem, DocTag, TypeNode, IndexEntry} from "./gen_md_docs_types.ts";

export const trim = (s = "") => String(s ?? "").trim();
export const mdHeader = (level: number, text: string) => `${"#".repeat(level)} ${text}\n\n`;
export const codeBlock = (lang: string, content: string) => `\`\`\`${lang}\n${content}\n\`\`\`\n\n`;

export const getKind = (item: DocItem): string =>  item.declarations?.[0]?.kind ?? item.kind ?? "unknown" ;

export function extractTags(tags: DocTag[] = [], names: string[]): DocTag[] {
  if (!Array.isArray(tags)) return [];
  return tags.filter((t) => names.includes(t.name));
}
 
export function shortenPath(path: string): string {
  const parts = path.split("/");
  const srcIndex = parts.findIndex(p => p === "src");
  if (srcIndex >= 0) {
    return parts.slice(srcIndex).join("/");
  }
  return path;
}

export function makeSafeFilename(name: string): string {
  return name.replace(/[:\/\\]/g, "_").replace(/^_+/, "")
}

// Helper functions to normalize and flatten the DenoDoc output into a more consistent structure for rendering
export function normalizeData(raw: DenoDocV2Output): DocItem[] {
  const allItems: DocItem[] = [];

  for (const [filePath, fileNode] of Object.entries(raw.nodes)) {
    const symbols = fileNode.symbols || [];
    
    for (const symbol of symbols) {
      // Ensure location has the filename
      if (!symbol.location && filePath) {
        symbol.location = { filename: filePath, line: 1, col: 0 };
      } else if (symbol.location && !symbol.location.filename && filePath) {
        symbol.location.filename = filePath;
      }
      
      // Flatten members if they exist (for classes/interfaces)
      if (symbol.members && Array.isArray(symbol.members)) {
        // Add the parent symbol first
        allItems.push(symbol);
        // Then add members as separate items (optional, or keep nested)
        // For now, we keep them nested in the parent, but we ensure they are accessible
      } else {
        allItems.push(symbol);
      }
    }
  }

  console.log(`✅ Extracted ${allItems.length} symbols.`);
  return allItems;
}

export function renderSignature(sig: Signature): string {
  const params = (sig.params || []).map((p: Param) => {
    const optional = p.optional ? "?" : "";
    const typeStr = p.tsType ?? renderType(p.type) ?? "any";
    return `${p.name}${optional}: ${typeStr}`;
  }).join(", ");
  const ret = sig.returns ? (sig.returns.tsType ?? renderType(sig.returns.type) ?? "void") : "void";
  const name = sig.name ?? "";
  return `function ${name}(${params}): ${ret}`;
}

export function renderTags(tags: DocTag[] = []): string {
  if (!Array.isArray(tags) || tags.length === 0) return "";
  return tags.map(t => `- **@${t.name}** ${trim(t.text)}`).join("\n") + "\n\n";
}

export function renderType(t: TypeNode | undefined | null): string {
  if (!t) return "unknown";
  if (typeof t === "string") return t;
  const typeKind = (t as any).typeKind;

  switch (typeKind) {
    case "intrinsic": return (t as any).name ?? "unknown";
    case "reference": {
      const ref = t as any;
      const args = (ref.typeArgs || []).map(renderType).join(", ");
      return (ref.name ?? "unknown") + (args ? `<${args}>` : "");
    }
    case "union": return (t as any).types?.map(renderType).join(" | ") ?? "unknown";
    case "intersection": return (t as any).types?.map(renderType).join(" & ") ?? "unknown";
    case "literal": return JSON.stringify((t as any).value);
    case "tuple": return `[${(t as any).elemTypes?.map(renderType).join(", ") ?? ""}]`;
    case "object": {
      const obj = t as any;
      const props = (obj.properties || []).map((p: any) => `${p.name}${p.optional ? "?" : ""}: ${renderType(p.type)}`);
      return `{ ${props.join("; ")} }`;
    }
    case "function": {
      const fn = t as any;
      const params = (fn.parameters || []).map((p: any) => `${p.name ?? "_"}: ${renderType(p.type)}`).join(", ");
      return `(${params}) => ${renderType(fn.returnType)}`;
    }
    default: return typeof t === "object" ? JSON.stringify(t) : String(t);
  }
}