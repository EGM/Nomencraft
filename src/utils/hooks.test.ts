// hooks.test.ts

// @intent Demonstrate and verify hook behavior in executable form.
// @ai Keep tests readable; they double as documentation.

import {
	//	useAsync,
	useDebounce,
	useEventListener,
	useFileWatcher,
	useInterval,
	useState,
	useThrottle,
} from "./hooks.ts";

Deno.test("useState stores and retrieves values", () => {
	const [getCount, setCount] = useState(0);
	setCount(42);
	if (getCount() !== 42) throw new Error("State did not update correctly");
});

Deno.test("useInterval starts and stops", async () => {
	let ticks = 0;
	const timer = useInterval(() => ticks++, 50);
	timer.start();
	await new Promise((res) => setTimeout(res, 120));
	timer.stop();
	if (ticks < 2) throw new Error("Interval did not tick enough times");
});

/*
Deno.test("useAsync resolves and tracks state", async () => {
	const asyncHook = useAsync(async () => {
		await new Promise((res) => setTimeout(res, 10));
		return "done";
	});
	const result = await asyncHook.run();
	if (result.result !== "done") throw new Error("Async result mismatch");
	if (asyncHook.getState().isLoading) {
		throw new Error("isLoading should be false");
	}
});
*/

Deno.test("useDebounce delays execution", async () => {
	let calls = 0;
	const debounced = useDebounce(() => calls++, 50);
	debounced();
	debounced();
	await new Promise((res) => setTimeout(res, 70));
	if (calls !== 1) throw new Error("Debounce did not work correctly");
});

Deno.test("useThrottle limits execution rate", async () => {
	let calls = 0;
	const throttled = useThrottle(() => calls++, 50);
	throttled();
	throttled();
	await new Promise((res) => setTimeout(res, 60));
	throttled();
	if (calls !== 2) throw new Error("Throttle did not work correctly");
});

Deno.test({
	name: "useFileWatcher detects file changes",
	permissions: { read: true, write: true },
	async fn() {
		const testFile = "./temp_test_file.txt";
		await Deno.writeTextFile(testFile, "initial");

		let changeDetected = false;
		const watcher = useFileWatcher(testFile, (event) => {
			if (event.kind === "modify") {
				changeDetected = true;
			}
		});

		// Start watching in the background
		watcher.start();

		// Modify the file to trigger the watcher
		await new Promise((res) => setTimeout(res, 50));
		await Deno.writeTextFile(testFile, "updated");

		// Give watcher time to detect
		await new Promise((res) => setTimeout(res, 100));

		watcher.stop();
		await Deno.remove(testFile);

		if (!changeDetected) throw new Error("File change was not detected");
	},
});

Deno.test("useEventListener attaches and detaches", () => {
	const target = new EventTarget();
	let count = 0;

	const stop = useEventListener(target, "ping", () => count++);

	// Fire event
	target.dispatchEvent(new Event("ping"));
	if (count !== 1) throw new Error("listener did not fire");

	// Remove listener
	stop();
	target.dispatchEvent(new Event("ping"));
	if (count !== 1) throw new Error("listener was not removed");
});
