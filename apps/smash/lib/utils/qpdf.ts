/**
 * qpdf WASM Wrapper
 * 
 * Provides PDF encryption and decryption using qpdf compiled to WASM.
 * Supports AES-256 encryption for strong security.
 */

import createModule from '@neslinesli93/qpdf-wasm';
import { base } from '$app/paths';

let qpdfModule: any = null;
let initPromise: Promise<any> | null = null;

/**
 * Initialize the qpdf WASM module
 */
async function init(): Promise<any> {
	if (qpdfModule) return qpdfModule;
	if (initPromise) return initPromise;

	initPromise = createModule({
		// Locate the WASM file from static directory, accounting for base path
		locateFile: (path: string) => {
			if (path.endsWith('.wasm')) {
				return `${base}/qpdf.wasm`;
			}
			return path;
		},
		noInitialRun: true,
		print: (text: string) => console.log('[qpdf]', text),
		printErr: (text: string) => console.error('[qpdf Error]', text)
	});

	qpdfModule = await initPromise;
	return qpdfModule;
}

/**
 * Encrypt a PDF with password protection (AES-256)
 */
export async function encryptPDF(
	pdfData: ArrayBuffer,
	userPassword: string,
	ownerPassword?: string,
	onProgress?: (progress: number) => void
): Promise<ArrayBuffer> {
	const qpdf = await init();
	onProgress?.(10);

	const FS = qpdf.FS;
	const inputPath = '/input.pdf';
	const outputPath = '/output.pdf';

	try {
		// Write input file to virtual filesystem
		FS.writeFile(inputPath, new Uint8Array(pdfData));
		onProgress?.(20);

		// qpdf arguments for AES-256 encryption
		const args = [
			inputPath,
			'--encrypt',
			userPassword,
			ownerPassword || userPassword,
			'256', // AES-256 encryption
			'--',
			outputPath
		];

		onProgress?.(40);

		// Run qpdf
		qpdf.callMain(args);

		onProgress?.(80);

		// Read output file
		const outputData = FS.readFile(outputPath);

		// Clean up
		try {
			FS.unlink(inputPath);
			FS.unlink(outputPath);
		} catch {
			// Ignore cleanup errors
		}

		onProgress?.(100);

		return outputData.buffer;
	} catch (error) {
		// Clean up on error
		try {
			FS.unlink(inputPath);
			FS.unlink(outputPath);
		} catch {
			// Ignore
		}
		throw error;
	}
}

/**
 * Decrypt a password-protected PDF
 */
export async function decryptPDF(
	pdfData: ArrayBuffer,
	password: string,
	onProgress?: (progress: number) => void
): Promise<ArrayBuffer> {
	const qpdf = await init();
	onProgress?.(10);

	const FS = qpdf.FS;
	const inputPath = '/input.pdf';
	const outputPath = '/output.pdf';

	try {
		// Write input file to virtual filesystem
		FS.writeFile(inputPath, new Uint8Array(pdfData));
		onProgress?.(20);

		// qpdf arguments for decryption
		const args = [
			'--password=' + password,
			'--decrypt',
			inputPath,
			outputPath
		];

		onProgress?.(40);

		// Run qpdf
		qpdf.callMain(args);

		onProgress?.(80);

		// Read output file
		const outputData = FS.readFile(outputPath);

		// Clean up
		try {
			FS.unlink(inputPath);
			FS.unlink(outputPath);
		} catch {
			// Ignore cleanup errors
		}

		onProgress?.(100);

		return outputData.buffer;
	} catch (error) {
		// Clean up on error
		try {
			FS.unlink(inputPath);
			FS.unlink(outputPath);
		} catch {
			// Ignore
		}
		throw error;
	}
}

/**
 * Check if qpdf WASM is initialized
 */
export function isQpdfReady(): boolean {
	return qpdfModule !== null;
}
