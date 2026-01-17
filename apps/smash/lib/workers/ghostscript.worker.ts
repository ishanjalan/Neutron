/**
 * Ghostscript WASM Worker
 * 
 * Runs PDF compression in a Web Worker to avoid blocking the UI.
 * Uses ghostscript-wasm-esm package compiled to WebAssembly.
 */

import createModule from 'ghostscript-wasm-esm';

interface CompressRequest {
	id: string;
	pdfData: ArrayBuffer;
	preset: 'screen' | 'ebook' | 'printer' | 'prepress';
}

interface InitRequest {
	type: 'init';
	basePath: string;
}

interface CompressResponse {
	id: string;
	type: 'result' | 'progress' | 'ready' | 'error';
	success?: boolean;
	result?: ArrayBuffer;
	error?: string;
	originalSize?: number;
	compressedSize?: number;
	progress?: number;
}

let Module: any = null;
let initialized = false;
let basePath = '';

async function initGhostscript(base: string): Promise<void> {
	if (initialized) return;
	basePath = base;

	try {
		// Initialize the Emscripten module
		Module = await createModule({
			// Locate the WASM file from static directory, accounting for base path
			locateFile: (path: string) => {
				if (path.endsWith('.wasm')) {
					return `${basePath}/gs.wasm`;
				}
				return path;
			},
			noInitialRun: true,
			print: (text: string) => console.log('[GS]', text),
			printErr: (text: string) => console.error('[GS Error]', text)
		});

		initialized = true;

		// Notify main thread that worker is ready
		const response: CompressResponse = { id: 'init', type: 'ready' };
		self.postMessage(response);
	} catch (error) {
		const response: CompressResponse = {
			id: 'init',
			type: 'error',
			error: error instanceof Error ? error.message : 'Failed to initialize Ghostscript'
		};
		self.postMessage(response);
		throw error;
	}
}

async function compressPDF(request: CompressRequest): Promise<void> {
	const { id, pdfData, preset } = request;

	try {
		if (!initialized || !Module) {
			throw new Error('Ghostscript not initialized. Call init first.');
		}

		const FS = Module.FS;

		// Report progress
		const reportProgress = (progress: number) => {
			const response: CompressResponse = { id, type: 'progress', progress };
			self.postMessage(response);
		};

		reportProgress(10);

		// Write input file to virtual filesystem
		const inputData = new Uint8Array(pdfData);
		FS.writeFile('/input.pdf', inputData);

		reportProgress(20);

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
			'/input.pdf'
		];

		reportProgress(30);

		// Run Ghostscript
		Module.callMain(args);

		reportProgress(80);

		// Read output file
		const outputData = FS.readFile('/output.pdf');

		// Clean up virtual filesystem
		try {
			FS.unlink('/input.pdf');
			FS.unlink('/output.pdf');
		} catch {
			// Ignore cleanup errors
		}

		reportProgress(100);

		// Send result back to main thread
		const response: CompressResponse = {
			id,
			type: 'result',
			success: true,
			result: outputData.buffer,
			originalSize: pdfData.byteLength,
			compressedSize: outputData.byteLength
		};

		// Transfer the buffer for better performance
		self.postMessage(response, [outputData.buffer]);
	} catch (error) {
		const response: CompressResponse = {
			id,
			type: 'result',
			success: false,
			error: error instanceof Error ? error.message : 'Compression failed',
			originalSize: pdfData.byteLength,
			compressedSize: 0
		};
		self.postMessage(response);
	}
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<CompressRequest | InitRequest>) => {
	if ('type' in event.data && event.data.type === 'init') {
		const initReq = event.data as InitRequest;
		await initGhostscript(initReq.basePath);
		return;
	}

	await compressPDF(event.data as CompressRequest);
};
