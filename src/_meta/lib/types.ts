// deno-lint-ignore-file no-explicit-any
/**
 * @interface
 * @name DocFileMap
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description The shape of the whole document structure.
 */
export interface DocFileMap {
	/**
	 * @property
	 * @name version
	 * @description The version of JSON schema that was used to create the document.
	 */
	version: number;
	/**
	 * @property
	 * @name nodes
	 * @description The list of nodes.
	 */
	nodes: Record<string, DocNode>;
}

/**
 * @interface
 * @name DocNode
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description Document node.
 */
export interface DocNode {
	/**
	 * @property
	 * @name module_doc
	 * @description TSDoc comment at the top of the file.
	 */
	module_doc?: JsDoc;
	/**
	 * @property
	 * @name imports
	 * @description The list of imports.
	 */
	imports?: DocImport[];
	/**
	 * @property
	 * @name symbols
	 * @description The list of symbols.
	 */
	symbols: DocSymbol[];
}

/**
 * @interface
 * @name DocImport
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description The documentation for the path/url being imported.
 */
export interface DocImport {
	/**
	 * @property
	 * @name importedName
	 * @description The name of the import.
	 */
	importedName: string;
	/**
	 * @property
	 * @name originalName
	 * @description The name of the import.
	 */
	originalName: string;
	/**
	 * @property
	 * @name src
	 * @description The source URL/path of the import.
	 */
	src: string;
}

/**
 * @interface
 * @name DocSymbol
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description todo
 */
export interface DocSymbol {
	/**
	 * @property
	 * @name name
	 * @description todo
	 */
	name: string;
	/**
	 * @property
	 * @name declarations
	 * @description todo
	 */
	declarations?: DocDeclaration[];
}

/**
 * @interface
 * @name DocDeclaration
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description todo
 */
export interface DocDeclaration {
	/**
	 * @property
	 * @name location
	 * @description todo
	 */
	location?: DocLocation;
	/**
	 * @property
	 * @name declarationKind
	 * @description todo
	 */
	declarationKind?: string;
	/**
	 * @property
	 * @name jsDoc
	 * @description todo
	 */
	jsDoc?: JsDoc;
	/**
	 * @property
	 * @name kind
	 * @description todo
	 */
	kind?: string;
	/**
	 * @property
	 * @name def
	 * @description todo
	 */
	def?: DocDef;
	/**
	 * @property
	 * @name hasBody
	 * @description todo
	 */
	hasBody?: boolean;
	/**
	 * @property
	 * @name name
	 * @description todo
	 */
	name?: string;
	/**
	 * @property
	 * @name params
	 * @description todo
	 */
	params?: DocParam[];
	/**
	 * @property
	 * @name declaration
	 * @description todo
	 */
	declaration?: any;
}

/**
 * @interface
 * @name DocLocation
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description todo
 */
export interface DocLocation {
	/**
	 * @property
	 * @name filename
	 * @description todo
	 */
	filename: string;
	/**
	 * @property
	 * @name line
	 * @description todo
	 */
	line: number;
	/**
	 * @property
	 * @name col
	 * @description todo
	 */
	col: number;
	/**
	 * @property
	 * @name byteIndex
	 * @description todo
	 */
	byteIndex?: number;
}

/**
 * @interface
 * @name JsDoc
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description todo
 */
export interface JsDoc {
	/**
	 * @property
	 * @name doc
	 * @description todo
	 */
	doc?: string;
	/**
	 * @property
	 * @name tags
	 * @description todo
	 */
	tags?: JsDocTag[];
}

/**
 * @interface
 * @name JsDocTag
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description todo
 */
export interface JsDocTag {
	/**
	 * @property
	 * @name kind
	 * @description todo
	 */
	kind?: string;
	/**
	 * @property
	 * @name name
	 * @description todo
	 */
	name?: string;
	/**
	 * @property
	 * @name value
	 * @description todo
	 */
	value?: string;
	/**
	 * @property
	 * @name tsType
	 * @description todo
	 */
	tsType?: TsType;
}

/**
 * @interface
 * @name TsType
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description todo
 */
