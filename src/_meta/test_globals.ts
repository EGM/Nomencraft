// This file defines and initializes the global mock rows for tests.

// 1. Declare the global for TypeScript

/** Global vars for testing purposes. */
declare global {
	/** Global var for testing purposes. */
	var __MOCK_ROWS__: Record<string, unknown>[];
}

// 2. Initialize it at runtime
globalThis.__MOCK_ROWS__ = [];

// 3. Make this file a module
export {};
