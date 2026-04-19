import * as path from "@std/path";
import { ensureDirSync, existsSync } from "@std/fs";

/**
 * @description Resolves a versioned log filename using an incrementing scheme.
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
 * @description Creates a logger that writes messages to a versioned log file.
 * @see resolveLogFilename
 */
export function fileLogger(logFilename: string): (msg: string) => void {
	const resolved = resolveLogFilename(logFilename);

	return (msg: string) => {
		Deno.writeTextFileSync(resolved, msg + "\n", { append: true });
	};
}

/**
 * @internal
 * @description Type alias for the file logger factory.
 */
type FileLogger = typeof fileLogger;

/** @description Type alias for the logger function returned by fileLogger. */
export type FileWriter = ReturnType<FileLogger>;
