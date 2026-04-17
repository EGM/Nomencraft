// deno-lint-ignore-file no-explicit-any
export interface DocFileMap {
	version: number;
	nodes: Record<string, DocNode>;
}

export interface DocNode {
	module_doc?: JsDoc;
	imports?: DocImport[];
	symbols: DocSymbol[];
}

export interface DocImport {
	importedName: string;
	originalName: string;
	src: string;
}

export interface DocSymbol {
	name: string;
	declarations?: DocDeclaration[];
}

export interface DocDeclaration {
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

export interface DocLocation {
	filename: string;
	line: number;
	col: number;
	byteIndex?: number;
}

export interface JsDoc {
	doc?: string;
	tags?: JsDocTag[];
}

export interface JsDocTag {
	kind?: string;
	name?: string;
	value?: string;
	tsType?: TsType;
}

export interface TsType {
	repr?: string;
	kind?: string;
	value?: string;
}

export interface DocDef {
	isAbstract?: boolean;
	constructors?: DocFunction[];
	properties?: DocProperty[];
	methods?: DocMethod[];
	extends?: string;
	[key: string]: any;
}

export interface DocFunction {
	jsDoc?: JsDoc;
	hasBody?: boolean;
	name?: string;
	params?: DocParam[];
	location?: DocLocation;
}

export interface DocParam {
	kind?: string;
	name?: string;
	optional?: boolean;
	tsType?: TsType;
}

export interface DocProperty {
	jsDoc?: JsDoc;
	tsType?: TsType;
	readonly?: boolean;
	name?: string;
	location?: DocLocation;
}

export interface DocMethod {
	jsDoc?: JsDoc;
	accessibility?: string;
	name?: string;
	kind?: string;
	functionDef?: FunctionDef;
	location?: DocLocation;
}

export interface FunctionDef {
	params?: DocParam[];
	returnType?: TsType;
	hasBody?: boolean;
}

export type AnyJson = string | number | boolean | null | AnyJson[] | {
	[key: string]: AnyJson;
};
