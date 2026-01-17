/**
 * Ghostscript WASM Wrapper
 * 
 * Provides a high-level API for PDF compression using Ghostscript WASM.
 * Lazy loads the worker and WASM module on first use.
 */

import { base } from '$app/paths';

let worker: Worker | null = null;
let initialized = false;
let initPromise: Promise<void> | null = null;
let initializingState = false;
let pendingRequests = new Map<string, {
	resolve: (result: { result: ArrayBuffer; originalSize: number; compressedSize: number }) => void;
	reject: (error: Error) => void;
	onProgress?: (progress: number) => void;
}>();

// Callbacks for initialization state
let onInitStartCallbacks: (() => void)[] = [];
let onInitCompleteCallbacks: (() => void)[] = [];

export type CompressionPreset = 'screen' | 'ebook' | 'printer' | 'prepress';

/**
 * Register a callback for when WASM initialization starts
 */
export function onInitStart(callback: () => void): () => void {
	onInitStartCallbacks.push(callback);
	return () => {
		onInitStartCallbacks = onInitStartCallbacks.filter(cb => cb !== callback);
	};
}

/**
 * Register a callback for when WASM initialization completes
 */
export function onInitComplete(callback: () => void): () => void {
	onInitCompleteCallbacks.push(callback);
	return () => {
		onInitCompleteCallbacks = onInitCompleteCallbacks.filter(cb => cb !== callback);
	};
}

/**
 * Check if WASM is currently being initialized
 */
export function isWasmInitializing(): boolean {
	return initializingState;
}

/**
 * Initialize the Ghostscript worker
 */
export async function initGhostscript(): Promise<void> {
	if (initialized) return;
	if (initPromise) return initPromise;

	// Notify callbacks that initialization is starting
	initializingState = true;
	onInitStartCallbacks.forEach(cb => cb());

	initPromise = new Promise((resolve, reject) => {
		try {
			worker = new Worker(
				new URL('../workers/ghostscript.worker.ts', import.meta.url),
				{ type: 'module' }
			);

			const timeoutId = setTimeout(() => {
				initializingState = false;
				reject(new Error('Ghostscript WASM initialization timeout (30s)'));
			}, 30000);

			worker.onmessage = (event) => {
				const data = event.data;

				if (data.type === 'ready') {
					clearTimeout(timeoutId);
					initialized = true;
					initializingState = false;
					onInitCompleteCallbacks.forEach(cb => cb());
					resolve();
					return;
				}

				if (data.type === 'error' && data.id === 'init') {
					clearTimeout(timeoutId);
					initializingState = false;
					reject(new Error(data.error || 'Failed to initialize Ghostscript'));
					return;
				}

				// Handle compression responses
				const request = pendingRequests.get(data.id);
				if (!request) return;

				if (data.type === 'progress') {
					request.onProgress?.(data.progress);
					return;
				}

				if (data.type === 'result') {
					pendingRequests.delete(data.id);
					if (data.success) {
						request.resolve({
							result: data.result,
							originalSize: data.originalSize,
							compressedSize: data.compressedSize
						});
					} else {
						request.reject(new Error(data.error || 'Compression failed'));
					}
				}
			};

			worker.onerror = (error) => {
				clearTimeout(timeoutId);
				initializingState = false;
				reject(new Error(`Worker error: ${error.message}`));
			};

			// Send init message with base path for WASM file location
			worker.postMessage({ type: 'init', basePath: base });
		} catch (error) {
			initializingState = false;
			reject(error);
		}
	});

	return initPromise;
}

/**
 * Compress a PDF using Ghostscript WASM
 */
export async function compressPDF(
	pdfData: ArrayBuffer,
	preset: CompressionPreset = 'ebook',
	onProgress?: (progress: number) => void
): Promise<{ result: ArrayBuffer; originalSize: number; compressedSize: number }> {
	await initGhostscript();

	if (!worker) {
		throw new Error('Ghostscript worker not initialized');
	}

	return new Promise((resolve, reject) => {
		const id = crypto.randomUUID();

		pendingRequests.set(id, { resolve, reject, onProgress });

		// Clone the buffer to avoid detached buffer issues
		const dataClone = pdfData.slice(0);
		
		worker!.postMessage(
			{ id, pdfData: dataClone, preset },
			[dataClone]
		);
	});
}

/**
 * Check if Ghostscript WASM is ready
 */
export function isGhostscriptReady(): boolean {
	return initialized;
}

/**
 * Terminate the Ghostscript worker
 */
export function terminateGhostscript(): void {
	if (worker) {
		worker.terminate();
		worker = null;
		initialized = false;
		initPromise = null;
		pendingRequests.clear();
	}
}
