// src/utils/compare.ts
/** Simple utility to check if two objects have the same keys and values */
export function shallowEqual(
	a: Record<string, unknown>,
	b: Record<string, unknown>,
): boolean {
	const keysA = Object.keys(a);
	const keysB = Object.keys(b);
	if (keysA.length !== keysB.length) return false;
	for (const key of keysA) {
		if (a[key] !== b[key]) return false;
	}
	return true;
}
