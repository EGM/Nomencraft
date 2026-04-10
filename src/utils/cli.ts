// src/utils/cli.ts
import { Command, Option } from "@cliffy/command";
import { configDir } from "./configDir.ts";
import { configureLogger, LoggerOptions } from "../utils/logger.ts";
import { ControllerService } from "../services/ControllerService.ts";
import {
	PatternService,
	PatternServiceOptions,
} from "../services/PatternService.ts";
import { shallowEqual } from "../utils/compare.ts";
import { ControllerOptions } from "../core/types.ts";

await configDir.init();
const defaultOptions = { mode: "dry-run", json: false, quiet: false };

// Sub command line interface for handling patterns
const patternCli = new Command()
	.description("The pattern subcommand to manage patterns")
	.option("-l, --list", "List all patterns")
	.option("-a, --add <file>", "Add a new pattern")
	.option(
		"-f, --force",
		"Force overwrite when adding a pattern with an existing name",
	)
	.option("-i, --info <name>", "Show pattern info")
	.option("-v, --validate <name>", "Validate pattern config")
	.globalOption(
		"--json",
		"Output logs in JSON format, otherwise simple format.",
		{ default: false },
	)
	.globalOption("-q, --quiet", "Only show errors", { default: false })
	.globalOption(
		"--log <log-filename:string>",
		"File to capture logging output to instead of console",
	)
	.action(async (options) => {
		if (shallowEqual(options, { json: false, quiet: false })) {
			patternCli.showHelp();
		}

		const loggerOptions = {
			json: options.json,
			quiet: options.quiet,
			logFilename: options.log,
		} as const satisfies LoggerOptions;

		const patternOptions: PatternServiceOptions = {
			action: null,
			name: options.info || options.validate,
			file: options.add,
			force: options.force || false,
		};
		if (options.list) patternOptions.action = "list";
		else if (options.add) patternOptions.action = "add";
		else if (options.info) patternOptions.action = "info";
		else if (options.validate) patternOptions.action = "validate";

		configureLogger(loggerOptions);
		const patternService = new PatternService(patternOptions);
		const result = await patternService.run();
		if (!result.success) {
			console.error("❌ Failed:", result.error);
		} else {
			console.log(result.value);
			console.log("✅ Action completed successfully");
		}
	});

// Main command line interface
export const cli = new Command()
	.name("batch-rename")
	.description("Batch rename files based on lab data")
	.argument("<path:string>", "Directory to scan for files (default: .)", {
		default: ".",
	})
	.option("-m, --mode [mode:string]", "Mode: dry-run, rename, move", {
		default: "dry-run",
	})
	.option(
		"-p, --pattern <pattern-name:string>",
		"The name of the pattern defining the filename",
	)
	.option(
		"-o, --output-dir <path:string>",
		"Target directory for 'move' mode",
	)
	.option(
		"--json",
		"Output logs in JSON format, otherwise simple format.",
		{ default: false },
	)
	.option("-q, --quiet", "Only show errors", { default: false })
	.option(
		"--log <log-filename:string>",
		"File to capture logging output to instead of console",
	)
	.action((options, path) => {
		console.log("Path:", path);
		console.log("Options:", options);
		if (shallowEqual(options, defaultOptions)) cli.showHelp();

		// The next line is to modify the type of options.node from <string | true> to <string> for the ControllerService,
		// this can be removed if you ever make the mode required <mode> instead of optional [mode] in the options above.
		const mode = typeof options.mode === "string"
			? options.mode
			: "dry-run";
		options.mode = mode;

		const loggerOptions = {
			json: options.json,
			quiet: options.quiet,
			logFilename: options.log,
		} as const satisfies LoggerOptions;

		configureLogger(loggerOptions);
		const controller = new ControllerService(
			options as ControllerOptions,
			path,
		);
		controller.run();
	})
	.command("pattern", patternCli);
