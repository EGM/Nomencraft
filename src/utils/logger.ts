// src/utils/logger.ts

import { fileLogger, FileWriter } from "./fileLogger.ts";
import Logger from "@iankulin/logger";

/** Type for logger configuration options */
export type LoggerOptions = {
	json: boolean;
	quiet: boolean;
	logFilename?: string;
};

// Hold reference to logger instance
let log: Logger;
// Hold reference to file writer if file logging is enabled
let writeFile: null | FileWriter;

// Reusable function to configure logger
/**
 * TODO: Describe this arrow function (<anonymous>).
 * @param { json, quiet, logFilename } - {LoggerOptions}
 */
export const configureLogger = (
	{ json, quiet, logFilename }: LoggerOptions,
) => {
	log = new Logger({
		level: quiet ? "error" : "debug", // <-- @TODO: Set to "info" when you're done debugging!
		format: json ? "json" : "simple",
	});
	if (logFilename) {
		writeFile = fileLogger(logFilename);
	} else writeFile = null;
};

// Call this once at startup
/**
 * Logs a message with the specified level.
 * @param level
 * @param message
 * @param component
 * @param details
 * @returns void
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
			// If it's an array, stringify it so it prints as JSON, not [object Object]
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
			//`[${new Date().toISOString().split("T")[1].split(".")[0]}]
			`[${
				String(level).toUpperCase()
			}] [${component}] ${message}${detailsStr}`,
		);
	}
};
