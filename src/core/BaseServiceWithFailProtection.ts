// src/core/BaseServiceWithFailProtection.ts
import { BaseService } from "./BaseService.ts";
import { InputMap, OutputMap, Result } from "./types.ts";

/**
 * @intent Add catastrophic‑failure semantics without modifying BaseService.
 * @decision Do NOT override run(); wrap execute() instead.
 */
export abstract class BaseServiceWithFailProtection extends BaseService {
	/**
	 * @override
	 * Wrap the subclass's execute() with catastrophic‑failure detection.
	 */
	protected override async execute(): Promise<Result<InputMap, OutputMap>> {
		try {
			const result = await this.executeWithProtection();

			if (!result.success) {
				// Operational failure → catastrophic
				this.log("error", "Operational failure", {
					error: result.error,
				});
			}

			return result;
		} catch (err) {
			// Fatal failure
			const msg = err instanceof Error ? err.message : String(err);
			this.log("error", "Fatal service error", { error: msg });

			return {
				success: false as const,
				input: new Map(),
				error: msg,
			};
		}
	}

	/**
	 * @abstract
	 * Subclasses implement this instead of execute().
	 */
	protected abstract executeWithProtection(): Promise<
		Result<InputMap, OutputMap>
	>;
}
