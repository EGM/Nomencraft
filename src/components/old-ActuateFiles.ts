// src/components/ActuateFiles.ts
import { BaseComponent } from "../core/BaseComponent.ts";
import type { PipelineComponent } from "../core/PipelineComponent.ts";
import type {
	ControllerMode,
	InputMap,
	NamedFile,
	OutputMap,
	Result,
} from "../core/types.ts";
import { FileService } from "../services/FileService.ts";

/**
 * @name ActuateFiles
 * @description
 * Takes the `namedFiles` array produced by GenerateNames and performs the
 * actual filesystem operations (move/copy) using FileService.
 *
 * This is the final "DO IT" step of the pipeline.
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

			if (!Array.isArray(namedFiles)) {
				this.failed("Missing or invalid 'namedFiles' in blackboard");
			}

			if (this.mode === "dry-run") return { success: true, value: input };
			// Invoke FileService to perform the actual operations
			const svc = new FileService({
				action: this.mode,
				files: namedFiles!,
			});

			const result = await svc.run();

			if (!result.success) {
				// FileService already wrote undo file
				this.emitError({
					failed: this.name,
					error: result.error ?? "FileService failed",
				});
				return { success: false, input, error: result.error };
			}

			// Merge undo file path back into the blackboard
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
