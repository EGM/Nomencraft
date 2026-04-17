import { DocNode } from "./types.ts";

export const trim = (s = "") => String(s ?? "").trim();

export const mdHeader = (level: number, text: string) =>
	`${"#".repeat(level)} ${text}\n\n`;

export const code = (lang: string, c: string) =>
	`\`\`\`${lang}\n${c}\n\`\`\`\n\n`;

export function docNodeToMarkdown(node: DocNode, symbolName: string): string {
	let md = `## ${symbolName} (${
		node.symbols[0]?.declarations?.[0]?.kind || "module"
	})\n\n`;

	const decl = node.symbols[0]?.declarations?.[0];
	if (decl?.jsDoc?.doc) {
		md += `${decl.jsDoc.doc.trim()}\n\n`;
	}

	if (decl?.jsDoc?.tags && decl.jsDoc.tags.length > 0) {
		md += "### Tags\n\n";
		decl.jsDoc.tags.forEach((tag) => {
			const name = tag.name ? ` ${tag.name}` : "";
			const value = tag.value ? ` – ${tag.value}` : "";
			md += `- **@${tag.kind}${name}**: ${value}\n`;
		});
		md += "\n";
	}

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

	return md;
}
