/**
 * TODO: Describe this arrow function (<anonymous>).
 * @param args - {unknown[]}
 */
export const appLog = (...args: unknown[]) => {
	(globalThis as unknown as { __capturedLogs: unknown[][] }).__capturedLogs
		.push(args);
};
