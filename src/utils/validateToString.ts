/**
 * Checks if a value has a toString() method and whether it's overridden.
 * @param {*} value - The value to check.
 * @returns {string} - "none", "inherited", or "overridden".
 */
export function validateToString(value: unknown): string {
	// Must be non-null and of type object or function
	if (
		value === null ||
		(typeof value !== "object" && typeof value !== "function")
	) {
		return "none";
	}

	const hasMethod = typeof value.toString === "function";
	if (!hasMethod) {
		return "none";
	}

	// Compare with Object.prototype.toString
	if (value.toString === Object.prototype.toString) {
		return "inherited";
	} else {
		return "overridden";
	}
}

// Example usage:
console.log(validateToString({})); // "inherited"
console.log(validateToString([])); // "overridden" (Array has its own)
console.log(validateToString(function () {})); // "overridden" (Function has its own)
console.log(validateToString(Object.create(null))); // "none" (no prototype)
console.log(validateToString({ toString: () => "Hi" })); // "overridden"
console.log(validateToString(null)); // "none"
console.log(validateToString(42)); // "none" (primitive)
