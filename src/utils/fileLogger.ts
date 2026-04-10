// src/utils/fileLogger.ts
import * as path from "@std/path";
import { ensureDirSync, existsSync } from "@std/fs";

/**
 * Resolve a versioned log filename based on the user's input.
 * Implements the increment-last-version scheme.
 */
function resolveLogFilename(logFilename: string): string {
	const { dir, name, ext } = path.parse(logFilename);

	// 1. Enforce .txt if no extension
	const finalExt = ext || ".txt";
	const base = `${name}${finalExt}`;
	const basePath = dir ? path.join(dir, base) : base;

	// Ensure directory exists BEFORE any return
	if (dir) {
		ensureDirSync(dir);
	}

	// 2. If base file doesn't exist, use it
	if (!existsSync(basePath)) {
		return basePath;
	}

	// 3. Scan directory for versioned files
	const folder = dir || ".";
	const entries = Array.from(Deno.readDirSync(folder));

	const versionRegex = new RegExp(
		`^${name}-(\\d{3})${finalExt.replace(".", "\\.")}$`,
	);

	let highest = 0;

	for (const entry of entries) {
		if (!entry.isFile) continue;

		const match = entry.name.match(versionRegex);
		if (match) {
			const num = Number(match[1]);
			if (num > highest) highest = num;
		}
	}

	// 4. Next version = highest + 1
	const next = highest + 1;
	if (next > 999) {
		throw new Error(
			"Too many log versions (max 999). User reaps what they sow.",
		);
	}

	const padded = String(next).padStart(3, "0");
	const versionedName = `${name}-${padded}${finalExt}`;

	return dir ? path.join(dir, versionedName) : versionedName;
}

/**
 * Creates a file logger that writes messages to a versioned log file.
 * @param logFilename - The user-provided filename or path.
 * @returns A function that logs messages to the resolved file.
 */
export function fileLogger(logFilename: string) {
	const resolved = resolveLogFilename(logFilename);

	return (msg: string) => {
		Deno.writeTextFileSync(resolved, msg + "\n", { append: true });
	};
}

/** Type for the file logger factory @see fileLogger */
type FileLogger = typeof fileLogger;
/** Type for the file logger function  @see fileLogger */
export type FileWriter = ReturnType<FileLogger>;
