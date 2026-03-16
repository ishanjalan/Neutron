/**
 * Ghostscript client - type-safe wrapper for the Comlink worker
 *
 * @example
 * ```ts
 * import { createGhostscriptClient } from '$lib/utils/ghostscript';
 *
 * const gs = createGhostscriptClient('/Smash');
 *
 * const result = await gs.compress(pdfData, 'ebook', (progress) => {
 *   console.log(`Progress: ${progress}%`);
 * });
 *
 * if (result.success) {
 *   // result.data contains the compressed PDF
 * }
 *
 * // When done, terminate the worker
 * gs.terminate();
 * ```
 */

import { wrap, proxy, type Remote } from 'comlink';
import type {
	GhostscriptWorkerAPI,
	CompressionPreset,
	CompressionResult,
} from '../workers/ghostscript.comlink';

export type { CompressionPreset, CompressionResult };

export interface GhostscriptClient {
	/**
	 * Compress a PDF file
	 */
	compress(
		pdfData: ArrayBuffer,
		preset: CompressionPreset,
		onProgress?: (progress: number) => void
	): Promise<CompressionResult>;

	/**
	 * Check if the worker is ready
	 */
	isReady(): Promise<boolean>;

	/**
	 * Terminate the worker
	 */
	terminate(): void;
}

const WORKER_CALL_TIMEOUT_MS = 120_000; // 2 minutes max for a single Ghostscript call

/** Race a promise against a timeout, rejecting if the timeout fires first */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
	let timeoutId: ReturnType<typeof setTimeout>;
	const timeout = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
	});
	return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

/**
 * Create a Ghostscript client that manages the worker lifecycle
 *
 * @param basePath - Base path for loading the WASM file (e.g., '/Smash')
 * @param onError  - Called when the worker crashes unexpectedly
 */
export function createGhostscriptClient(
	basePath: string,
	onError?: (error: Error) => void
): GhostscriptClient {
	const worker = new Worker(new URL('../workers/ghostscript.comlink.ts', import.meta.url), {
		type: 'module',
	});

	const api = wrap<GhostscriptWorkerAPI>(worker);

	let initPromise: Promise<boolean> | null = null;
	let workerHealthy = true;
	let workerError: Error | null = null;

	worker.onerror = (event) => {
		workerHealthy = false;
		workerError = new Error(event.message ?? 'Ghostscript worker crashed');
		// Reset init so future callers fail fast rather than hanging
		initPromise = null;
		onError?.(workerError);
	};

	async function ensureInitialized(): Promise<void> {
		if (!workerHealthy) {
			throw workerError ?? new Error('Ghostscript worker is not healthy');
		}
		if (!initPromise) {
			initPromise = withTimeout(api.init(basePath), WORKER_CALL_TIMEOUT_MS, 'Ghostscript init');
		}
		const ready = await initPromise;
		if (!ready) {
			throw new Error('Failed to initialize Ghostscript worker');
		}
	}

	return {
		async compress(
			pdfData: ArrayBuffer,
			preset: CompressionPreset,
			onProgress?: (progress: number) => void
		): Promise<CompressionResult> {
			await ensureInitialized();

			const progressProxy = onProgress ? proxy(onProgress) : undefined;

			return withTimeout(
				api.compress(pdfData, preset, progressProxy),
				WORKER_CALL_TIMEOUT_MS,
				'Ghostscript compress'
			);
		},

		async isReady(): Promise<boolean> {
			if (!workerHealthy) return false;
			try {
				await ensureInitialized();
				return api.isReady();
			} catch {
				return false;
			}
		},

		terminate(): void {
			workerHealthy = false;
			worker.terminate();
		},
	};
}

/**
 * Singleton client for simple usage
 * Lazily initialized on first use
 */
let defaultClient: GhostscriptClient | null = null;

let defaultClientErrorHandler: ((error: Error) => void) | undefined;

export function setGhostscriptErrorHandler(handler: (error: Error) => void): void {
	defaultClientErrorHandler = handler;
}

export function getGhostscriptClient(basePath: string): GhostscriptClient {
	if (!defaultClient) {
		defaultClient = createGhostscriptClient(basePath, (error) => {
			defaultClient = null; // allow re-creation next time
			defaultClientErrorHandler?.(error);
		});
	}
	return defaultClient;
}

export function terminateGhostscript(): void {
	if (defaultClient) {
		defaultClient.terminate();
		defaultClient = null;
	}
	if (legacyClient) {
		legacyClient.terminate();
		legacyClient = null;
		isInitialized = false;
		isInitializing = false;
	}
}

// ============================================
// Backward-compatible API (used by pdf.ts)
// ============================================

let legacyClient: GhostscriptClient | null = null;
let isInitializing = false;
let isInitialized = false;
let initCallbacks: Array<() => void> = [];

/**
 * Initialize Ghostscript (for backward compatibility)
 */
export async function initGhostscript(basePath: string = ''): Promise<void> {
	if (isInitialized) return;
	if (isInitializing) {
		return new Promise((resolve) => {
			initCallbacks.push(resolve);
		});
	}

	isInitializing = true;

	try {
		legacyClient = createGhostscriptClient(basePath || '/Smash', (error) => {
			legacyClient = null;
			isInitialized = false;
			defaultClientErrorHandler?.(error);
		});
		await legacyClient.isReady();
		isInitialized = true;
		initCallbacks.forEach((cb) => cb());
		initCallbacks = [];
	} finally {
		isInitializing = false;
	}
}

/**
 * Check if Ghostscript is ready
 */
export function isGhostscriptReady(): boolean {
	return isInitialized;
}

/**
 * Register callback for when initialization starts
 */
export function onInitStart(callback: () => void): void {
	// For UI feedback - called when init begins
	if (isInitializing) callback();
}

/**
 * Register callback for when initialization completes
 */
export function onInitComplete(callback: () => void): void {
	if (isInitialized) {
		callback();
	} else {
		initCallbacks.push(callback);
	}
}

/**
 * Compress PDF using Ghostscript (backward-compatible API)
 */
export async function compressPDF(
	pdfData: ArrayBuffer,
	preset: CompressionPreset,
	onProgress?: (progress: number) => void
): Promise<{ result: ArrayBuffer; originalSize: number; compressedSize: number }> {
	// Auto-initialize if needed
	if (!legacyClient) {
		await initGhostscript();
	}

	if (!legacyClient) {
		throw new Error('Failed to initialize Ghostscript');
	}

	const result = await legacyClient.compress(pdfData, preset, onProgress);

	if (!result.success || !result.data) {
		throw new Error(result.error || 'Compression failed');
	}

	return {
		result: result.data,
		originalSize: result.originalSize,
		compressedSize: result.compressedSize,
	};
}
