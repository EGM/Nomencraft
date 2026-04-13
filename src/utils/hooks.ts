/**
 * Deno + TypeScript Hooks & Listeners
 *
 * Framework-agnostic, reusable utilities
 * @module utils/hooks
 *
 * @intent Provide a collection of hooks for managing state, intervals, file watching, signals, async operations, and function debouncing/throttling in Deno scripts.
 * @decision Encapsulate common patterns in reusable functions to avoid boilerplate and improve code organization.
 * @ai Ensure hooks are simple to use and understand, with clear APIs and documentation.
 */

/**
 * @intent Encapsulate mutable state in a closure for reuse across procedural scripts.
 * @decision Avoids global variables; keeps state local to the hook instance.
 *
 * @template T - The type of the state value.
 * @param {T} initialValue - The initial state value.
 * @returns {[() => T, (newValue: T) => void]} A tuple with a getter and setter function.
 *
 * @example
 * const [getCount, setCount] = useState(0);
 * setCount(getCount() + 1);
 * console.log(getCount()); // 1
 */
export function useState<T>(initialValue: T): [() => T, (newValue: T) => void] {
	let state = initialValue;

	const getState = () => state;
	const setState = (newValue: T) => {
		state = newValue;
	};

	return [getState, setState];
}

/**
 * @intent Provide a reusable, controllable interval mechanism without leaking timer IDs.
 * @decision Store interval ID internally to prevent accidental misuse.
 *
 * @param {() => void} callback - Function to execute on each interval tick.
 * @param {number} delay - Interval delay in milliseconds.
 * @returns {{ start: () => void, stop: () => void }} Control methods to start and stop the timer.
 *
 * @example
 * const timer = useInterval(() => console.log("Tick"), 1000);
 * timer.start();
 * setTimeout(timer.stop, 5000);
 */
export function useInterval(callback: () => void, delay: number) {
	let intervalId: number | null = null;

	const start = () => {
		if (intervalId === null) {
			intervalId = setInterval(callback, delay) as unknown as number;
		}
	};

	const stop = () => {
		if (intervalId !== null) {
			clearInterval(intervalId);
			intervalId = null;
		}
	};

	return { start, stop };
}

/**
 * @intent Wrap Deno's file system watcher in a hook for modular event handling.
 * @decision Keep watcher lifecycle explicit with start/stop methods.
 * @ai Ensure --allow-read is granted before invoking.
 *
 * @param {string} path - Path to the file or directory to watch.
 * @param {(event: Deno.FsEvent) => void} onChange - Callback executed when a change is detected.
 * @returns {{ start: () => Promise<void>, stop: () => void }} Control methods to start and stop watching.
 *
 * @example
 * const watcher = useFileWatcher(".", (event) => console.log("Change:", event));
 * watcher.start();
 */
export function useFileWatcher(
	path: string,
	onChange: (event: Deno.FsEvent) => void,
) {
	let watcher: Deno.FsWatcher | null = null;

	const start = async () => {
		watcher = Deno.watchFs(path);
		for await (const event of watcher) {
			onChange(event);
		}
	};

	const stop = () => {
		watcher?.close();
		watcher = null;
	};

	return { start, stop };
}

/**
 * @intent Attach and detach event listeners in a safe, reusable way.
 * @decision Works with any EventTarget, including globalThis in Deno.
 * @future Could support once-only listeners and passive options.
 *
 * @param {EventTarget} target - The object to listen on.
 * @param {string} type - The event type to listen for.
 * @param {(event: Event) => void} handler - The callback to run when the event fires.
 * @param {boolean | AddEventListenerOptions} [options] - Optional listener options.
 * @returns {() => void} Function to remove the listener.
 *
 * @example
 * const stop = useEventListener(globalThis, "unload", () => console.log("Exiting..."));
 * // Later: stop();
 *
 * // Listen for process unload (works on all OSes)
 * const stopUnload = useEventListener(globalThis, "unload", () => {
 *   console.log("Cleaning up before exit...");
 * });
 *
 * // Listen for unhandled promise rejections
 * const stopRejection = useEventListener(globalThis, "unhandledrejection", (event) => {
 *   console.error("Unhandled rejection:", event.reason);
 * });
 *
 * // Stop listening after 5 seconds
 * setTimeout(() => {
 *   stopUnload();
 *   stopRejection();
 *   console.log("Stopped listeners");
 * }, 5000);
 */
export function useEventListener<
	T extends EventTarget,
	K extends string,
>(
	target: T,
	type: K,
	handler: (event: Event) => void,
	options?: boolean | AddEventListenerOptions,
) {
	target.addEventListener(type, handler as EventListener, options);
	return () =>
		target.removeEventListener(type, handler as EventListener, options);
}

/**
 * @intent Delay execution until a pause in calls, useful for bursty events.
 * @decision Store timeout ID internally to prevent race conditions.
 * @todo Add option for immediate execution on first call.
 *
 * @param {(...args: any[]) => void} callback - Function to debounce.
 * @param {number} delay - Delay in milliseconds.
 * @returns {(...args: any[]) => void} The debounced function.
 *
 * @example
 * const log = useDebounce((msg: string) => console.log(msg), 500);
 * log("Hello");
 * log("World"); // Only "World" will be logged after 500ms
 */
export function useDebounce<T extends (...args: unknown[]) => void>(
	callback: T,
	delay: number,
) {
	let timeoutId: number | null = null;

	return (...args: Parameters<T>) => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
		}
		timeoutId = setTimeout(() => {
			callback(...args);
		}, delay) as unknown as number;
	};
}

/**
 * @intent Limit execution rate to at most once per delay period.
 * @decision Track last execution timestamp to enforce throttling.
 * @future Add trailing call option for missed invocations.
 *
 * @param {(...args: unknown[]) => void} callback - Function to throttle.
 * @param {number} delay - Delay in milliseconds.
 * @returns {(...args: unknown[]) => void} The throttled function.
 *
 * @example
 * const log = useThrottle((msg: string) => console.log(msg), 1000);
 * log("A");
 * log("B"); // "B" will be ignored if within 1 second of "A"
 */
export function useThrottle<T extends (...args: unknown[]) => void>(
	callback: T,
	delay: number,
) {
	let lastCall = 0;

	return (...args: Parameters<T>) => {
		const now = Date.now();
		if (now - lastCall >= delay) {
			lastCall = now;
			callback(...args);
		}
	};
}

/* ---------------------------------
   Example usage (uncomment to test)
---------------------------------- */
// import { useState, useInterval, useFileWatcher, useSignal, useAsync, useDebounce, useThrottle } from "./hooks.ts";

// const [getCount, setCount] = useState(0);
// setCount(getCount() + 1);
// console.log("Count:", getCount());

// const timer = useInterval(() => console.log("Tick"), 1000);
// timer.start();
// setTimeout(timer.stop, 3000);

// const watcher = useFileWatcher(".", (event) => console.log("File change:", event));
// watcher.start();

// const sig = useSignal("SIGINT", () => { console.log("Caught SIGINT"); Deno.exit(); });
// sig.start();

// const fetchData = useAsync(async () => {
//     await new Promise((res) => setTimeout(res, 1000));
//     return "Data loaded";
// });
// fetchData.run().then(() => console.log(fetchData.getState()));

// const debouncedLog = useDebounce((msg: string) => console.log("Debounced:", msg), 500);
// debouncedLog("Hello");
// debouncedLog("World");

// const throttledLog = useThrottle((msg: string) => console.log("Throttled:", msg), 1000);
// throttledLog("A");
// throttledLog("B");
