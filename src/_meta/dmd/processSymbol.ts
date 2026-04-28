// processSymbol.ts
import { md } from "@tmpl/core";
import type { DeclarationClass, Symbol } from "@deno/doc";
import { processClass } from "./processClass.ts";

export function processSymbol(symbol: Symbol) {
	const decl = symbol.declarations[0];

	switch (decl.kind) {
		case "class":
			return processClass(symbol.name, decl as DeclarationClass);

		default:
			return md`<!-- Unhandled symbol kind: ${decl.kind} -->`;
	}
}
