// src/core/types.ts
/**
 * Unified Result type for service operations.
 * Wraps success/failure with optional data and log entries.
 */
export type Result<I, O> =
	| { success: true; value: O }
	| { success: false; input: I; error: string };

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
	/** todo */
	id: string; // The Lab ID (e.g., "762-8118-1")
	/** todo */
	site: string; // The Site ID (e.g., "EFA-2")
	/** todo */
	date: string; // Collection Date
	/** todo */
	sampledBy: string; // Who pulled it

	// Array of measurements. Allows multiple parameters per sample.
	measurements: Measurement[];
}

/**
 * The final parsed data for a Job.
 */
export interface ParsedData {
	/** todo */
	job_id: string; // The Job Number (e.g., "762-8118") - Prefix of Lab IDs
	/** todo */
	sample_date: string; // The date of the job
	/** todo */
	type_code: string; // Determined later (W, M, D, etc.)
	/** todo */
	samples: Sample[]; // List of all bottles/samples in this job
}

export interface FilePair {
	/** todo */
	jobId: string;
	/** todo */
	excelPath: string;
	/** todo */
	pdfPath?: string;
}

export interface NamedFile {
	/** todo */
	originalPath: string;
	/** todo */
	newPath: string;
	/** todo */
	typeCode: string;
	/** todo */
	typeWord: string;
	/** todo */
	reason: string;
	/** todo */
	pdfPath?: string;
	/** todo */
	pdfNewName?: string;
}
