import { BaseComponent } from "../core/BaseComponent.ts";
import type { InputMap, OutputMap, Result } from "../core/types.ts";

/**
 * @name mapToObject
 * @function
 * @param {Map<string, unknown>} map
 * @returns {object}
 * @description Converts a Map<string, unknown> into a plain object.
 *              Null/undefined maps return an empty object.
 */
export function mapToObject(
	map: Map<string, unknown> | null | undefined,
): object {
	if (!map) return {};
	return Object.fromEntries(map);
}

/**
 * @name getLength
 * @function
 * @param {unknown} item
 * @returns {number}
 * @description Returns the length of a string, array, or object.
 *              Null/undefined return 0.
 */
export function getLength(item: unknown): number {
	if (item === null || item === undefined) return 0;

	switch (typeof item) {
		case "string":
			return item.length;

		case "object":
			return Array.isArray(item)
				? item.length
				: Object.keys(item as Record<string, unknown>).length;

		default:
			return 0; // primitives that aren't strings have no "length"
	}
}

/** @internal */
export class ShowData extends BaseComponent {
	constructor() {
		super("ShowData");
	}

	override async process(
		input: InputMap,
	): Promise<Result<InputMap, OutputMap>> {
		this.started();

		try {
			const inputObject = mapToObject(input);
			const showData = Object.entries(inputObject).map(([key, item]) => ({
				key,
				itemLength: getLength(item),
			}));

			input.set("showData", showData);

			this.finished();
			return { success: true, value: input };
		} catch (err) {
			this.emitError({ failed: this.name, error: err });
			return { success: false, input, error: String(err) };
		}
	}
}
