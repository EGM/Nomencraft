// deno-lint-ignore-file no-explicit-any
interface DocFileMap {
	version: number;
	nodes: Record<string, DocNode>;
}

interface DocNode {
	symbols: DocSymbol[];
}

interface DocSymbol {
	name: string;
	declarations?: DocDeclaration[];
}

interface DocDeclaration {
	location?: DocLocation;
	declarationKind?: string;
	jsDoc?: JsDoc;
	kind?: string;
	def?: DocDef;
	hasBody?: boolean;
	name?: string;
	params?: DocParam[];
	declaration?: any;
}

interface DocLocation {
	filename: string;
	line: number;
	col: number;
	byteIndex?: number;
}

interface JsDoc {
	doc?: string;
	tags?: JsDocTag[];
}

interface JsDocTag {
	kind?: string;
	name?: string;
	value?: string;
	tsType?: TsType;
}

interface TsType {
	repr?: string;
	kind?: string;
	value?: string;
}

interface DocDef {
	isAbstract?: boolean;
	constructors?: DocFunction[];
	properties?: DocProperty[];
	methods?: DocMethod[];
	extends?: string;
	[key: string]: any;
}

interface DocFunction {
	jsDoc?: JsDoc;
	hasBody?: boolean;
	name?: string;
	params?: DocParam[];
	location?: DocLocation;
}

interface DocParam {
	kind?: string;
	name?: string;
	optional?: boolean;
	tsType?: TsType;
}

interface DocProperty {
	jsDoc?: JsDoc;
	tsType?: TsType;
	readonly?: boolean;
	name?: string;
	location?: DocLocation;
}

interface DocMethod {
	jsDoc?: JsDoc;
	accessibility?: string;
	name?: string;
	kind?: string;
	functionDef?: FunctionDef;
	location?: DocLocation;
}

interface FunctionDef {
	params?: DocParam[];
	returnType?: TsType;
	hasBody?: boolean;
}

type AnyJson = string | number | boolean | null | AnyJson[] | {
	[key: string]: AnyJson;
};

function shortenPath(path: string): string {
	const parts = path.split("/");
	const srcIndex = parts.findIndex((p) => p === "src");
	if (srcIndex >= 0) {
		return parts.slice(srcIndex).join("/");
	}
	return path;
}

function makeSafeFilename(name: string): string {
	return name.replace(/[:\/\\]/g, "_").replace(/^_+/, "");
}

// runtime guard + parse
function parseDoc(raw: string): DocFileMap {
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

// 1) Return ALL symbols across all nodes (flattened array)
function allSymbols(doc: DocFileMap): DocSymbol[] {
	const out: DocSymbol[] = [];
	for (const node of Object.values(doc.nodes)) {
		if (!Array.isArray(node.symbols)) continue;
		out.push(...node.symbols);
	}
	return out;
}

// 2) Return ALL file paths (node keys are file paths)
function allFilePaths(doc: DocFileMap): string[] {
	return Object.keys(doc.nodes);
}

async function main() {
	// CLI Arguments
	const [srcDir, outDir] = Deno.args;
	if (!srcDir || !outDir) {
		console.error(
			"Usage: deno run --allow-read --allow-write --allow-run gen_md_docs.ts <srcDir> <outDir>",
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

	console.log("✅ Successfully parsed deno doc output.");
	console.log(`📄 Found ${Object.keys(doc.nodes).length} files/modules.`);
	console.log(
		`📌 Found ${allSymbols(doc).length} symbols across all modules.`,
	);
	console.log(
		`📂 File paths: ${allFilePaths(doc).map(shortenPath).join(", ")}`,
	);
}

await main().catch((e) => {
	console.error("❌ Error:", e);
	Deno.exit(1);
});
