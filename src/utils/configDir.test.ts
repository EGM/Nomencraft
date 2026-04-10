// src/utils/configDir.test.ts

import { assertEquals, assertThrows } from "@std/assert";
import { createConfigDir } from "./configDir.ts";
import { dir } from "@cross/dir";
import { join } from "@std/path";

Deno.test("configDir: accessing config before init throws", () => {
	const cfg = createConfigDir();
	assertThrows(() => cfg.config);
});

Deno.test("configDir: accessing patterns before init throws", () => {
	const cfg = createConfigDir();
	assertThrows(() => cfg.patterns);
});

Deno.test("configDir: config path resolves correctly after init", async () => {
	const cfg = createConfigDir();
	await cfg.init();

	const home = await dir("config");
	const expected = join(home, "batch-rename");

	assertEquals(cfg.config, expected);
});

Deno.test("configDir: patterns path resolves correctly after init", async () => {
	const cfg = createConfigDir();
	await cfg.init();

	const home = await dir("config");
	const expected = join(home, "batch-rename", "patterns");

	assertEquals(cfg.patterns, expected);
});
