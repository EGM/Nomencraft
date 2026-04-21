import {
	Declaration,
	DeclarationFunction,
	doc,
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

const records = await doc(["https://deno.land/std/fmt/colors.ts"]);
const colorsDoc: Document = records["https://deno.land/std/fmt/colors.ts"];

Deno.writeTextFileSync("example.jsonc", JSON.stringify(colorsDoc));

const { imports, moduleDoc, symbols }: Document = colorsDoc;

function renderTypeLiteral(lit: TsTypeLiteralDef): string {
	const parts: string[] = [];

	// Properties
	if (lit.properties) {
		for (const p of lit.properties) {
			const name = p.computed ? `[${p.name}]` : p.name;
			const opt = p.optional ? "?" : "";
			const type = renderTsType(p.tsType);
			parts.push(`${name}${opt}: ${type}`);
		}
	}

	// Methods
	if (lit.methods) {
		for (const m of lit.methods) {
			const name = m.computed ? `[${m.name}]` : m.name;
			const opt = m.optional ? "?" : "";
			const params = m.params.map(renderParam).join(", ");
			const ret = renderTsType(m.returnType);
			parts.push(`${name}${opt}(${params}): ${ret}`);
		}
	}

	// Call signatures
	if (lit.callSignatures) {
		for (const cs of lit.callSignatures) {
			const params = cs.params.map(renderParam).join(", ");
			const ret = renderTsType(cs.tsType);
			parts.push(`(${params}): ${ret}`);
		}
	}

	// Index signatures
	if (lit.indexSignatures) {
		for (const idx of lit.indexSignatures) {
			const params = idx.params.map(renderParam).join(", ");
			const ret = renderTsType(idx.tsType);
			parts.push(`[${params}]: ${ret}`);
		}
	}

	return parts.join("; ");
}

function renderObjectProp(p: ObjectPatPropDef): string {
	switch (p.kind) {
		case "assign":
			return p.value ? `${p.key}: ${p.value}` : p.key;

		case "keyValue":
			return `${p.key}: ${renderParam(p.value)}`;

		case "rest":
			return `...${renderParam(p.arg)}`;

		default:
			return "<prop>";
	}
}

function renderTsType(t?: TsTypeDef): string {
	if (!t) return "any";

	switch (t.kind) {
		case "keyword":
			return t.value;
		case "literal":
			return JSON.stringify(t.value);
		case "typeRef":
			return t.value.typeName +
				(t.value.typeParams
					? `<${t.value.typeParams.map(renderTsType).join(", ")}>`
					: "");
		case "union":
			return t.value.map(renderTsType).join(" | ");
		case "intersection":
			return t.value.map(renderTsType).join(" & ");
		case "array":
			return `${renderTsType(t.value)}[]`;
		case "tuple":
			return `[${t.value.map(renderTsType).join(", ")}]`;
		case "fnOrConstructor":
			return `(${t.value.params.map(renderParam).join(", ")}) => ${
				renderTsType(t.value.tsType)
			}`;
		case "typeLiteral":
			return `{ ${renderTypeLiteral(t.value)} }`;
		default:
			return t.repr ?? `<${t.kind}>`;
	}
}

function renderParam(p: ParamDef): string {
	switch (p.kind) {
		case "identifier":
			return `${p.name}${p.optional ? "?" : ""}: ${
				renderTsType(p.tsType)
			}`;
		case "rest":
			return `...${renderParam(p.arg)}`;
		case "array":
			return `[${
				p.elements.map((e) => e ? renderParam(e) : "").join(", ")
			}]`;
		case "object":
			return `{ ${p.props.map(renderObjectProp).join(", ")} }`;
		case "assign":
			return `${renderParam(p.left)} = ${p.right}`;
		default:
			return "<param>";
	}
}

function renderSignature(
	params: ParamDef[],
	returnType?: TsTypeDef,
	typeParams?: TsTypeParamDef[],
): string {
	const tps = typeParams?.length
		? `<${typeParams.map((tp) => tp.name).join(", ")}>`
		: "";

	const ps = params.map(renderParam).join(", ");

	const ret = returnType ? renderTsType(returnType) : "void";

	return `${tps}(${ps}): ${ret}`;
}

function renderFunction(dec: DeclarationFunction): string {
	const def = dec.def;

	return renderSignature(
		def.params,
		def.returnType,
		def.typeParams,
	);
}

function showSymbol(sym: Symbol): string {
	const dec = sym.declarations[0];

	switch (dec.kind) {
		case "function":
			return renderFunction(dec);

		case "variable":
			return renderTsType(dec.def.tsType);

		case "typeAlias":
			return renderTsType(dec.def.tsType);

		case "class":
			return "(class)";

		case "interface":
			return "(interface)";

		case "enum":
			return "(enum)";

		default:
			return `${dec.kind}`;
	}
}

function processImports(imports: Import[]): string {
	const md = "**Imports:**\n";
	const mdI = imports.map((i) => i.jsDoc?.doc).join("\n");
	return md + mdI;
}
function processModuleDoc(moduleDoc: JsDoc): string {
	const md = "**Documentation:**\n";
	const mdM = `${!moduleDoc.doc ? "" : moduleDoc.doc}\n`;
	return md + mdM;
}
function processSymbols(symbols: Symbol[]): string {
	return [
		"## Symbols",
		...symbols.map((s) => {
			const rendered = showSymbol(s);
			return `### ${s.name}\n\n\`${rendered}\``;
		}),
	].join("\n\n");
}

const mdImports = !imports ? "" : processImports(imports);
const mdModuleDoc = !moduleDoc ? "" : processModuleDoc(moduleDoc);
const mdSymbols = !symbols ? "" : processSymbols(symbols);

await Deno.writeTextFile("output.md", mdImports + mdModuleDoc + mdSymbols);
