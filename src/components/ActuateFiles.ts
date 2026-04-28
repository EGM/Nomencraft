// src/components/ActuateFiles.ts
import { join } from "@std/path";
import { BaseComponent } from "../core/BaseComponent.ts";
import type { PipelineComponent } from "../core/PipelineComponent.ts";
import type {
	ControllerMode,
	FilePair,
	InputMap,
	NamedFile,
	OutputMap,
	Result,
} from "../core/types.ts";
import { FileService } from "../services/FileService.ts";

/**
 * @name ActuateFiles
 * @description
 * Final step of the pipeline. Reattaches full paths to NamedFile entries
 * and invokes FileService to perform real filesystem operations.
 *
 * This is the ONLY impure component in the pipeline.
 */
export class ActuateFiles extends BaseComponent
	implements PipelineComponent<InputMap, OutputMap> {
	constructor(private mode: ControllerMode) {
		super("ActuateFiles");
	}

	override async process(
		input: InputMap,
	): Promise<Result<InputMap, OutputMap>> {
		this.started();

		try {
			const namedFiles = input.get("namedFiles") as
				| NamedFile[]
				| undefined;
			const filePairs = input.get("filePairs") as FilePair[] | undefined;
			const inputDir = input.get("inputDir") as string | undefined;
			const outputDir = input.get("outputDir") as string | undefined;

			// Validate inputs
			if (!Array.isArray(namedFiles)) {
				this.failed("Missing or invalid 'namedFiles' in blackboard");
			}
			if (!Array.isArray(filePairs)) {
				this.failed("Missing or invalid 'filePairs' in blackboard");
			}
			if (filePairs.length !== namedFiles.length) {
				this.failed(
					`Invariant broken: filePairs (${filePairs.length}) and namedFiles (${namedFiles.length}) must match 1:1`,
				);
			}
			if (typeof inputDir !== "string") {
				this.failed("Missing or invalid 'inputDir'");
			}
			if (typeof outputDir !== "string") {
				this.failed("Missing or invalid 'outputDir'");
			}

			// Reattach full paths to NamedFile entries
			const filesWithPaths = namedFiles.map((nf, i) => {
				const pair = filePairs[i];

				return {
					...nf,
					excelSource: join(inputDir, pair.excelName),
					excelDest: join(outputDir, nf.newExcelName),
					...(pair.pdfName && nf.newPdfName
						? {
							pdfSource: join(inputDir, pair.pdfName),
							pdfDest: join(outputDir, nf.newPdfName),
						}
						: {}),
				};
			});

			// Dry-run mode: do not touch filesystem
			if (this.mode === "dry-run") {
				this.emitDebug(
					`Dry-run mode: ${filesWithPaths.length} file operations simulated`,
				);
				input.set("actuationPreview", filesWithPaths);
				this.finished();
				return { success: true, value: input };
			}

			// Real mode: perform filesystem operations
			const svc = new FileService({
				action: this.mode,
				files: filesWithPaths,
			});

			const result = await svc.run();

			if (!result.success) {
				this.emitError({
					failed: this.name,
					error: result.error ?? "FileService failed",
				});
				return { success: false, input, error: result.error };
			}
			// Merge fsResults into the blackboard
			const fsResults = result.value?.get("fsResults");
			if (fsResults) {
				input.set("fsResults", fsResults);
			}

			// FileService wrote undo file — store the path
			if (svc.undoFilePath) {
				input.set("undoFileWritten", svc.undoFilePath);
			}

			this.finished();
			return { success: true, value: input };
		} catch (err) {
			this.emitError({
				failed: this.name,
				error: err instanceof Error ? err.message : String(err),
			});
			return { success: false, input, error: String(err) };
		}
	}
}
