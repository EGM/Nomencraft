// src/components/GenerateUndoFile.ts

import { BaseComponent } from "../core/BaseComponent.ts";
import type { NamedFile, Result } from "../core/types.ts";
import * as path from "@std/path";
import { configDir } from "../utils/configDir.ts";

/**
 * @description Generates a CSV listing original and new filenames so rename operations can be undone.
 * @see BaseComponent
 * @see Result
 */
export class GenerateUndoFile extends BaseComponent {
	/** @description Registers the component name with the BaseComponent lifecycle. */
	constructor() {
		super("GenerateUndoFile");
	}

	/**
	 * @description Validates input, builds the undo CSV, writes it to the config directory, and stores the output path.
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
	 * @description Builds CSV content for undo operations, including PDF info when present.
	 */
	private buildUndoCsv(namedFiles: NamedFile[]): string {
		const hasAnyPdf = namedFiles.some((f) => f.pdfPath);

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
