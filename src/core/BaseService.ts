// src/core/BaseService.ts
import { appLog } from "../utils/logger.ts";
import type { LogEntry, Result } from "./types.ts";

/**
 * Abstract base class for all services.
 * Provides a private log buffer that is cleared after the run completes.
 */
export abstract class BaseService {
	protected logs: LogEntry[] = [];
	protected readonly componentName: string;

	/**
	 * Creates an instance of the class.
	 * @param componentName - {string}
	 */
	constructor(componentName: string) {
		this.componentName = componentName;
		this.log("debug", `Initializing ${componentName}`);
	}

	/**
	 * TODO: Describe the observe method.
	 * @param event - {{ level: "debug" | "info" | "warn" | "error"; message: string; details?: Record<string, unknown>; }}
	 */
	protected observe(
		event: {
			level: "debug" | "info" | "warn" | "error";
			message: string;
			details?: Record<string, unknown>;
		},
	) {
		this.log(event.level, event.message, event.details);
	}

	/**
	 * Logs a message to BOTH the local buffer and the global logger.
	 */
	protected log(
		level: "debug" | "info" | "warn" | "error",
		message: string,
		details?: Record<string, unknown>,
	): void {
		//console.log("appLog keys:", Object.keys(appLog));
		const entry: LogEntry = {
			level,
			message,
			timestamp: new Date().toISOString(),
			component: this.componentName,
			details,
		};

		// 1. Store locally for this run
		this.logs.push(entry);

		// 2. Broadcast globally (console/file)
		appLog(level, message, this.componentName, details);
	}

	/**
	 * Helper to wrap a successful operation in a Result object.
	 */
	protected ok<I, O>(input: I, value: O): Result<I, O> {
		return { success: true, value };
	}

	/**
	 * Helper to wrap a failure in a Result object and log the error.
	 */
	protected fail<I>(input: I, error: string | Error): Result<I, never> {
		const msg = error instanceof Error ? error.message : error;
		return { success: false, input, error: msg };
	}

	/**
	 * Lifecycle hook: called before execute().
	 */
	protected async onInit?(): Promise<void> {}

	/**
	 * Lifecycle hook: called after execute().
	 * Clears the local log buffer here.
	 */
	// deno-lint-ignore require-await
	protected async onCleanup?(): Promise<void> {
		// Optional: dump local logs to a specific file or just clear them
		// For now, we just clear them as requested
		this.logs = [];
	}

	/**
	 * Main entry point. Wraps execution and ensures cleanup.
	 */
	async run(): Promise<Result<void, unknown>> {
		try {
			await this.onInit?.();
			this.log("info", "Starting service execution");

			const result = await this.execute();

			this.log("info", "Service execution completed");
			await this.onCleanup?.(); // <--- Buffer cleared here

			return result;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			this.log("error", "Service crashed", { error: msg });
			await this.onCleanup?.();
			return { success: false as const, input: undefined, error: msg };
		}
	}

	/**
	 * Subclasses must implement this.
	 */
	protected abstract execute(): Promise<Result<void, unknown>>;
}
