import { dir } from "@cross/dir";
import { ensureDir } from "@std/fs/ensure-dir";
import { join } from "@std/path";

/**
 * @description Ensures a value is not null or undefined, throwing with the given message otherwise.
 */
function ensure<T>(value: T | null | undefined, msg: string): T {
	if (value == null) throw new Error(msg);
	return value;
}

/**
 * @description Manages the application's configuration and pattern directories.
 * @intent Provides a centralized, OS-safe location for storing configuration and pattern files.
 * @see {@link createConfigDir}
 * @example
 * await configDir.init();
 * console.log(configDir.config);
 */
class ConfigDir {
	/** Absolute path to the config directory after initialization. */
	private _configDir: string | null = null;

	/** Absolute path to the patterns directory after initialization. */
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
	 * @description Initializes the config and pattern directories, creating them if necessary.
	 */
	async init(): Promise<void> {
		const home = await dir("config");
		this._configDir = join(home, "batch-rename");
		this._patternDir = join(this._configDir, "patterns");

		// Creating the patterns directory automatically creates the config directory
		await ensureDir(this._patternDir);
	}
}

// The real singleton used by the CLI
export const configDir = new ConfigDir();

/**
 * @description Creates a new isolated ConfigDir instance, primarily for testing.
 */
export function createConfigDir(): ConfigDir {
	return new ConfigDir();
}
