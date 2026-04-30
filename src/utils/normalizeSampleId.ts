// src/utils/normalizeSampleId.ts
import { canonicalizeIdentifier } from "./canonicalizeIdentifier.ts";

export function normalizeSampleId(raw: string): string {
	return canonicalizeIdentifier(raw);
}
