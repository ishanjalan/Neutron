/**
 * Ghostscript WASM Worker (Comlink version)
 *
 * Type-safe, cleaner API using Comlink.
 * This is an example of how to modernize the existing worker.
 *
 * @example Usage:
 * ```ts
 * import { createWorker, createCallback } from '@neutron/utils/comlink';
 * import type { GhostscriptWorkerAPI } from './ghostscript.comlink';
 *
 * const worker = createWorker<GhostscriptWorkerAPI>(
 *   new Worker(new URL('./ghostscript.comlink.ts', import.meta.url), { type: 'module' })
 * );
 *
 * // Initialize with base path
 * await worker.init('/Smash');
 *
 * // Compress with progress callback
 * const result = await worker.compress(pdfData, 'ebook', createCallback((progress) => {
 *   console.log(`Progress: ${progress}%`);
 * }));
 *
 * console.log(`Compressed: ${result.originalSize} -> ${result.compressedSize}`);
 * ```
 */

import { expose, transfer } from 'comlink';
import createModule from 'ghostscript-wasm-esm';

export type CompressionPreset = 'screen' | 'ebook' | 'printer' | 'prepress';

export interface CompressionResult {
	success: boolean;
	data?: ArrayBuffer;
	originalSize: number;
	compressedSize: number;
	error?: string;
}

// Module state
let Module: any = null;
let initialized = false;
let basePath = '';

/**
 * The worker API - exposed via Comlink
 */
const api = {
	/**
	 * Initialize Ghostscript WASM
	 */
	async init(base: string): Promise<boolean> {
		if (initialized) return true;
		basePath = base;

		try {
			Module = await createModule({
				locateFile: (path: string) => {
					if (path.endsWith('.wasm')) {
						return `${basePath}/gs.wasm`;
					}
					return path;
				},
				noInitialRun: true,
				print: (text: string) => console.log('[GS]', text),
				printErr: (text: string) => console.error('[GS Error]', text),
			});

			initialized = true;
			return true;
		} catch (error) {
			console.error('Failed to initialize Ghostscript:', error);
			return false;
		}
	},

	/**
	 * Check if initialized
	 */
	isReady(): boolean {
		return initialized;
	},

	/**
	 * Compress a PDF file
	 * @param pdfData - The PDF file as ArrayBuffer
	 * @param preset - Compression preset
	 * @param onProgress - Optional progress callback (0-100)
	 */
	async compress(
		pdfData: ArrayBuffer,
		preset: CompressionPreset,
		onProgress?: (progress: number) => void
	): Promise<CompressionResult> {
		if (!initialized || !Module) {
			return {
				success: false,
				originalSize: pdfData.byteLength,
				compressedSize: 0,
				error: 'Ghostscript not initialized. Call init() first.',
			};
		}

		try {
			const FS = Module.FS;

			// Report progress
			onProgress?.(10);

			// Write input file to virtual filesystem
			const inputData = new Uint8Array(pdfData);
			FS.writeFile('/input.pdf', inputData);

			onProgress?.(20);

			// Ghostscript arguments for PDF compression
			const args = [
				'-sDEVICE=pdfwrite',
				'-dCompatibilityLevel=1.4',
				`-dPDFSETTINGS=/${preset}`,
				'-dNOPAUSE',
				'-dQUIET',
				'-dBATCH',
				'-dSAFER',
				'-dAutoRotatePages=/None',
				'-dColorImageDownsampleType=/Bicubic',
				'-dGrayImageDownsampleType=/Bicubic',
				'-dMonoImageDownsampleType=/Bicubic',
				'-sOutputFile=/output.pdf',
				'/input.pdf',
			];

			onProgress?.(30);

			// Run Ghostscript
			Module.callMain(args);

			onProgress?.(80);

			// Read output file
			const outputData = FS.readFile('/output.pdf') as Uint8Array;

			// Clean up virtual filesystem
			try {
				FS.unlink('/input.pdf');
				FS.unlink('/output.pdf');
			} catch {
				// Ignore cleanup errors
			}

			onProgress?.(100);

			// Transfer the buffer for zero-copy performance
			return transfer(
				{
					success: true,
					data: outputData.buffer,
					originalSize: pdfData.byteLength,
					compressedSize: outputData.byteLength,
				},
				[outputData.buffer]
			);
		} catch (error) {
			return {
				success: false,
				originalSize: pdfData.byteLength,
				compressedSize: 0,
				error: error instanceof Error ? error.message : 'Compression failed',
			};
		}
	},
};

// Export the API type for consumer type safety
export type GhostscriptWorkerAPI = typeof api;

// Expose the API via Comlink
expose(api);
