// generate_docs.ts
// Usage: deno run --allow-read --allow-write --allow-run generate_docs.ts <srcDir> <outDir>
// Deno 2.7+ compatible. Produces index.md and one .md per module. Renders @context and @agent tags.

import {  join, basename } from "@std/path";

const [srcDir, outDir] = Deno.args;
if (!srcDir || !outDir) {
  console.error("Usage: deno run --allow-read --allow-write --allow-run generate_docs.ts <srcDir> <outDir>");
  Deno.exit(1);
}

// run `deno doc --json <srcDir>`
const cmd = new Deno.Command("deno", {
  args: ["doc", "--json", srcDir],
  stdin: "null",
  stdout: "piped",
  stderr: "inherit",
});
const proc = cmd.spawn();
const rawBytes = await proc.output();
const status = await proc.status;
if (!status.success) {
  console.error("deno doc failed");
  Deno.exit(1);
}
const raw = new TextDecoder().decode(rawBytes.stdout);
let data: any[];
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error("failed to parse deno doc output:", e);
  Deno.exit(1);
}

const ensureDir = async (p: string) => {
  try { await Deno.mkdir(p, { recursive: true }); } catch {}
};
await ensureDir(outDir);

const trim = (s = "") => String(s ?? "").trim();
const mdHeader = (level: number, text: string) => `${"#".repeat(level)} ${text}\n\n`;
const code = (lang: string, c: string) => `\`\`\`${lang}\n${c}\n\`\`\`\n\n`;

const byModule = new Map<string, any[]>();
for (const item of data) {
  const filename = item.location?.filename ?? (item.id ? item.id.split("#")[0] : "root");
  const mod = filename;
  if (!byModule.has(mod)) byModule.set(mod, []);
  byModule.get(mod)!.push(item);
}

function renderType(t: any): string {
  if (!t) return "";
  if (typeof t === "string") return t;
  switch (t.typeKind) {
    case "intrinsic": return t.name;
    case "reference": {
      const args = (t.typeArgs || []).map(renderType).join(", ");
      return (t.name ?? "") + (args ? `<${args}>` : "");
    }
    case "union": return (t.types || []).map(renderType).join(" | ");
    case "intersection": return (t.types || []).map(renderType).join(" & ");
    case "literal": return JSON.stringify(t.value);
    case "tuple": return `[${(t.elemTypes||[]).map(renderType).join(", ")}]`;
    case "object": {
      const props = (t.properties||[]).map((p: any) => `${p.name}${p.optional ? "?" : ""}: ${renderType(p.type)}`);
      return `{ ${props.join("; ")} }`;
    }
    case "function": {
      const params = (t.parameters||[]).map((p:any)=>`${p.name ?? "_"}: ${renderType(p.type)}`).join(", ");
      return `(${params}) => ${renderType(t.returnType)}`;
    }
    default:
      return typeof t === "object" ? JSON.stringify(t) : String(t);
  }
}

function renderSignature(sig: any): string {
  const params = (sig.params || []).map((p: any) => {
    const optional = p.optional ? "?" : "";
    const t = p.tsType ?? renderType(p.type) ?? "any";
    return `${p.name}${optional}: ${t}`;
  }).join(", ");
  const ret = sig.returns ? (sig.returns.tsType ?? renderType(sig.returns.type)) : "void";
  const name = sig.name ?? "";
  return `function ${name}(${params}): ${ret}`;
}

function renderTags(tags: any[] = []): string {
  if (!Array.isArray(tags) || tags.length === 0) return "";
  return tags.map(t => `- **@${t.name}** ${t.text ?? ""}`).join("\n") + "\n\n";
}

function extractTags(tags: any[] = [], names: string[]) {
  if (!Array.isArray(tags)) return [];
  return tags.filter((t: any) => names.includes(t.name)).map((t: any) => ({ name: t.name, text: t.text ?? "" }));
}

const indexEntries: { mod: string; path: string; count: number }[] = [];

