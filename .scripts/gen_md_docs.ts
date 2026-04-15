// gen_md_docs.ts
// Usage: deno run --allow-read --allow-write --allow-run gen_md_docs.ts <srcDir> <outDir>
// Deno 2.7+ compatible. Produces index.md and one .md per module. Renders @context and @agent tags.

import { join, basename } from "@std/path";
import { ensureDir } from "@std/fs";
import type { 
  DenoDocV2Output,
  DocItem,
  IndexEntry,
  DocTag, 
  Signature, 
  Param, 
  TypeNode 
} from "./doc_types.ts";
import { normalizeData, renderType, extractTags,renderSignature,renderTags,trim } from "./gen_md_docs_helpers.ts";

// -----------------------------------------------------------------------------
// CLI Arguments
// -----------------------------------------------------------------------------

const [srcDir, outDir] = Deno.args;
if (!srcDir || !outDir) {
  console.error("Usage: deno run --allow-read --allow-write --allow-run gen_md_docs.ts <srcDir> <outDir>");
  Deno.exit(1);
}

// -----------------------------------------------------------------------------
// Deno Doc Execution
// -----------------------------------------------------------------------------

const cmd = new Deno.Command("deno", {
  args: ["doc", "--json", srcDir],
  stdin: "null",
  stdout: "piped",
  stderr: "inherit",
});

const proc = cmd.spawn();
const { code, stdout } = await proc.output();

if (code !== 0) {
  console.error("❌ deno doc failed");
  Deno.exit(1);
}

const raw = new TextDecoder().decode(stdout);
let rawData: DenoDocV2Output;

try {
  rawData = JSON.parse(raw);
  console.log("✅ Successfully parsed deno doc output.");
} catch (e) {
  console.error("❌ Failed to parse deno doc output:", e);
  Deno.exit(1);
}

// -----------------------------------------------------------------------------
// Normalize Data Structure
// -----------------------------------------------------------------------------

const data = normalizeData(rawData);

if (data.length === 0) {
  console.error("❌ No documentation items found.");
  Deno.exit(1);
}

// -----------------------------------------------------------------------------
// Output Directory Setup
// -----------------------------------------------------------------------------

// const ensureDir = async (path: string) => {
//  try { await Deno.mkdir(path, { recursive: true }); } catch {}
// };
await ensureDir(outDir);

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

const mdHeader = (level: number, text: string) => `${"#".repeat(level)} ${text}\n\n`;
const codeBlock = (lang: string, content: string) => `\`\`\`${lang}\n${content}\n\`\`\`\n\n`;

const indexEntries: IndexEntry[] = [];
const byModule = new Map<string, DocItem[]>();

// Group items by file
for (const item of data) {
  let filename = item.location?.filename;
  if (!filename) {
    if (item.id) {
      filename = item.id.split("#")[0];
    } else {
      filename = "unknown_file.ts";
    }
  }
  filename = filename.replace(/\\/g, "/");

  if (!byModule.has(filename)) {
    byModule.set(filename, []);
  }
  byModule.get(filename)!.push(item);
}

function shortenPath(path: string): string {
  const parts = path.split("/");
  const srcIndex = parts.findIndex(p => p === "src");
  if (srcIndex >= 0) {
    return parts.slice(srcIndex).join("/");
  }
  return path;
}


function makeSafeFilename(name: string): string {
  return name.replace(/[:\/\\]/g, "_").replace(/^_+/, "")
}

