/**
 * @module utils/hooks
 * @description Framework‑agnostic hooks for state, intervals, file watching, events, and timing utilities.
 * @intent Provide reusable patterns for procedural Deno scripts without introducing global state or boilerplate.
 */

/**
 * @description Creates a simple state container with getter and setter functions.
 * @example
 * const [getCount, setCount] = useState(0);
 * setCount(getCount() + 1);
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
 * @description Provides a controllable interval with start and stop methods.
 * @example
 * const timer = useInterval(() => console.log("Tick"), 1000);
 * timer.start();
 */
export function useInterval(
	callback: () => void,
	delay: number,
): { start: () => void; stop: () => void } {
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
 * @description Watches a file or directory and invokes a callback on changes.
 * @example
 * const watcher = useFileWatcher(".", (event) => console.log("Change:", event));
 * watcher.start();
 */
export function useFileWatcher(
	path: string,
	onChange: (event: Deno.FsEvent) => void,
): { start: () => void; stop: () => void } {
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
 * @description Attaches an event listener and returns a function to remove it.
 * @example
 * const stop = useEventListener(globalThis, "unload", () => console.log("Exiting..."));
 * stop();
 */
export function useEventListener<
	T extends EventTarget,
	K extends string,
>(
	target: T,
	type: K,
	handler: (event: Event) => void,
	options?: boolean | AddEventListenerOptions,
): () => void {
	target.addEventListener(type, handler as EventListener, options);
	return () =>
		target.removeEventListener(type, handler as EventListener, options);
}

/**
 * @description Creates a debounced function that delays execution until calls stop.
 * @example
 * const log = useDebounce((msg: string) => console.log(msg), 500);
 * log("Hello");
 * log("World");
 */
export function useDebounce<T extends (...args: unknown[]) => void>(
	callback: T,
	delay: number,
): () => void {
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
 * @description Creates a throttled function that runs at most once per delay period.
 * @example
 * const log = useThrottle((msg: string) => console.log(msg), 1000);
 * log("A");
 * log("B");
 */
export function useThrottle<T extends (...args: unknown[]) => void>(
	callback: T,
	delay: number,
): () => void {
	let lastCall = 0;

	return (...args: Parameters<T>) => {
		const now = Date.now();
		if (now - lastCall >= delay) {
			lastCall = now;
			callback(...args);
		}
	};
}
