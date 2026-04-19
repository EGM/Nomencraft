import { DocNode } from "./types.ts";

/** todo */
export function trim(s = ""): string {
	return String(s ?? "").trim();
}

/** todo */
export function mdHeader(level: number, text: string): string {
	return `${"#".repeat(level)} ${text}\n\n`;
}

/** todo */
export function code(lang: string, c: string): string {
	return `\`\`\`${lang}\n${c}\n\`\`\`\n\n`;
}

/**
 * @name docNodeToMarkdown
 * @function
 * @param {DocNode} node
 * @param {string} symbolName
 * @returns {string}
 * @access public
 * @description todo
 */
export function docNodeToMarkdown(node: DocNode, symbolName: string): string {
	// 1. Determine the symbol kind and start the section header
	let md = `## ${symbolName} (${
		node.symbols[0]?.declarations?.[0]?.kind || "module"
	})\n\n`;

	// 2. Extract the primary declaration
	const decl = node.symbols[0]?.declarations?.[0];

	// 3. Add the JSDoc summary/description
	if (decl?.jsDoc?.doc) {
		md += `${decl.jsDoc.doc.trim()}\n\n`;
	}

	// 4. Render JSDoc/custom tags as a list
	if (decl?.jsDoc?.tags && decl.jsDoc.tags.length > 0) {
		md += "### Tags\n\n";
		decl.jsDoc.tags.forEach((tag) => {
			const name = tag.name ? ` ${tag.name}` : "";
			const value = tag.value ? ` – ${tag.value}` : "";
			md += `- **@${tag.kind}${name}**: ${value}\n`;
		});
		md += "\n";
	}

	// 5. Render constructors
	const def = decl?.def;
	if (def?.constructors) {
		md += "### Constructors\n\n";
		def.constructors.forEach((ctor) => {
			const params = ctor.params?.map((p) =>
				`${p.name}${p.optional ? "?" : ""}: ${
					p.tsType?.repr || "unknown"
				}`
			).join(", ") || "";
			md += `- \`${symbolName}(${params})\` – ${
				ctor.jsDoc?.doc || "*No description*"
			}\n`;
		});
		md += "\n";
	}

	// 6. Render properties
	if (def?.properties) {
		md += "### Properties\n\n";
		def.properties.forEach((prop) => {
			const type = prop.tsType?.repr || "any";
			md += `- **${prop.name}**: \`${type}\` – ${
				prop.jsDoc?.doc || "*No description*"
			}\n`;
		});
		md += "\n";
	}

	// 7. Render methods
	if (def?.methods) {
		md += "### Methods\n\n";
		def.methods.forEach((method) => {
			const params = method.functionDef?.params?.map((p) =>
				`${p.name}${p.optional ? "?" : ""}: ${
					p.tsType?.repr || "unknown"
				}`
			).join(", ") || "";
			const returns = method.functionDef?.returnType?.repr
				? `: ${method.functionDef.returnType.repr}`
				: "";
			md += `- **${method.name}()**\`${returns}\` – ${
				method.jsDoc?.doc || "*No description*"
			}\n`;
		});
		md += "\n";
	}

	// 8. Return the assembled Markdown fragment
	return md;
}
