// src/services/ControllerService.ts
import { join } from "@std/path";
import { GenerateNames } from "../components/GenerateNames.ts";
import { GenerateUndoFile } from "../components/GenerateUndoFile.ts";
import { ParseExcelFiles } from "../components/ParseExcelFiles.ts";
import { ReadFilePairs } from "../components/ReadFilePairs.ts";
import { BaseComponent } from "../core/BaseComponent.ts";
import { BaseService } from "../core/BaseService.ts";
import { createPipeline } from "../core/createPipeline.ts";
import { Result } from "../core/types.ts";
import { configDir } from "../utils/configDir.ts";

export class ControllerService extends BaseService {
	constructor(private options, private path: string) {
		super("ControllerService");
		configDir.init();
		//console.log("ControllerService initialized with options:", options);
	}

	observe(component: BaseComponent) {
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

	protected async execute(): Promise<Result<void>> {
		// 1. Build blackboard
		const board = new Map<string, unknown>();
		board.set("dirPath", this.path);
		//board.set("patternPath", this.options.pattern);
		board.set("mode", this.options.mode);
		board.set("outputDir", this.options.outputDir);
		board.set(
			"patternPath",
			join(configDir.config, "patterns", `${this.options.pattern}.yaml`),
		);

		// 2. Build pipeline
		const pipeline = createPipeline(
			new ReadFilePairs(),
			new ParseExcelFiles(),
			new GenerateNames(),
			new GenerateUndoFile(),
		);

		// 3. Observe components
		pipeline.observeWith(this);

		// 4. Run pipeline
		const result = await pipeline.run(board);
		const obj = Object.fromEntries(result.value.entries());
		console.log(
			//obj.parsedData[0],
			obj.namedFiles[0],
			obj.filePairs[0],
		);

		// 5. Interpret result
		if (!result.success) {
			return this.fail(undefined, result.error);
		}

		return this.ok(undefined, undefined);
	}
}
