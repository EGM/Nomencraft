export async function executeUndoFile(path: string): Promise<void> {
	const text = await Deno.readTextFile(path);
	const entries = JSON.parse(text);

	for (const entry of entries) {
		console.log(`ENTRY: ${entry}`);

		switch (entry.action) {
			case "move":
				await Deno.rename(entry.from, entry.to);
				break;

			case "delete":
				// Ignore if already gone
				try {
					await Deno.remove(entry.from);
				} catch {
					// noop
				}
				break;

			case "noop":
				// nothing to undo
				break;

			default:
				throw new Error(`Unknown undo action: ${entry.action}`);
		}
	}
}
