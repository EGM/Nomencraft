// processDocument.ts
import { md } from "@tmpl/core";
import type { Document } from "@deno/doc";
import { processSymbol } from "./processSymbol.ts";

export function processDocument(doc: Document) {
	return md`
${doc.symbols.map((sym) => processSymbol(sym))}
  `;
}
