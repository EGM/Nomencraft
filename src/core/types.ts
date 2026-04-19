// src/core/types.ts

/**
 * @name Result
 * @template I
 * @template O
 * @description Represents the standardized success/failure wrapper used throughout the pipeline.
 * A successful result contains only a `value`, while a failure contains the original `input` and an error message.
 * @intent Provides a uniform return shape for all components and services, enabling deterministic chaining,
 * error propagation, and consistent handling of both success and failure states.
 */
export type Result<I, O> =
	| { success: true; value: O }
	| { success: false; input: I; error: string };

/**
 * @name LogEntry
 * @description Structured log record emitted by services and components, capturing severity, message text,
 * timestamp, component name, and optional diagnostic details.
 * @intent Defines a consistent logging format that can be stored, streamed, or analyzed across the entire system.
 */
export type LogEntry = {
	level: "debug" | "info" | "warn" | "error";
	message: string;
	timestamp: string;
	component: string;
	details?: Record<string, unknown>;
};

/**
 * @name ControllerMode
 * @description Enumerates the operational modes available to controllers: `"dry-run"` for simulation,
 * `"rename"` for renaming operations, and `"move"` for file relocation.
 * @intent Provides a constrained set of valid modes to ensure predictable controller behavior and prevent invalid configuration states.
 */
export type ControllerMode = "dry-run" | "rename" | "move";

/**
 * @name ControllerOptions
 * @description Configuration object describing how a controller should operate, including mode selection and
 * optional output, logging, and pattern‑matching settings.
 * @intent Allows controllers to be configured declaratively while ensuring all required fields are explicit and validated.
 */
export type ControllerOptions = {
	mode: ControllerMode;
	outputDir?: string;
	logFilename?: string;
	pattern?: string;
};

/**
 * @interface
 * @name Measurement
 * @description Represents a single analytical measurement for a sample, including lab ID, site, parameter name,
 * reporting unit, and raw value.
 * @intent Provides a strongly typed structure for parsed laboratory results, enabling downstream validation,
 * transformation, and reporting.
 */
export interface Measurement {
	/**
	 * @property
	 * @name labId
	 * @description todo
	 */
	labId: string;
	/**
	 * @property
	 * @name site
	 * @description todo
	 */
	site: string;
	/**
	 * @property
	 * @name parameter
	 * @description todo
	 */
	parameter: string;
	/**
	 * @property
	 * @name unit
	 * @description todo
	 */
	unit: string;
	/**
	 * @property
	 * @name value
	 * @description todo
	 */
	value: string;
}

/**
 * @interface
 * @name Sample
 * @description Represents a single collected sample (bottle), including metadata such as ID, site, date, sampler,
 * and its associated measurements.
 * @intent Defines the core unit of laboratory data within a parsed job, ensuring consistent structure for downstream processing.
 */
export interface Sample {
	/**
	 * @property
	 * @name id
	 * @description todo
	 */
	id: string;
	/**
	 * @property
	 * @name site
	 * @description todo
	 */
	site: string;
	/**
	 * @property
	 * @name date
	 * @description todo
	 */
	date: string;
	/**
	 * @property
	 * @name sampledBy
	 * @description todo
	 */
	sampledBy: string;
	/**
	 * @property
	 * @name measurements
	 * @description todo
	 */
	measurements: Measurement[];
}

/**
 * @interface
 * @name ParsedData
 * @description Represents the fully parsed contents of a laboratory job, including job metadata and the list of
 * all samples associated with that job.
 * @intent Acts as the canonical structured output of Excel parsing, enabling validation, transformation, and
 * reporting across the pipeline.
 */
export interface ParsedData {
	/**
	 * @property
	 * @name job_id
	 * @description todo
	 */
	job_id: string;
	/**
	 * @property
	 * @name sample_date
	 * @description todo
	 */
	sample_date: string;
	/**
	 * @property
	 * @name type_code
	 * @description todo
	 */
	type_code: string;
	/**
	 * @property
	 * @name samples
	 * @description todo
	 */
	samples: Sample[];
}

/**
 * @interface
 * @name FilePair
 * @description Represents a matched pair of files belonging to the same job: an Excel file and an optional PDF report.
 * @intent Provides a normalized structure for directory‑scanned file pairs so downstream components can reliably
 * locate and process related files.
 */
export interface FilePair {
	/**
	 * @property
	 * @name jobId
	 * @description todo
	 */
	jobId: string;
	/**
	 * @property
	 * @name excelPath
	 * @description todo
	 */
	excelPath: string;
	/**
	 * @property
	 * @name pdfPath
	 * @description todo
	 */
	pdfPath?: string;
}

/**
 * @interface
 * @name NamedFile
 * @description Represents a file that has been assigned a new name and classification, including its original path,
 * new path, type metadata, and optional PDF associations.
 * @intent Provides a structured representation of renamed or reclassified files, enabling consistent tracking,
 * logging, and downstream processing.
 */
export interface NamedFile {
	/**
	 * @property
	 * @name originalPath
	 * @description The original directory of the files being renamed.
	 */
	originalPath: string;
	/**
	 * @property
	 * @name newPath
	 * @description The new path for moved files.
	 */
	newPath: string;
	/**
	 * @property
	 * @name typeCode
	 * @description The pattern that matched the file contents.
	 */
	typeCode: string;
	/**
	 * @property
	 * @name typeWord
	 * @description todo
	 */
	typeWord: string;
	/**
	 * @property
	 * @name reason
	 * @description todo
	 */
	reason: string;
	/**
	 * @property
	 * @name pdfPath
	 * @description The PDF report that accompanies the Excel file.
	 */
	pdfPath?: string;
	/**
	 * @property
	 * @name pdfNewName
	 * @description The newly minted name for the PDF report.
	 */
	pdfNewName?: string;
}
