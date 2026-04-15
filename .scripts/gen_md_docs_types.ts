// deno_doc_json.d.ts
export interface DenoDocV2Output {
  version: number;
  nodes: Record<string, {
    imports?: unknown[];
    symbols?: DocItem[];
    [key: string]: unknown;
  }>;
}

export interface IndexEntry {
  mod: string;
  path: string;
  count: number;
}

export type DocJson = DocItem[];

export interface DocItem {
  id?: string;
  name?: string;
  kind?: DocKind;
  docs?: string;
  location?: Location | null;
  isExport?: boolean;
  exportedAsDefault?: boolean;
  tags?: DocTag[];
  signatures?: Signature[];
  tsType?: string;
  type?: TypeNode;
  members?: DocItem[]; // class/interface/enum members
  children?: DocItem[]; // namespace/module children
  exports?: ExportRef[]; // module exports list
  extends?: TypeNode[] | string[];
  implements?: TypeNode[] | string[];
  typeParams?: TypeParam[];
  importFrom?: string | null;
  reExport?: boolean;
  local?: boolean;
  deprecated?: boolean;
  privacy?: "public" | "private" | "protected";
  readonly?: boolean;
  async?: boolean;
  generator?: boolean;
  value?: any; // for variables/constants
  [k: string]: any; // allow additional fields
}

export type DocKind =
  | "module"
  | "variable"
  | "function"
  | "class"
  | "interface"
  | "enum"
  | "typeAlias"
  | "namespace"
  | "import"
  | "export"
  | "constructor"
  | "method"
  | "property"
  | "enumMember"
  | string;

export interface Location {
  filename: string;
  line: number;
  col: number;
}

export interface DocTag {
  name: string;
  text?: string;
}

export interface ExportRef {
  id?: string;
  name?: string;
  kind?: DocKind;
  isExport?: boolean;
  reExport?: boolean;
}

export interface Signature {
  name?: string;
  docs?: string;
  params?: Param[];
  returns?: ReturnInfo;
  typeParams?: TypeParam[];
  async?: boolean;
  generator?: boolean;
  tags?: DocTag[];
}

export interface Param {
  name: string;
  optional?: boolean;
  tsType?: string;
  type?: TypeNode;
  defaultValue?: string | null;
  docs?: string;
  tags?: DocTag[];
}

export interface ReturnInfo {
  tsType?: string;
  type?: TypeNode;
  docs?: string;
}

export interface TypeParam {
  name: string;
  constraint?: string | TypeNode | null;
  default?: string | TypeNode | null;
}

export type TypeNode =
  | IntrinsicType
  | ReferenceType
  | UnionType
  | IntersectionType
  | LiteralType
  | TupleType
  | ObjectType
  | FunctionType
  | ConditionalType
  | MappedType
  | UnknownType
  | AnyType
  | { [k: string]: any };

export interface IntrinsicType {
  typeKind: "intrinsic";
  name: string; // "string", "number", "boolean", "void", etc.
}

export interface ReferenceType {
  typeKind: "reference";
  name?: string;
  typeArgs?: TypeNode[];
  id?: string;
}

export interface UnionType {
  typeKind: "union";
  types: TypeNode[];
}

export interface IntersectionType {
  typeKind: "intersection";
  types: TypeNode[];
}

export interface LiteralType {
  typeKind: "literal";
  value: string | number | boolean | null;
}

export interface TupleType {
  typeKind: "tuple";
  elemTypes: TypeNode[];
}

export interface ObjectType {
  typeKind: "object";
  properties?: { name: string; optional?: boolean; type: TypeNode }[];
  indexSignature?: { keyType: TypeNode; valueType: TypeNode };
  callSignatures?: Signature[];
}

export interface FunctionType {
  typeKind: "function";
  parameters?: { name?: string; type: TypeNode; optional?: boolean }[];
  returnType?: TypeNode;
}

export interface ConditionalType {
  typeKind: "conditional";
  checkType?: TypeNode;
  extendsType?: TypeNode;
  trueType?: TypeNode;
  falseType?: TypeNode;
}

export interface MappedType {
  typeKind: "mapped";
  // permissive shape:
  parameter?: string;
  template?: TypeNode;
  nameType?: TypeNode | null;
  optional?: boolean | null;
  readonly?: boolean | null;
}

export interface UnknownType {
  typeKind: "unknown";
}

export interface AnyType {
  typeKind: "any";
}
