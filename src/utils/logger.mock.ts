/**
 * @description Test mock for appLog that captures all log calls.
 */
export const appLog = (...args: unknown[]) => {
	(globalThis as unknown as { __capturedLogs: unknown[][] }).__capturedLogs
		.push(args);
};
