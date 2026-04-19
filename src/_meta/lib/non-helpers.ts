import { DocFileMap } from "./types.ts";

// Utility to create a DocFileMap with a custom toString
function createDocFileMap(data: DocFileMap): DocFileMap {
	// Clone to avoid mutating the original object
	const obj: DocFileMap = { ...data };

	// Define a non-enumerable toString method
	Object.defineProperty(obj, "toString", {
		value: function (): string {
			const nodeCount = Object.keys(this.nodes).length;
			return `DocFileMap v${this.version} with ${nodeCount} node(s)`;
		},
		writable: false,
		enumerable: false, // prevents showing up in JSON.stringify
	});

	return obj;
}
