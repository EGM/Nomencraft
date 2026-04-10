// src/core/types.ts
/**
 * Unified Result type for service operations.
 * Wraps success/failure with optional data and log entries.
 */
export type Result<I, O> =
	| { success: true; value: O }
	| { success: false; input: I; error: string };
export type newResult<I, S, F> =
	| { success: true; value: S }
	| { success: false; input: I; error: F };

/**
 * Log entry structure for audit trails.
 */
export type LogEntry = {
	level: "debug" | "info" | "warn" | "error";
	message: string;
	timestamp: string;
	component: string;
	details?: Record<string, unknown>;
};

/**
 * Allow any type for details (future-me hates this, but sometimes necessary).
 */
//export type FutureMeHatesThisType = unknown;

/**
 * Controller execution modes.
 */
export type ControllerMode = "dry-run" | "rename" | "move";

/**
 * Controller options passed from CLI.
 */
export type ControllerOptions = {
	mode: ControllerMode;
	outputDir?: string;
	logFilename?: string;
	pattern?: string;
};

/**
 * A single atomic measurement result.
 * This is the fundamental unit of data.
 */
export interface Measurement {
	labId: string; // Unique ID for this specific bottle (e.g., "762-8118-1")
	site: string; // Location ID (e.g., "EFA-2", "RWS-A")
	parameter: string; // e.g., "Coliform, Fecal"
	unit: string; // e.g., "mpn/100ml"
	value: string; // e.g., "1.0 U" (String preserves qualifiers like 'U', 'J3')
}

/**
 * A Sample represents a specific bottle/instance collected.
 */
export interface Sample {
	id: string; // The Lab ID (e.g., "762-8118-1")
	site: string; // The Site ID (e.g., "EFA-2")
	date: string; // Collection Date
	sampledBy: string; // Who pulled it

	// Array of measurements. Allows multiple parameters per sample.
	measurements: Measurement[];
}

/**
 * The final parsed data for a Job.
 */
export interface ParsedData {
	job_id: string; // The Job Number (e.g., "762-8118") - Prefix of Lab IDs
	sample_date: string; // The date of the job
	type_code: string; // Determined later (W, M, D, etc.)
	samples: Sample[]; // List of all bottles/samples in this job
}

export interface FilePair {
	jobId: string;
	excelPath: string;
	pdfPath?: string;
}

export interface NamedFile {
	originalPath: string;
	newPath: string;
	typeCode: string;
	typeWord: string;
	reason: string;
	pdfPath?: string;
	pdfNewName?: string;
}
