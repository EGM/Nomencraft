// src/core/types.ts

export type Result<I, O> =
	| { success: true; value: O }
	| { success: false; input: I; error: string };

export type InputMap = Map<string, unknown>;
export type OutputMap = InputMap;

export class PipelineError extends Error {
	constructor(
		public readonly blackboard: InputMap,
		message: string,
	) {
		super(message);
	}
}

export type LogEntry = {
	level: "debug" | "info" | "warn" | "error";
	message: string;
	timestamp: string;
	component: string;
	details?: Record<string, unknown>;
};

export type ControllerMode = "dry-run" | "copy" | "move";

export type ControllerOptions = {
	mode: ControllerMode;
	outputDir?: string;
	logFilename?: string;
	pattern?: string;
};

export interface Measurement {
	labId: string;
	site: string;
	parameter: string;
	unit: string;
	value: string;
}

export interface Sample {
	id: string;
	site: string;
	date: string;
	sampledBy: string;
	measurements: Measurement[];
}

export interface ParsedData {
	job_id: string;
	sample_date: string;
	type_code: string;
	samples: Sample[];
}

/**
 * FilePair is now PURE — no paths.
 * It only identifies which files belong together.
 */
export interface FilePair {
	jobId: string;
	excelName: string;
	pdfName?: string;
}

/**
 * NamedFile is now PURE — no paths.
 * It only describes naming decisions.
 */
export interface NamedFile {
	newExcelName: string;
	typeCode: string;
	typeWord: string;
	reason: string;
	newPdfName?: string;
}