export interface TsType {
	/**
	 * @property
	 * @name repr
	 * @description todo
	 */
	repr?: string;
	/**
	 * @property
	 * @name kind
	 * @description todo
	 */
	kind?: string;
	/**
	 * @property
	 * @name value
	 * @description todo
	 */
	value?: string;
}

/**
 * @interface
 * @name DocDef
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description todo
 */
export interface DocDef {
	/**
	 * @property
	 * @name isAbstract
	 * @description todo
	 */
	isAbstract?: boolean;
	/**
	 * @property
	 * @name constructors
	 * @description todo
	 */
	constructors?: DocFunction[];
	/**
	 * @property
	 * @name properties
	 * @description todo
	 */
	properties?: DocProperty[];
	/**
	 * @property
	 * @name methods
	 * @description todo
	 */
	methods?: DocMethod[];
	/**
	 * @property
	 * @name extends
	 * @description todo
	 */
	extends?: string;
	/** @description Any other property. */
	[key: string]: any;
}

/**
 * @interface
 * @name DocFunction
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description todo
 */
export interface DocFunction {
	/**
	 * @property
	 * @name jsDoc
	 * @description todo
	 */
	jsDoc?: JsDoc;
	/**
	 * @property
	 * @name hasBody
	 * @description todo
	 */
	hasBody?: boolean;
	/**
	 * @property
	 * @name name
	 * @description todo
	 */
	name?: string;
	/**
	 * @property
	 * @name params
	 * @description todo
	 */
	params?: DocParam[];
	/**
	 * @property
	 * @name location
	 * @description todo
	 */
	location?: DocLocation;
}

/**
 * @interface
 * @name DocParam
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description todo
 */
export interface DocParam {
	/**
	 * @property
	 * @name kind
	 * @description todo
	 */
	kind?: string;
	/**
	 * @property
	 * @name name
	 * @description todo
	 */
	name?: string;
	/**
	 * @property
	 * @name optional
	 * @description todo
	 */
	optional?: boolean;
	/**
	 * @property
	 * @name tsType
	 * @description todo
	 */
	tsType?: TsType;
}

/**
 * @interface
 * @name DocProperty
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description todo
 */
export interface DocProperty {
	/**
	 * @property
	 * @name jsDoc
	 * @description todo
	 */
	jsDoc?: JsDoc;
	/**
	 * @property
	 * @name tsType
	 * @description todo
	 */
	tsType?: TsType;
	/**
	 * @property
	 * @name readonly
	 * @description todo
	 */
	readonly?: boolean;
	/**
	 * @property
	 * @name name
	 * @description todo
	 */
	name?: string;
	/**
	 * @property
	 * @name location
	 * @description todo
	 */
	location?: DocLocation;
}

/**
 * @interface
 * @name DocMethod
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description todo
 */
export interface DocMethod {
	/**
	 * @property
	 * @name jsDoc
	 * @description todo
	 */
	jsDoc?: JsDoc;
	/**
	 * @property
	 * @name accessibility
	 * @description todo
	 */
	accessibility?: string;
	/**
	 * @property
	 * @name name
	 * @description todo
	 */
	name?: string;
	/**
	 * @property
	 * @name kind
	 * @description todo
	 */
	kind?: string;
	/**
	 * @property
	 * @name functionDef
	 * @description todo
	 */
	functionDef?: FunctionDef;
	/**
	 * @property
	 * @name location
	 * @description todo
	 */
	location?: DocLocation;
}

/**
 * @interface
 * @name FunctionDef
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description todo
 */
export interface FunctionDef {
	/**
	 * @property
	 * @name params
	 * @description todo
	 */
	params?: DocParam[];
	/**
	 * @property
	 * @name returnType
	 * @description todo
	 */
	returnType?: TsType;
	/**
	 * @property
	 * @name hasBody
	 * @description todo
	 */
	hasBody?: boolean;
}

/**
 * @name AnyJson
 * @description todo
 */
export type AnyJson = string | number | boolean | null | AnyJson[] | {
	[key: string]: AnyJson;
};
