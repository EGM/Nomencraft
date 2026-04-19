import { ensureDir } from "@std/fs";
import {
	allSymbols,
	excludeByFilenames,
	parseDoc,
} from "./lib/parse-helpers.ts";
import { docNodeToMarkdown } from "./lib/doc-helpers.ts";
import { DELIMITER, normalize, resolve, SEPARATOR } from "@std/path";
import { DocFileMap, DocNode, DocSymbol } from "./lib/types.ts";
import { validateToString } from "../utils/validateToString.ts";

// Set up filters, maps, sorts here.
const notMetaOrTest = excludeByFilenames(["/_meta/", ".test."]);

async function main() {
	// CLI Arguments
	const [srcDir, outDir] = Deno.args;
	if (!srcDir || !outDir) {
		console.error(
			"Usage: deno run --allow-read --allow-write --allow-run gen.ts <srcDir> <outDir>",
		);
		Deno.exit(1);
	}

	// Deno Doc Execution
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
	const doc = parseDoc(raw);

	//cons flt = doc.nodes.map(x => x.nap)

	let markdown = "";
	let count = 0;
	for (const [file, node] of Object.entries(doc.nodes)) {
		for (const symbol of node.symbols.filter(notMetaOrTest)) {
			markdown += docNodeToMarkdown(node, symbol.name);
			count++;
		}
	}

	await ensureDir(outDir);
	const docPath = resolve(outDir, "API.md");
	console.info(
		`✅ ${count} symbols have been written to: API docs in ${docPath}`,
	);
	await Deno.writeTextFile(docPath, markdown, { create: true });
	//await Deno.writeTextFile(docPath, JSON.stringify(allSymbols(doc)), {		create: true,	});
}

await main().catch((e) => {
	console.error("❌ Error:", e);
	Deno.exit(1);
});
