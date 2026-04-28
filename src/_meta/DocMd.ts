import {
	Declaration,
	DeclarationClass,
	doc,
	DocOptions,
	Document,
	Import,
	IndexCtx,
	JsDoc,
	Symbol,
} from "@deno/doc";
import { command } from "./dmd/buildCommand.ts";
import { loadDocs } from "./dmd/loadDocs.ts";
import { basename } from "@std/path";
import { classHeaderTemplate } from "./dmd/classHeader.tmpl.ts";
import { processDocument } from "./dmd/processDocument.ts";
import { ensureDir } from "@std/fs";

// start:
await command
	.action(async ({ exclude, output }, source) => {
		output = output ?? "docs";
		ensureDir(output);

		const docs = await loadDocs(source, exclude, "deno.json");
		const firstDoc = docs[Object.keys(docs)[0]];
		const markdown = processDocument(firstDoc);
		console.log(markdown);
		await Deno.writeTextFile(
			`${output}/ComponentTemplate.md`,
			markdown.toString(),
		);

		//%% The Rest... %%

		const indexDoc = Object.keys(docs);
		for (let i = 1; i < indexDoc.length; i++) {
			const otherDoc = docs[indexDoc[i]];
			console.log(processDocument(otherDoc));
		}
	})
	.parse(Deno.args);

Deno.exit();
