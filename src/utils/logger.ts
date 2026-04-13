import { fileLogger, FileWriter } from "./fileLogger.ts";
import Logger from "@iankulin/logger";

/** @description Configuration options for the application logger. */
export type LoggerOptions = {
	json: boolean;
	quiet: boolean;
	logFilename?: string;
};

// Hold reference to logger instance
let log: Logger;
// Hold reference to file writer if file logging is enabled
let writeFile: null | FileWriter;

/**
 * @description Configures the global logger instance and optional file writer.
 */
export const configureLogger = (
	{ json, quiet, logFilename }: LoggerOptions,
) => {
	log = new Logger({
		level: quiet ? "error" : "debug", // <-- @TODO: Set to "info" when you're done debugging!
		format: json ? "json" : "simple",
	});

	writeFile = logFilename ? fileLogger(logFilename) : null;
};

/**
 * @description Logs a message with the specified level, optionally writing to a file.
 * @example
 * appLog("info", "Application started", "Main");
 * appLog("error", "Failed to load config", "ConfigLoader", { filename: "config.yaml" });
 */
export const appLog = (
	level: "debug" | "info" | "warn" | "error",
	message: string,
	component: string,
	details?: Record<string, unknown>,
) => {
	if (!log) configureLogger({ json: false, quiet: false });

	// Helper to safely stringify complex values
	const sanitize = (val: unknown): unknown => {
		if (Array.isArray(val)) {
			try {
				return JSON.stringify(val);
			} catch {
				return "[Array Serialization Error]";
			}
		}
		if (typeof val === "object" && val !== null) {
			try {
				return JSON.stringify(val);
			} catch {
				return "[Object Serialization Error]";
			}
		}
		return val;
	};

	const safeDetails = details
		? Object.fromEntries(
			Object.entries(details).map(([k, v]) => [k, sanitize(v)]),
		)
		: undefined;

	const payload = { component, ...safeDetails };
	log[level](message, payload);

	if (writeFile !== null) {
		const detailsStr = safeDetails
			? ", " + JSON.stringify(safeDetails)
			: "";
		writeFile(
			`[${
				String(level).toUpperCase()
			}] [${component}] ${message}${detailsStr}`,
		);
	}
};
