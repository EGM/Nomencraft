// processClass.ts
// deno-lint-ignore-file no-explicit-any
import { md } from "@tmpl/core";
import type {
	ClassConstructorDef,
	ClassMethodDef,
	DeclarationClass,
	ObjectPatPropDef,
	ParamDef,
	TsFnOrConstructorDef,
	TsTypeDef,
} from "@deno/doc";
import { classHeaderTemplate } from "./classHeader.tmpl.ts";

function renderLiteral(value: any): string {
	return "";
}
function renderTypeRef(value: any): string {
	return "";
}
function renderFnOrConstructor(t: TsFnOrConstructorDef): string {
	const params = t.params.map((p) => {
		const name = p.name ?? "arg";
		const type = renderType(p.tsType);
		return type ? `${name}: ${type}` : name;
	}).join(", ");

	const ret = renderType(t.tsType);
	return `(${params}) => ${ret}`;
}
function renderConditional(value: any): string {
	return "";
}
function renderImportType(value: any): string {
	return "";
}
function renderMapped(value: any): string {
	return "";
}
function renderTypeLiteral(value: any): string {
	return "";
}
function renderTypePredicate(value: any): string {
	return "";
}

function renderType(t?: TsTypeDef): string {
	if (!t) return "";

	switch (t.kind) {
		case "keyword":
			return t.value; // string

		case "literal":
			return renderLiteral(t.value);

		case "typeRef":
			return renderTypeRef(t.value);

		case "union":
			return t.value.map(renderType).join(" | ");

		case "intersection":
			return t.value.map(renderType).join(" & ");

		case "array":
			return `${renderType(t.value)}[]`;

		case "tuple":
			return `[${t.value.map(renderType).join(", ")}]`;

		case "typeOperator":
			return `${t.value.operator} ${renderType(t.value.tsType)}`;

		case "parenthesized":
			return `(${renderType(t.value)})`;

		case "rest":
			return `...${renderType(t.value)}`;

		case "optional":
			return `${renderType(t.value)}?`;

		case "typeQuery":
			return `typeof ${t.value}`;

		case "this":
			return "this";

		case "fnOrConstructor":
			return renderFnOrConstructor(t.value);

		case "conditional":
			return renderConditional(t.value);

		case "importType":
			return renderImportType(t.value);

		case "infer":
			return `infer ${t.value.typeParam.name}`;

		case "indexedAccess":
			return `${renderType(t.value.objType)}[${
				renderType(t.value.indexType)
			}]`;

		case "mapped":
			return renderMapped(t.value);

		case "typeLiteral":
			return renderTypeLiteral(t.value);

		case "typePredicate":
			return renderTypePredicate(t.value);

		default:
			return "unknown";
	}
}

function renderFunctionType(t: TsFnOrConstructorDef): string {
	const params = t.params.map((p) => {
		const name = p.name ?? "arg";
		const type = renderType(p.tsType);
		return type ? `${name}: ${type}` : name;
	}).join(", ");

	const ret = renderType(t.tsType);

	return `(${params}) => ${ret}`;
}

function renderParam(p: ParamDef): string {
	const name = paramName(p);
	const type = p.tsType ? `: ${renderType(p.tsType)}` : "";
	return `${name}${type}`;
}

function paramName(p: ParamDef): string {
	switch (p.kind) {
		case "identifier":
			return p.name;

		case "assign":
			return `${paramName(p.left)} = ${p.right}`;

		case "rest":
			return `...${paramName(p.arg)}`;

		case "array":
			return `[${
				p.elements
					.map((el) => (el ? paramName(el) : ""))
					.join(", ")
			}]`;

		case "object":
			return `{ ${p.props.map(objectPropName).join(", ")} }`;

		default:
			return "param";
	}
}

function objectPropName(prop: ObjectPatPropDef): string {
	switch (prop.kind) {
		case "assign":
			return prop.value ? `${prop.key}: ${prop.value}` : prop.key;

		case "keyValue":
			return `${prop.key}: ${paramName(prop.value)}`;

		case "rest":
			return `...${paramName(prop.arg)}`;
	}
}

function renderConstructors(ctors: ClassConstructorDef[]) {
	return md`
### Constructors

${
		ctors.map((ctor) =>
			md`
#### constructor

\`\`\`ts
constructor(${(ctor.params ?? []).map(renderParam).join(", ")})
\`\`\`
  `
		)
	}
`;
}

function renderMethods(methods: ClassMethodDef[]) {
	return md`
### Methods

${
		methods.map((m) => {
			const params = m.def?.params ?? [];
			const paramList = params.map(renderParam).join(", ");

			const returnType = m.def?.returnType
				? `: ${renderType(m.def.returnType)}`
				: "";

			return md`
#### ${m.name}

\`\`\`ts
${m.name}(${paramList})${returnType}
\`\`\`
  `;
		})
	}
`;
}

export function processClass(
	name: string,
	decl: DeclarationClass,
) {
	const def = decl.def;

	return md`
${classHeaderTemplate(name, def)}

${def.constructors ? renderConstructors(def.constructors) : md``}
${def.methods ? renderMethods(def.methods) : md``}
  `;
}