// Process each module
for (const [filename, items] of byModule) {
  const safeName = makeSafeFilename(shortenPath(filename));
  const moduleOut = join(outDir, `${safeName}.md`);

  indexEntries.push({
    mod: shortenPath(filename),
    path: `${safeName}.md`,
    count: items.length,
  });

  let out = "";
  out += mdHeader(1, `Module: ${filename}`);

  // Module description
  const modDoc = items.find(i => i.kind === "module");
  if (modDoc && modDoc.docs) {
    out += `${trim(modDoc.docs)}\n\n`;
  }

  // List all items
  if (items.length > 0) {
    out += "**Contents:**\n\n";
    for (const e of items) {
      const anchor = `${e.name ?? "anonymous"}-${e.kind ?? "item"}`;
      out += `- [${e.name ?? "(anonymous)"}](#${encodeURIComponent(anchor)}) — ${e.kind ?? "unknown"}\n`;
    }
    out += `\n`;
  }

  // Render each item
  for (const item of items) {
    const anchor = `${item.name ?? "anonymous"}-${item.kind ?? "item"}`;
    out += `<a id="${anchor}"></a>\n\n`;
    out += mdHeader(2, `${item.name ?? "(anonymous)"} — ${item.kind ?? "item"}`);

    // 1. Documentation
    if (item.docs) {
      out += `${trim(item.docs)}\n\n`;
    } else {
      // Fallback: Check if it's a class with members but no direct docs
      if (item.kind === "class" && item.members && item.members.length > 0) {
        out += `*(No module-level documentation)*\n\n`;
      }
    }

    // 2. Custom tags
    const contextTags = extractTags(item.tags || [], ["context"]);
    if (contextTags.length) {
      out += mdHeader(3, "Context");
      for (const t of contextTags) out += `- **@${t.name}** ${trim(t.text)}\n`;
      out += "\n";
    }

    const agentTags = extractTags(item.tags || [], ["agent"]);
    if (agentTags.length) {
      out += mdHeader(3, "Agent Notes");
      for (const t of agentTags) out += `- **@${t.name}** ${trim(t.text)}\n`;
      out += "\n";
    }

    out += renderTags(item.tags || []);

    // 3. Signatures (for functions/methods)
    if (item.signatures && item.signatures.length) {
      for (const sig of item.signatures) {
        out += codeBlock("ts", renderSignature(sig));
        if (sig.docs) out += `${trim(sig.docs)}\n\n`;
        out += renderTags(sig.tags || []);

        if (sig.params && sig.params.length) {
          out += "**Parameters:**\n\n";
          for (const p of sig.params) {
            const typeStr = p.tsType ?? renderType(p.type) ?? "any";
            const optional = p.optional ? "?" : "";
            out += `- \`${p.name}${optional}\` — ${typeStr}`;
            if (p.docs) out += ` — ${trim(p.docs)}`;
            out += "\n";
            
            const pContext = extractTags(p.tags || [], ["context"]);
            const pAgent = extractTags(p.tags || [], ["agent"]);
            for (const pt of pContext) out += `  - **@${pt.name}** ${trim(pt.text)}\n`;
            for (const pt of pAgent) out += `  - **@${pt.name}** ${trim(pt.text)}\n`;
          }
          out += "\n";
        }

        if (sig.returns && (sig.returns.docs || sig.returns.tsType)) {
          const retType = sig.returns.tsType ?? renderType(sig.returns.type) ?? "void";
          out += `**Returns:** ${retType}\n\n`;
          if (sig.returns.docs) out += `${trim(sig.returns.docs)}\n\n`;
        }
      }
    } 
    // 4. Type declarations
    else if (item.tsType || item.type) {
      const typeStr = item.tsType ?? renderType(item.type) ?? "any";
      out += codeBlock("ts", `type: ${typeStr}`);
    }

    // 5. Members (for classes, interfaces, enums)
    if (item.members && item.members.length) {
      out += mdHeader(3, "Members");
      for (const m of item.members) {
        // Render member name and kind
        const memberDoc = m.docs ? ` — ${trim(m.docs)}` : "";
        out += `- \`${m.name}\` (${m.kind})${memberDoc}\n`;
        
        // If member has signatures (methods), render them indented
        if (m.signatures && m.signatures.length) {
          for (const sig of m.signatures) {
            out += `  ${codeBlock("ts", renderSignature(sig))}`;
            if (sig.docs) out += `  ${trim(sig.docs)}\n\n`;
          }
        }
      }
      out += "\n";
    }
  }

  await Deno.writeTextFile(moduleOut, out);
}

// -----------------------------------------------------------------------------
// Generate Index
// -----------------------------------------------------------------------------

let indexOut = "";
indexOut += mdHeader(1, "API Documentation (Index)");
indexOut += `Generated from ${basename(srcDir)}\n\n`;

indexOut += "**Modules:**\n\n";
for (const entry of indexEntries) {
  indexOut += `- [${entry.mod}](${entry.path}) — ${entry.count} items\n`;
}
indexOut += "\n";

indexOut += mdHeader(2, "Tag Legend");
indexOut += "- **@context** — Human-readable context explaining why code exists or how to think about it.\n";
indexOut += "- **@agent** — Notes directed to automated agents; also useful to humans.\n\n";

indexOut += mdHeader(2, "Quick Links");
for (const entry of indexEntries) {
  indexOut += `- [${entry.mod}](${entry.path})\n`;
}
indexOut += "\n";

await Deno.writeTextFile(join(outDir, "index.md"), indexOut);

console.log(`✅ Wrote index.md and ${indexEntries.length} module files to ${outDir}`);
