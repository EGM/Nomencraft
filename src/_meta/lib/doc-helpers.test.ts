// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertStringIncludes } from "@std/assert";
import { docNodeToMarkdown } from "./doc-helpers.ts";

// Tiny helper to build synthetic DocNode-like objects
function makeNode(decl: any) {
	return {
		symbols: [
			{
				declarations: [decl],
			},
		],
	};
}

Deno.test("header: uses symbolName and kind", () => {
	const node = makeNode({ kind: "class" });
	const md = docNodeToMarkdown(node as any, "MyClass");
	assertStringIncludes(md, "## MyClass (class)");
});

Deno.test("header: falls back to 'module' when kind missing", () => {
	const node = makeNode({});
	const md = docNodeToMarkdown(node as any, "Mystery");
	assertStringIncludes(md, "## Mystery (module)");
});

Deno.test("description: includes jsDoc.doc when present", () => {
	const node = makeNode({
		jsDoc: { doc: "A test description." },
	});
	const md = docNodeToMarkdown(node as any, "Thing");
	assertStringIncludes(md, "A test description.");
});

Deno.test("description: omitted when missing", () => {
	const node = makeNode({});
	const md = docNodeToMarkdown(node as any, "Thing");
	// Should not blow up or include undefined
	assertEquals(md.includes("undefined"), false);
});

Deno.test("tags: renders tags section when tags exist", () => {
	const node = makeNode({
		jsDoc: {
			tags: [
				{ kind: "intent", name: "", value: "Testing" },
				{ kind: "decision", name: "foo", value: "bar" },
			],
		},
	});

	const md = docNodeToMarkdown(node as any, "Tagged");
	assertStringIncludes(md, "### Tags");
	assertStringIncludes(md, "@intent");
	assertStringIncludes(md, "Testing");
	assertStringIncludes(md, "@decision foo");
	assertStringIncludes(md, "bar");
});

Deno.test("constructors: renders constructor signatures", () => {
	const node = makeNode({
		def: {
			constructors: [
				{
					params: [
						{
							name: "x",
							optional: false,
							tsType: { repr: "number" },
						},
						{
							name: "y",
							optional: true,
							tsType: { repr: "string" },
						},
					],
					jsDoc: { doc: "Builds a thing." },
				},
			],
		},
	});

	const md = docNodeToMarkdown(node as any, "Point");
	assertStringIncludes(md, "### Constructors");
	assertStringIncludes(md, "`Point(x: number, y?: string)`");
	assertStringIncludes(md, "Builds a thing.");
});

Deno.test("properties: renders properties list", () => {
	const node = makeNode({
		def: {
			properties: [
				{
					name: "foo",
					tsType: { repr: "string" },
					jsDoc: { doc: "Foo value." },
				},
				{
					name: "bar",
					tsType: { repr: "number" },
					jsDoc: { doc: "Bar value." },
				},
			],
		},
	});

	const md = docNodeToMarkdown(node as any, "Props");
	assertStringIncludes(md, "### Properties");
	assertStringIncludes(md, "**foo**: `string` – Foo value.");
	assertStringIncludes(md, "**bar**: `number` – Bar value.");
});

Deno.test("methods: renders methods with params and return types", () => {
	const node = makeNode({
		def: {
			methods: [
				{
					name: "doThing",
					functionDef: {
						params: [
							{
								name: "x",
								optional: false,
								tsType: { repr: "number" },
							},
						],
						returnType: { repr: "boolean" },
					},
					jsDoc: { doc: "Does a thing." },
				},
			],
		},
	});

	const md = docNodeToMarkdown(node as any, "Worker");
	assertStringIncludes(md, "### Methods");
	assertStringIncludes(md, "**doThing()**`: boolean`");
	assertStringIncludes(md, "Does a thing.");
});

Deno.test("integration: full node with all sections", () => {
	const node = makeNode({
		kind: "class",
		jsDoc: {
			doc: "A full-featured test class.",
			tags: [{ kind: "intent", name: "", value: "Integration test" }],
		},
		def: {
			constructors: [
				{
					params: [],
					jsDoc: { doc: "Creates an instance." },
				},
			],
			properties: [
				{
					name: "value",
					tsType: { repr: "number" },
					jsDoc: { doc: "Stored value." },
				},
			],
			methods: [
				{
					name: "getValue",
					functionDef: {
						params: [],
						returnType: { repr: "number" },
					},
					jsDoc: { doc: "Returns the value." },
				},
			],
		},
	});

	const md = docNodeToMarkdown(node as any, "FullClass");

	// Check ordering and presence
	assertStringIncludes(md, "## FullClass (class)");
	assertStringIncludes(md, "A full-featured test class.");
	assertStringIncludes(md, "### Tags");
	assertStringIncludes(md, "Integration test");
	assertStringIncludes(md, "### Constructors");
	assertStringIncludes(md, "Creates an instance.");
	assertStringIncludes(md, "### Properties");
	assertStringIncludes(md, "Stored value.");
	assertStringIncludes(md, "### Methods");
	assertStringIncludes(md, "Returns the value.");
});

Deno.test("minimal node: only header appears", () => {
	const node = makeNode({});
	const md = docNodeToMarkdown(node as any, "Bare");

	assertStringIncludes(md, "## Bare (module)");
	// Should not contain any section headers
	assertEquals(md.includes("###"), false);
});
