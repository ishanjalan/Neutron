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

/**
 * Create a Ghostscript client that manages the worker lifecycle
 *
 * @param basePath - Base path for loading the WASM file (e.g., '/Smash')
 */
export function createGhostscriptClient(basePath: string): GhostscriptClient {
	// Create the worker
	const worker = new Worker(new URL('../workers/ghostscript.comlink.ts', import.meta.url), {
		type: 'module',
	});

	// Wrap with Comlink
	const api = wrap<GhostscriptWorkerAPI>(worker);

	// Initialize the worker
	let initPromise: Promise<boolean> | null = null;

	async function ensureInitialized(): Promise<void> {
		if (!initPromise) {
			initPromise = api.init(basePath);
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

			// Wrap the progress callback with Comlink's proxy
			const progressProxy = onProgress ? proxy(onProgress) : undefined;

			return api.compress(pdfData, preset, progressProxy);
		},

		async isReady(): Promise<boolean> {
			try {
				await ensureInitialized();
				return api.isReady();
			} catch {
				return false;
			}
		},

		terminate(): void {
			worker.terminate();
		},
	};
}

/**
 * Singleton client for simple usage
 * Lazily initialized on first use
 */
let defaultClient: GhostscriptClient | null = null;

export function getGhostscriptClient(basePath: string): GhostscriptClient {
	if (!defaultClient) {
		defaultClient = createGhostscriptClient(basePath);
	}
	return defaultClient;
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
		legacyClient = createGhostscriptClient(basePath || '/Smash');
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
