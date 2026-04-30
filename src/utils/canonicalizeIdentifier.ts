// src/utils/canonicalizeIdentifier.ts
export function canonicalizeIdentifier(raw: unknown): string {
	// 1. Type guard: Handle non-strings gracefully
	if (typeof raw !== "string") return "";

	let s = raw;

	// 2. Unicode normalize (NFKC)
	// This decomposes characters and recomposes them, e.g., "é" -> "e" + combining acute -> "é" (composed)
	s = s.normalize("NFKC");

	// 3. Remove Zero-Width characters AND Soft Hyphens
	// \u200B-\u200D: Zero Width Space, Non-Joiner, Joiner
	// \uFEFF: BOM / Zero Width No-Break Space
	// \u00AD: Soft Hyphen (crucial for identifiers like "co\u00ADoperate")
	s = s.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "");

	// 4. Remove ALL whitespace (spaces, tabs, NBSP, etc.)
	// Doing this AFTER removing invisible chars ensures we don't accidentally
	// create new whitespace from combining marks that were stripped.
	s = s.replace(/\s+/g, "");

	// 5. Normalize hyphens (convert Unicode hyphens/dashes to ASCII hyphen)
	// \u2010-\u2015: Various hyphens and dashes
	// \u2212: Minus sign
	// Note: We do this AFTER stripping whitespace to ensure "foo \u2010 bar" -> "foo-bar"
	s = s.replace(/[\u2010-\u2015\u2212]/g, "-");

	// 6. Lowercase for canonical form
	s = s.toLowerCase();

	return s;
}
