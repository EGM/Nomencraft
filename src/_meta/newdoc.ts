import { doc } from "@deno/doc";
import type {
	Declaration,
	DeclarationFunction,
	DocNodeKind,
	Document,
	FunctionDef,
	Import,
	JsDoc,
	ObjectPatPropDef,
	ParamDef,
	Symbol,
	TsTypeDef,
	TsTypeLiteralDef,
	TsTypeParamDef,
} from "@deno/doc";

import { globToRegExp, resolve, toFileUrl } from "@std/path";
import { walk } from "@std/fs/walk";

export async function newCollectSpecifiers(): Promise<string[]> {
	const pattern = globToRegExp("src/**/*.ts");

	const specifiers: string[] = [];

	for await (
		const entry of walk("./src", {
			includeDirs: false,
			followSymlinks: false,
		})
	) {
		const path = entry.path;

		if (!path.endsWith(".ts")) continue;
		if (path.includes("test") || path.includes("meta")) continue;

		if (pattern.test(path)) {
			const abs = resolve(path);
			const url = toFileUrl(abs).href; // ← THE FIX
			specifiers.push(url);
			console.log(`✅ In selection: ${url}`);
		}
	}

	return specifiers;
}

export async function collectSpecifiers(): Promise<string[]> {
	const pattern = globToRegExp("src\\**\\*.ts");

	const specifiers: string[] = [];

	for await (
		const entry of walk("./src", {
			includeDirs: false,
			followSymlinks: false,
		})
	) {
		const path = entry.path;

		// Exclude anything containing "test" or "meta"
		if (path.includes("test") || path.includes("meta")) continue;

		// Match the glob
		if (pattern.test(path)) {
			// doc() accepts absolute paths or file URLs as strings
			specifiers.push(toFileUrl(resolve(path)).href);
			console.log(`✅ In selection: ${path}`);
		} else {
			console.log(`❌ Not in selection: ${path}`);
		}
	}

	return specifiers;
}

const specifiers = await newCollectSpecifiers();
console.log(`URLs: ${specifiers}`);
const importMapUrl = toFileUrl(resolve("deno.json")).href;
const docs = await doc(specifiers, {
	importMap: importMapUrl,
	printImportMapDiagnostics: true,
});
//console.log(`Docs: ${JSON.stringify(docs)}`);
Deno.writeTextFileSync("docs.jsonc", JSON.stringify(docs));
const keys = Object.keys(docs);
console.log(`Keys: ${keys}`);

Deno.exit();
