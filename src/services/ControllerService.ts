import { join } from "@std/path";
import { GenerateNames } from "../components/GenerateNames.ts";
import { GenerateUndoFile } from "../components/GenerateUndoFile.ts";
import { ParseExcelFiles } from "../components/ParseExcelFiles.ts";
import { ReadFilePairs } from "../components/ReadFilePairs.ts";
import { BaseComponent } from "../core/BaseComponent.ts";
import { BaseService } from "../core/BaseService.ts";
import { createPipeline } from "../core/createPipeline.ts";
import { ControllerOptions, Result } from "../core/types.ts";
import { configDir } from "../utils/configDir.ts";

/**
 * @name ControllerService
 * @class
 * @description Coordinates the full end‑to‑end processing workflow by constructing
 * the blackboard, assembling the pipeline, wiring component observers, and
 * executing the pipeline to completion.
 * @intent Acts as the top‑level orchestration layer for the system, ensuring that
 * components run in deterministic order, emit structured events, and produce a
 * unified Result for callers.
 * @see {@link createPipeline}
 * @example
 * ```ts
 * const svc = new ControllerService(options, "/path/to/dir");
 * const result = await svc.run();
 * ```
 */
export class ControllerService extends BaseService {
	constructor(private options: ControllerOptions, private path: string) {
		super("ControllerService");
		configDir.init();
	}

	/**
	 * @name observeComponent
	 * @method
	 * @param {BaseComponent} component
	 * @access public
	 * @description Subscribes to all lifecycle and diagnostic events emitted by a
	 * pipeline component and forwards them to the service’s logging system.
	 * @intent Provides centralized, consistent logging for every component in the
	 * pipeline, enabling traceability, debugging, and structured diagnostics.
	 */
	observeComponent(component: BaseComponent) {
		component.addEventListener("debug", (e: Event) => {
			const detail = (e as CustomEvent).detail;
			this.log("debug", JSON.stringify(detail));
		});

		component.addEventListener("warning", (e: Event) => {
			const detail = (e as CustomEvent).detail;
			this.log("warn", JSON.stringify(detail));
		});

		component.addEventListener("error", (e: Event) => {
			const detail = (e as CustomEvent).detail;
			this.log("error", JSON.stringify(detail));
		});

		component.addEventListener("started", () => {
			this.log("info", `Started ${component.name}`);
		});

		component.addEventListener("finished", () => {
			this.log("info", `Finished ${component.name}`);
		});

		component.addEventListener("failed", (e: Event) => {
			const detail = (e as CustomEvent).detail;
			this.log("error", `Failed ${component.name}: ${detail.error}`);
		});
	}

	/**
	 * @name execute
	 * @method
	 * @returns {Promise<Result<void>>}
	 * @access protected
	 * @description Builds the blackboard, constructs the pipeline, attaches
	 * observers, executes the pipeline, and interprets the final Result.
	 * @intent Serves as the service’s main execution entry point, ensuring that
	 * pipeline results are normalized into the standard Result type and that
	 * failures propagate cleanly to callers.
	 */
	protected async execute(): Promise<Result<void, void>> {
		const board = new Map<string, unknown>();
		board.set("dirPath", this.path);
		board.set("mode", this.options.mode);
		board.set("outputDir", this.options.outputDir);
		board.set(
			"patternPath",
			join(configDir.config, "patterns", `${this.options.pattern}.yaml`),
		);

		const pipeline = createPipeline(
			new ReadFilePairs(),
			new ParseExcelFiles(),
			new GenerateNames(),
			new GenerateUndoFile(),
		);

		pipeline.observeWith(this);

		const result = await pipeline.run(board);

		if (!result.success) {
			return this.fail(undefined, result.error);
		}

		const obj = Object.fromEntries(result.value.entries());

		return this.ok(undefined, undefined);
	}
}