for (const [mod, items] of byModule) {
  const safeName = mod === "root" ? "root" : mod.replace(/[:\/\\]/g, "_");
  const moduleOut = join(outDir, `${safeName}.md`);
  indexEntries.push({ mod, path: `${safeName}.md`, count: items.length });

  let out = "";
  out += mdHeader(1, `Module: ${mod}`);
  const modDoc = items.find((i:any)=>i.kind === "module") ?? null;
  if (modDoc && modDoc.docs) out += `${trim(modDoc.docs)}\n\n`;

  const exports = items.filter((i:any)=>i.isExport);
  if (exports.length) {
    out += "**Exports:**\n\n";
    for (const e of exports) {
      const anchor = `${e.name ?? "anonymous"}-${e.kind ?? "item"}`;
      out += `- [${e.name ?? "(anonymous)"}](#${encodeURIComponent(anchor)}) — ${e.kind ?? "unknown"}\n`;
    }
    out += `\n`;
  }

  for (const item of exports) {
    const anchor = `${item.name ?? "anonymous"}-${item.kind ?? "item"}`;
    out += `<a id="${encodeURIComponent(anchor)}"></a>\n\n`;
    out += mdHeader(2, `${item.name ?? "(anonymous)"} — ${item.kind ?? "item"}`);
    if (item.docs) out += `${trim(item.docs)}\n\n`;

    // canonical custom tags: @context and @agent
    const contextTags = extractTags(item.tags || [], ["context"]);
    if (contextTags.length) {
      out += mdHeader(3, "Context");
      for (const t of contextTags) out += `- **@${t.name}** ${trim(t.text)}\n`;
      out += `\n`;
    }
    const agentTags = extractTags(item.tags || [], ["agent"]);
    if (agentTags.length) {
      out += mdHeader(3, "Agent Notes");
      for (const t of agentTags) out += `- **@${t.name}** ${trim(t.text)}\n`;
      out += `\n`;
    }

    out += renderTags(item.tags || []);

    if (item.signatures && item.signatures.length) {
      for (const sig of item.signatures) {
        out += code("ts", renderSignature(sig));
        if (sig.docs) out += `${trim(sig.docs)}\n\n`;
        out += renderTags(sig.tags || []);
        if (sig.params && sig.params.length) {
          out += `**Parameters:**\n\n`;
          for (const p of sig.params) {
            const pTags = extractTags(p.tags || [], ["context", "agent"]);
            out += `- \`${p.name}${p.optional ? "?" : ""}\` — ${p.tsType ?? (renderType(p.type) || "any")}${p.docs ? ` — ${trim(p.docs)}` : ""}\n`;
            for (const pt of pTags) out += `  - **@${pt.name}** ${trim(pt.text)}\n`;
          }
          out += `\n`;
        }
        if (sig.returns && (sig.returns.docs || sig.returns.tsType)) {
          out += `**Returns:** ${sig.returns.tsType ?? (renderType(sig.returns.type) || "void")}\n\n`;
          if (sig.returns.docs) out += `${trim(sig.returns.docs)}\n\n`;
        }
      }
    } else if (item.type || item.tsType) {
      out += code("ts", `type: ${item.tsType ?? (renderType(item.type) || "any")}`);
    }

    if (item.members && item.members.length) {
      out += mdHeader(3, "Members");
      for (const m of item.members) {
        out += `- \`${m.name}\` (${m.kind})${m.docs ? ` — ${trim(m.docs)}` : ""}\n`;
      }
      out += `\n`;
    }
  }

  await Deno.writeTextFile(moduleOut, out);
}

// build index.md with legend for tags
let indexOut = "";
indexOut += mdHeader(1, "API Documentation (Index)");
indexOut += `Generated from ${basename(srcDir)}\n\n`;
indexOut += "**Modules:**\n\n";
for (const e of indexEntries) {
  indexOut += `- [${e.mod}](${e.path}) — ${e.count} items\n`;
}
indexOut += `\n`;

indexOut += mdHeader(2, "Tag Legend");
indexOut += "- **@context** — human-readable context explaining why code exists or how to think about it.\n";
indexOut += "- **@agent** — notes directed to an automated agent (or future tool); also useful to humans.\n\n";

indexOut += mdHeader(2, "Quick Links");
for (const e of indexEntries) {
  indexOut += `- [${e.mod}](${e.path})\n`;
}
indexOut += `\n`;

await Deno.writeTextFile(join(outDir, "index.md"), indexOut);
console.log("Wrote index.md and", indexEntries.length, "module files to", outDir);
