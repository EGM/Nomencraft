// src/utils/configDir.ts
import { dir } from "@cross/dir";
import { ensureDir } from "@std/fs/ensure-dir";
import { join } from "@std/path";

/**
 * TODO: Describe the ensure function.
 * @param value - {T}
 * @param msg - {string}
 * @returns T
 */
function ensure<T>(value: T | null | undefined, msg: string): T {
	if (value == null) throw new Error(msg);
	return value;
}

/**
 * TODO: Describe the ConfigDir class.
 */
class ConfigDir {
	private _configDir: string | null = null;
	private _patternDir: string | null = null;

	get config(): string {
		return ensure(
			this._configDir,
			"Config directory is not set. You must run `await configDir.init()`",
		);
	}
	get patterns(): string {
		return ensure(
			this._patternDir,
			"Pattern directory is not set. You must run `await configDir.init()`",
		);
	}

	/**
	 * TODO: Describe the init method.
	 */
	async init(): Promise<void> {
		const home = await dir("config"); // Returns OS-safe config base, e.g. ~/.config
		this._configDir = join(home, "batch-rename");
		this._patternDir = join(this._configDir, "patterns");

		// Creating the patterns directory automatically creates the config directory
		await ensureDir(this._patternDir);
	}
}

// The real singleton used by the CLI
export const configDir = new ConfigDir();

// A factory for tests (or advanced users)
/**
 * TODO: Describe the createConfigDir function.
 * @returns ConfigDir
 */
export function createConfigDir(): ConfigDir {
	return new ConfigDir();
}
