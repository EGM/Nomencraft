import { ensureDir } from "@std/fs";
import {
	allFilePaths,
	allSymbols,
	filterByType,
	filterByTypes,
	makeSafeFilename,
	mapToNames,
	parseDoc,
	shortenPath,
	sortByNames,
} from "./helpers.ts";
import { sortKeys } from "./hdf.ts";

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

	//	console.log("✅ Successfully parsed deno doc output.");
	//	console.log(`📄 Found ${Object.keys(doc.nodes).length} files/modules.`);
	//	console.log(`📌 Found ${allSymbols(doc).length} symbols across all modules.`,);
	//	console.log(`📂 File paths: ${allFilePaths(doc).map(shortenPath).join(", ")}`,);
	//	console.log(`Symbols: ${allSymbols(doc).map((s) => s.name).join(", ")}`);
	//	console.log(`✅ BaseComponent found: ${allSymbols(doc).some((s) => s.name === "BaseComponent")}`,);
	//	console.log(		`✅ BaseComponent declarations: ${JSON.stringify(allSymbols(doc).filter((s) => s.name === "BaseComponent")
	//				.flatMap((s) => s.declarations ?? []),			)		}`,	);

	//	console.log(allSymbols(doc).filter(filterByType("class")).sort(sortByNames).map(mapToNames),	);
	// console.log(allSymbols(doc).filter(filterByTypes(["class", "function"])).sort(sortByNames).map(mapToNames),	);

	await ensureDir(outDir);

	const stable = sortKeys(doc);
	Deno.writeTextFileSync(
		`${Deno.cwd()}\\gen_stable.json`,
		JSON.stringify(stable, null, 2),
	);
}

await main().catch((e) => {
	console.error("❌ Error:", e);
	Deno.exit(1);
});
