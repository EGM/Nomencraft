// src/components/GenerateUndoFile.ts

import { BaseComponent } from "../core/BaseComponent.ts";
import type { NamedFile, Result } from "../core/types.ts";
import * as path from "@std/path";
import { configDir } from "../utils/configDir.ts";

/**
 * @name GenerateUndoFile
 * @class
 * @extends BaseComponent
 * @author John LaDuke
 * @version 0.0.0-dev
 * @description Generates a CSV file containing the original and new filenames for all renamed files, enabling the rename operation to be undone later.
 * @intent Acts as the final step in the naming pipeline by producing a reversible audit trail of all file renames, ensuring safe rollback capability.
 * @see {@link BaseComponent} — lifecycle behavior
 * @see {@link Result} — structure returned by `process()`
 * @example
 * ```typescript
 * const g = new GenerateUndoFile();
 * const board = new Map([["namedFiles", namedFiles]]);
 * const result = await g.process(board);
 * ```
 */
export class GenerateUndoFile extends BaseComponent {
	/**
	 * @name constructor
	 * @constructor
	 * @access public
	 * @description Initializes the component and registers its name with the BaseComponent lifecycle system.
	 * @intent Ensures the component is identifiable in logs, lifecycle events, and error emissions.
	 */
	constructor() {
		super("GenerateUndoFile");
	}

	/**
	 * @name process
	 * @method
	 * @async
	 * @param {Map<string, unknown>} input
	 * @returns {Promise<Result<Map<string, unknown>, Map<string, unknown>>>}
	 * @access public
	 * @description Validates the presence of generated file metadata, builds the undo CSV content, writes it to the config directory, and stores the resulting file path in the blackboard.
	 * @intent Provides a deterministic, automated way to record rename operations so they can be reversed without manual tracking.
	 */
	async process(
		input: Map<string, unknown>,
	): Promise<Result<Map<string, unknown>, Map<string, unknown>>> {
		this.started();

		try {
			const namedFiles = input.get("namedFiles") as
				| NamedFile[]
				| undefined;
			if (!namedFiles) {
				this.failed(`Missing required field: namedFiles`);
			}

			const undoContent = this.buildUndoCsv(namedFiles);

			// Write undo file to config directory
			const undoPath = path.join(configDir.config, "undo_rename.csv");
			await Deno.writeTextFile(undoPath, undoContent);

			input.set("undoFileWritten", undoPath);

			this.finished();
			return { success: true, value: input };
		} catch (err) {
			this.emitError({ failed: this.name, error: err });
			return { success: false, input, error: String(err) };
		}
	}

	/**
	 * @name buildUndoCsv
	 * @method
	 * @param {NamedFile[]} namedFiles
	 * @returns {string}
	 * @access private
	 * @description Constructs the CSV content representing original and new filenames, optionally including PDF rename information when present.
	 * @intent Encapsulates the formatting logic for undo data so the CSV structure remains consistent and easy to parse.
	 */
	private buildUndoCsv(namedFiles: NamedFile[]): string {
		const hasAnyPdf = namedFiles.some((f) => f.pdfPath);

		// Header
		const header = hasAnyPdf
			? `"path","original","new","pdfOriginal","pdfNew"`
			: `"path","original","new"`;

		const lines = namedFiles.map((f) => {
			const absDir = path.resolve(path.dirname(f.originalPath));
			const original = path.basename(f.originalPath);
			const newName = path.basename(f.newPath);

			const base = `"${absDir}","${original}","${newName}"`;

			if (!hasAnyPdf) return base;

			const pdfOriginal = f.pdfPath ? path.basename(f.pdfPath) : "";
			const pdfNew = f.pdfNewName ?? "";

			return `${base},"${pdfOriginal}","${pdfNew}"`;
		});

		return [header, ...lines].join("\n");
	}
}
