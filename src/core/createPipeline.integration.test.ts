import { assert, assertEquals } from "@std/assert";
import { copy, exists } from "@std/fs";
import { ControllerService } from "../services/ControllerService.ts";
import { ControllerOptions, InputMap } from "./types.ts";
import * as path from "@std/path";

Deno.test("Full pipeline: valid folder produces expected output", async () => {
	// 1. Arrange: create temp folder
	const dir = Deno.makeTempDirSync({ prefix: "BRF_", suffix: "_tests" });

	// 2. Arrange: copy real Excel files into temp folder
	const sourceDir = path.join(
		Deno.cwd(),
		".research",
		"products",
	);
	await copy(sourceDir, dir, { overwrite: true });

	// 3. Arrange: instantiate the real orchestrator
	const options: ControllerOptions = { mode: "move", pattern: "patterns" };
	const service = new ControllerService(options, dir);

	// 4. Act: run the full system ONCE
	const result = await service.run();

	// 5. Extract blackboard
	const bb: InputMap = result.success ? result.value : result.input;

	//console.log("Result:", result);
	//log("Blackboard keys:", [...bb.keys()]);

	// 6. Assert: pipeline succeeded
	assertEquals(result.success, true);

	// 7. Assert: blackboard contains expected keys
	assert(bb.has("filePairs"));
	assert(bb.has("parsedData"));
	assert(bb.has("namedFiles"));
	assert(bb.has("undoFileWritten"));
	assert(bb.has("showData"));

	// 8. Assert: undo file exists
	const undoPath = bb.get("undoFileWritten");
	console.debug("Undo Path:", undoPath);

	assert(undoPath);
	assert(await exists(undoPath));

	// 9. Assert: at least one renamed file exists
	// We cannot assert specific filenames because naming is dynamic,
	// but we CAN assert that at least one expected output file exists.
	const fsResults = bb.get("fsResults");
	console.log("fsResults:", fsResults);
	assert(Array.isArray(fsResults));
	assert(fsResults.length > 0);

	let foundOne = false;
	for (const r of fsResults) {
		const dest = r.file.excelDest;
		if (await exists(dest)) {
			foundOne = true;
			break;
		}
	}
	assert(foundOne);
});
