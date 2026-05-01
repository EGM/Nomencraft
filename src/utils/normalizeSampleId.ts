// src/utils/normalizeSampleId.ts
import { canonicalizeIdentifier } from "@egm/wtflib";

export function normalizeSampleId(raw: string): string {
	return canonicalizeIdentifier(raw);
}
