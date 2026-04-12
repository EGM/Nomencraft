// src/core/BaseService.ts
import { appLog } from "../utils/logger.ts";
import type { LogEntry, Result } from "./types.ts";

/**
 * @name BaseService
 * @class
 * @abstract
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description Abstract service base class providing structured logging, lifecycle hooks, and standardized success/failure result helpers for long‑running or multi‑step service operations.
 * @intent Defines the foundational behavior for service‑style components that need controlled initialization, cleanup, logging, and error handling, ensuring consistent execution semantics across all derived services.
 * @see {@link LogEntry} — structure of log records
 * @see {@link Result} — standardized success/failure wrapper
 * @see {@link appLog} — global logging sink
 * @example
 * ```typescript
 * class MyService extends BaseService {
 *   constructor() {
 *     super("MyService");
 *   }
 *   protected async execute() {
 *     return this.ok(undefined, undefined);
 *   }
 * }
 * ```
 */
export abstract class BaseService {
	/**
	 * @property
	 * @type {LogEntry[]}
	 * @default []
	 * @name logs
	 * @description Local in‑memory buffer of log entries accumulated during the service’s execution.
	 * @intent Allows derived services to inspect or export logs before cleanup, while keeping global logging separate from per‑run diagnostics.
	 */
	protected logs: LogEntry[] = [];
	/**
	 * @property
	 * @type {string}
	 * @name componentName
	 * @description The name of the service, included in all log entries for identification.
	 * @intent Provides a stable identifier for debugging, tracing, and log correlation across the system.
	 */
	protected readonly componentName: string;

	/**
	 * @name constructor
	 * @constructor
	 * @param {string} componentName
	 * @access public
	 * @description Initializes the service with a component name and records an initialization debug log entry.
	 * @intent Ensures every service instance begins with a consistent identity and immediately logs its creation for traceability.
	 */
	constructor(componentName: string) {
		this.componentName = componentName;
		this.log("debug", `Initializing ${componentName}`);
	}

	/**
	 * @name observe
	 * @method
	 * @param {{
	 * 		level: "debug" | "info" | "warn" | "error";
	 * 		message: string;
	 * 		details?: Record<string, unknown>;
	 * }} event
	 * @access protected
	 * @description Receives an event object and forwards it to the internal logging system.
	 * @intent Allows external event emitters or observers to feed structured log events directly into the service’s logging pipeline.
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
	 * @name log
	 * @method
	 * @param {"debug" | "info" | "warn" | "error"} level
	 * @param {string} message
	 * @param {Record<string, unknown>} details
	 * @access protected
	 * @description Creates a structured log entry, stores it locally, and forwards it to the global logger.
	 * @intent Unifies local and global logging so services can maintain per‑run diagnostics while still contributing to system‑wide logs.
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
	 * @name ok
	 * @method
	 * @param {I} input
	 * @param {O} value
	 * @returns {Result<I, O>}
	 * @access protected
	 * @template I
	 * @template O
	 * @description Wraps a successful operation result in a standardized `Result` object.
	 * @intent Provides a consistent success return shape for all service operations, simplifying downstream handling.
	 */
	protected ok<I, O>(input: I, value: O): Result<I, O> {
		return { success: true, value };
	}

	/**
	 * @name fail
	 * @method
	 * @param {I} input
	 * @param {string | Error} error
	 * @returns {Result<I, never>}
	 * @access protected
	 * @template I
	 * @description Wraps a failure result in a standardized `Result`` object without throwing.
	 * @intent Allows services to return controlled failures while avoiding exceptions, enabling predictable error handling patterns.
	 */
	protected fail<I>(input: I, error: string | Error): Result<I, never> {
		const msg = error instanceof Error ? error.message : error;
		return { success: false, input, error: msg };
	}

	/**
	 * @name onInit
	 * @method
	 * @async
	 * @returns {Promise<void>}
	 * @access protected
	 * @description Optional lifecycle hook invoked before service execution begins.
	 * @intent Allows derived services to perform setup work such as loading configuration, allocating resources, or preparing state.
	 */
	protected async onInit?(): Promise<void> {}

	/**
	 * @name onCleanup
	 * @method
	 * @async
	 * @returns {Promise<void>}
	 * @access protected
	 * @description Optional lifecycle hook invoked after service execution completes, clearing the local log buffer by default.
	 * @intent Provides a consistent teardown point for releasing resources or exporting logs before the next run.
	 */
	// deno-lint-ignore require-await
	protected async onCleanup?(): Promise<void> {
		// Optional: dump local logs to a specific file or just clear them
		// For now, we just clear them as requested
		this.logs = [];
	}

	/**
	 * @name run
	 * @method
	 * @async
	 * @returns {Promise<Result<void, unknown>>}
	 * @access public
	 * @description Executes the full service lifecycle: initialization, execution, cleanup, and structured error handling.
	 * @intent Centralizes the service execution flow so derived classes only implement execute() while inheriting consistent lifecycle behavior.
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
	 * @name execute
	 * @method
	 * @returns {Promise<Result<void, unknown>>}
	 * @access protected
	 * @description Abstract method representing the core operation of the service.
	 * @intent Forces derived services to define their primary behavior while relying on the base class for lifecycle and logging.
	 */
	protected abstract execute(): Promise<Result<void, unknown>>;
}
