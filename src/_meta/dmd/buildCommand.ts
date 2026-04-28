import { Command } from "@cliffy/command";

export const command = new Command()
	.name("DocMd")
	.description("Generates an API.md file.")
	.version("v1.0.0")
	.argument("<source:string>", "Source files.")
	.option("-e, --exclude <exclude:string>", "File patterns to exclude.")
	.option(
		"-o, --output <output:string>",
		"Target folder for markdown files.",
	);
