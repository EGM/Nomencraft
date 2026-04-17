// deno-lint-ignore-file no-explicit-any
/** Function to sort any object or array, recursively. */
export function sortKeys(value: any): any {
	if (Array.isArray(value)) return value.map(sortKeys);
	if (value && typeof value === "object") {
		const sorted: any = {};
		for (const k of Object.keys(value).sort()) {
			sorted[k] = sortKeys(value[k]);
		}
		return sorted;
	}
	return value;
}
