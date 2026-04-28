// src/services/FileService.ts
import { exists } from "@std/fs";
import { join } from "@std/path";
import { BaseServiceWithFailProtection } from "../core/BaseServiceWithFailProtection.ts";
import type { InputMap, OutputMap, Result } from "../core/types.ts";

export interface ActuationFile {
	excelSource: string;
	excelDest: string;
	pdfSource?: string;
	pdfDest?: string;
	typeCode: string;
	typeWord: string;
	reason: string;
	newExcelName: string;
	newPdfName?: string;
}

export interface ActionResult {
	success: boolean;
	error?: string;
	file: ActuationFile;
}

export interface FileServiceOptions {
	action: "copy" | "move";
	files: ActuationFile[];
}

export class FileService extends BaseServiceWithFailProtection {
	public undoFilePath: string | undefined;

	constructor(private options: FileServiceOptions) {
		super("FileService");
	}

	/**
	 * @description Validates that source files exist before operating.
	 */
	private async validateFile(
		file: ActuationFile,
	): Promise<{ success: boolean; error?: string }> {
		try {
			const excelExists = await exists(file.excelSource);
			if (!excelExists) {
				return {
					success: false,
					error:
						`Excel source file does not exist: ${file.excelSource}`,
				};
			}

			if (file.pdfSource) {
				const pdfExists = await exists(file.pdfSource);
				if (!pdfExists) {
					return {
						success: false,
						error:
							`PDF source file does not exist: ${file.pdfSource}`,
					};
				}
			}

			return { success: true };
		} catch (err) {
			return {
				success: false,
				error: `Validation exploded: ${
					err instanceof Error ? err.message : String(err)
				}`,
			};
		}
	}

	/**
	 * @description Entry point for BaseServiceWithFailProtection.
	 */
	protected override async execute(): Promise<Result<InputMap, OutputMap>> {
		return await this.executeWithProtection();
	}

	/**
	 * @description Performs validation, file operations, undo file creation, and returns a Result.
	 */
	protected override async executeWithProtection(): Promise<
		Result<InputMap, OutputMap>
	> {
		const { action, files } = this.options;

		// 1. Validate all files
		const validationResults = await Promise.all(
			files.map((f) => this.validateFile(f)),
		);

		// 2. Build initial fsResults
		const fsResults: ActionResult[] = files.map((file, i) => ({
			file,
			success: validationResults[i].success,
			error: validationResults[i].error,
		}));

		// 3. Operate only on valid files
		const validFiles = fsResults.filter((r) => r.success).map((r) =>
			r.file
		);

		let opResults: ActionResult[] = [];
		switch (action) {
			case "copy":
				opResults = await Promise.all(
					validFiles.map((f) => this.copyFile(f)),
				);
				break;

			case "move":
				opResults = await Promise.all(
					validFiles.map((f) => this.moveFile(f)),
				);
				break;

			default:
				return this.fail(`Unknown action: ${action}`, new Map());
		}

		// 4. Merge operation results
		for (const op of opResults) {
			const row = fsResults.find((r) => r.file === op.file);
			if (row) {
				row.success = op.success;
				row.error = op.error;
			}
		}

		// 5. Detect catastrophic failure
		const catastrophic = fsResults.some((r) => r.success === false);

		// Always write undo file
		this.undoFilePath = await this.writeUndoFile(fsResults);

		if (catastrophic) {
			return this.fail("One or more file operations failed", new Map());
		}

		// 6. Success
		return this.ok(new Map([["fsResults", fsResults]]));
	}

	/**
	 * @description Performs a single copy operation (Excel + optional PDF).
	 */
	private async copyFile(file: ActuationFile): Promise<ActionResult> {
		try {
			await Deno.copyFile(file.excelSource, file.excelDest);

			if (file.pdfSource && file.pdfDest) {
				await Deno.copyFile(file.pdfSource, file.pdfDest);
			}

			return { success: true, file };
		} catch (err) {
			return {
				success: false,
				file,
				error: err instanceof Error ? err.message : String(err),
			};
		}
	}

	/**
	 * @description Performs a single move operation (Excel + optional PDF).
	 */
	private async moveFile(file: ActuationFile): Promise<ActionResult> {
		try {
			await Deno.rename(file.excelSource, file.excelDest);

			if (file.pdfSource && file.pdfDest) {
				await Deno.rename(file.pdfSource, file.pdfDest);
			}

			return { success: true, file };
		} catch (err) {
			return {
				success: false,
				file,
				error: err instanceof Error ? err.message : String(err),
			};
		}
	}

	/**
	 * @description Writes undo.json describing how to reverse operations.
	 */
	private async writeUndoFile(results: ActionResult[]): Promise<string> {
		const undoEntries = results.map((r) => {
			const file = r.file;

			if (!r.success) {
				return {
					action: "noop",
					excel: { from: file.excelSource },
					pdf: file.pdfSource ? { from: file.pdfSource } : undefined,
					file,
				};
			}

			switch (this.options.action) {
				case "move":
					return {
						action: "move",
						excel: { from: file.excelDest, to: file.excelSource },
						pdf: file.pdfDest
							? { from: file.pdfDest, to: file.pdfSource }
							: undefined,
						file,
					};

				case "copy":
					return {
						action: "delete",
						excel: { from: file.excelDest },
						pdf: file.pdfDest ? { from: file.pdfDest } : undefined,
						file,
					};

				default:
					return {
						action: "noop",
						excel: { from: file.excelSource },
						pdf: file.pdfSource
							? { from: file.pdfSource }
							: undefined,
						file,
					};
			}
		});

		const dir = Deno.makeTempDirSync({ prefix: "BRF_UNDO_" });
		const undoPath = join(dir, "undo.json");

		await Deno.writeTextFile(
			undoPath,
			JSON.stringify(undoEntries, null, 2),
		);

		return undoPath;
	}
}
