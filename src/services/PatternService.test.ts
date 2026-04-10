// src/services/PatternService.test.ts
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { createConfigDir } from "../utils/configDir.ts";
import { ensureDir } from "@std/fs/ensure-dir";
import { join } from "@std/path";
import { writeFileSync } from "node:fs";
import { PatternServiceOptions } from "./PatternService.ts";

// Helper to write files easily
function write(file: string, content: string) {
	writeFileSync(file, content);
}

Deno.test("PatternService: list, info, validate, add", async (t) => {
	// ------------------------------------------------------------
	// 1. Create isolated temp config directory (BRF_..._tests)
	// ------------------------------------------------------------
	const tempRoot = Deno.makeTempDirSync({
		prefix: "BRF_",
		suffix: "_tests",
	});

	// Create an isolated configDir instance
	const cfg = createConfigDir();
	cfg["_configDir"] = tempRoot;
	cfg["_patternDir"] = join(tempRoot, "patterns");
	await ensureDir(cfg.patterns);

	// ------------------------------------------------------------
	// 2. Patch the REAL configDir singleton BEFORE importing PatternService
	// ------------------------------------------------------------
	const realConfig = await import("../utils/configDir.ts");
	realConfig.configDir["_configDir"] = cfg["_configDir"];
	realConfig.configDir["_patternDir"] = cfg["_patternDir"];

	// ------------------------------------------------------------
	// 3. NOW import PatternService (so it sees the patched configDir)
	// ------------------------------------------------------------
	const { PatternService } = await import("./PatternService.ts");

	// Helper to create service instances
	function makeService(opts: PatternServiceOptions) {
		return new PatternService(opts);
	}

	// ------------------------------------------------------------
	// 4. Create sample patterns
	// ------------------------------------------------------------
	const yamlPath = join(cfg.patterns, "invoice.yaml");
	const ymlPath = join(cfg.patterns, "invoice.yml");
	const jsonPath = join(cfg.patterns, "invoice.json");

	write(yamlPath, `name: invoice\nversion: 1`);
	write(ymlPath, `name: invoice-yml\nversion: 2`);
	write(jsonPath, `{"name": "invoice-json", "version": 3}`);

	// ------------------------------------------------------------
	// 5. list()
	// ------------------------------------------------------------
	await t.step("list() returns deduplicated pattern names", async () => {
		const svc = makeService({ action: "list" });
		const result = await svc.run();

		assert(result.success);
		assertEquals(result.value, ["invoice"]);
	});

	// ------------------------------------------------------------
	// 6. info() fails when duplicates exist
	// ------------------------------------------------------------
	await t.step("info() fails when multiple pattern files exist", async () => {
		const svc = makeService({ action: "info", name: "invoice" });
		const result = await svc.run();

		assert(!result.success);
		assertStringIncludes(result.error, "Multiple pattern files found");
		assertStringIncludes(result.error, "invoice.yaml");
		assertStringIncludes(result.error, "invoice.yml");
		assertStringIncludes(result.error, "invoice.json");
	});

	// ------------------------------------------------------------
	// 7. validate() fails when duplicates exist
	// ------------------------------------------------------------
	await t.step(
		"validate() fails when multiple pattern files exist",
		async () => {
			const svc = makeService({ action: "validate", name: "invoice" });
			const result = await svc.run();

			assert(!result.success);
			assertStringIncludes(result.error, "Multiple pattern files found");
			assertStringIncludes(result.error, "Validate WHICH one");
		},
	);

	// ------------------------------------------------------------
	// 8. add() copies a pattern file into patterns directory
	// ------------------------------------------------------------
	await t.step(
		"add() copies a pattern file into patterns directory",
		async () => {
			const tempFile = join(tempRoot, "newPattern.yaml");
			write(tempFile, `name: newPattern\nversion: 1`);

			const svc = makeService({ action: "add", file: tempFile });
			const result = await svc.run();

			assert(result.success);

			// Verify file exists in patterns dir
			const added = join(cfg.patterns, "newPattern.yaml");
			const stat = await Deno.stat(added);
			assert(stat.isFile);
		},
	);
});
