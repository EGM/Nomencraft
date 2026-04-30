// src/utils/detectIdentifierAnomalies.ts
export interface IdentifierAnomaly {
	type: "whitespace" | "unicodeHyphen" | "invisible" | "case" | "other";
	message: string;
}

export function detectIdentifierAnomalies(raw: string): IdentifierAnomaly[] {
	const issues: IdentifierAnomaly[] = [];

	if (/\s/.test(raw)) {
		issues.push({
			type: "whitespace",
			message: `Contains whitespace characters`,
		});
	}

	if (/[\u2010-\u2015\u2212]/.test(raw)) {
		issues.push({
			type: "unicodeHyphen",
			message: `Contains non-ASCII hyphen characters`,
		});
	}

	if (/[\u200B\u200C\u200D\u2060]/.test(raw)) {
		issues.push({
			type: "invisible",
			message: `Contains invisible Unicode characters`,
		});
	}

	if (/[A-Z]/.test(raw)) {
		issues.push({
			type: "case",
			message: `Contains uppercase letters (canonical form is lowercase)`,
		});
	}

	return issues;
}
