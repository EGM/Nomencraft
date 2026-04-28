// src/components/GenerateUndoFile.ts
import { BaseComponent } from "../core/BaseComponent.ts";
import type {
	FilePair,
	InputMap,
	NamedFile,
	OutputMap,
	Result,
} from "../core/types.ts";

/**
 * @name GenerateUndoFile
 * @class
 * @extends BaseComponent
 * @description
 * Produces a *pure* undo description based on FilePair + NamedFile.
 *
 * This component does NOT know about paths or the filesystem.
 * It simply describes what would be undone if ActuateFiles performs moves.
 *
 * This is intentionally kept as a reference/example component.
 */
export class GenerateUndoFile extends BaseComponent {
	constructor() {
		super("GenerateUndoFile");
	}

	override async process(
		input: InputMap,
	): Promise<Result<InputMap, OutputMap>> {
		this.started();

		try {
			const filePairs = input.get("filePairs") as FilePair[] | undefined;
			const namedFiles = input.get("namedFiles") as
				| NamedFile[]
				| undefined;

			if (!filePairs || !Array.isArray(filePairs)) {
				this.failed("Missing or invalid 'filePairs'");
			}

			if (!namedFiles || !Array.isArray(namedFiles)) {
				this.failed("Missing or invalid 'namedFiles'");
			}

			if (filePairs.length !== namedFiles.length) {
				this.failed(
					`Invariant broken: filePairs (${filePairs.length}) and namedFiles (${namedFiles.length}) must match 1:1`,
				);
			}

			const undoEntries = [];

			for (let i = 0; i < filePairs.length; i++) {
				const pair = filePairs[i];
				const named = namedFiles[i];

				// Pure description of what would be undone
				undoEntries.push({
					jobId: pair.jobId,
					excel: {
						originalName: pair.excelName,
						newName: named.newExcelName,
					},
					...(pair.pdfName && named.newPdfName
						? {
							pdf: {
								originalName: pair.pdfName,
								newName: named.newPdfName,
							},
						}
						: {}),
				});
			}

			input.set("undoEntries", undoEntries);

			this.finished();
			return { success: true, value: input };
		} catch (err) {
			this.emitError({ failed: this.name, error: err });
			return { success: false, input, error: String(err) };
		}
	}
}
