// src/utils/fileLogger.test.ts
import { assert, assertEquals } from "@std/assert";
import { fileLogger } from "./fileLogger.ts";
import * as path from "@std/path";

Deno.test("fileLogger: creates base file when none exists", () => {
	const temp = Deno.makeTempDirSync({ prefix: "BRF_", suffix: "_tests" });

	const logPath = path.join(temp, "run.txt");

	const log = fileLogger(logPath);
	log("hello");

	const contents = Deno.readTextFileSync(logPath).trim();
	assertEquals(contents, "hello");
});

Deno.test("fileLogger: enforces .txt when no extension provided", () => {
	const temp = Deno.makeTempDirSync({ prefix: "BRF_", suffix: "_tests" });

	const logPath = path.join(temp, "run");

	const log = fileLogger(logPath);
	log("hello");

	const enforced = path.join(temp, "run.txt");
	const contents = Deno.readTextFileSync(enforced).trim();
	assertEquals(contents, "hello");
});

Deno.test("fileLogger: increments version when base exists", () => {
	const temp = Deno.makeTempDirSync({ prefix: "BRF_", suffix: "_tests" });

	const base = path.join(temp, "log.txt");

	// Create base file
	Deno.writeTextFileSync(base, "existing");

	const log = fileLogger(base);
	log("hello");

	const versioned = path.join(temp, "log-001.txt");
	const contents = Deno.readTextFileSync(versioned).trim();
	assertEquals(contents, "hello");
});

Deno.test("fileLogger: increments highest version, ignores gaps", () => {
	const temp = Deno.makeTempDirSync({ prefix: "BRF_", suffix: "_tests" });

	Deno.writeTextFileSync(path.join(temp, "log.txt"), "base");
	Deno.writeTextFileSync(path.join(temp, "log-001.txt"), "v1");
	Deno.writeTextFileSync(path.join(temp, "log-002.txt"), "v2");
	Deno.writeTextFileSync(path.join(temp, "log-004.txt"), "v4");

	const log = fileLogger(path.join(temp, "log.txt"));
	log("hello");

	const expected = path.join(temp, "log-005.txt");
	const contents = Deno.readTextFileSync(expected).trim();
	assertEquals(contents, "hello");
});

Deno.test("fileLogger: auto-creates nested directories", () => {
	const temp = Deno.makeTempDirSync({ prefix: "BRF_", suffix: "_tests" });

	const nested = path.join(temp, "a/b/c/log.txt");

	const log = fileLogger(nested);
	log("hello");

	const contents = Deno.readTextFileSync(nested).trim();
	assertEquals(contents, "hello");
});
