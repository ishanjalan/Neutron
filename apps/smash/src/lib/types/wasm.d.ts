/**
 * Type definitions for WASM modules used in Smash
 */

// Ghostscript WASM types
export interface GhostscriptModule {
	FS: {
		writeFile: (path: string, data: Uint8Array) => void;
		readFile: (path: string, opts?: { encoding: string }) => Uint8Array;
		unlink: (path: string) => void;
	};
	callMain: (args: string[]) => number;
	setStatus?: (text: string) => void;
}

export type GhostscriptPreset = 'screen' | 'ebook' | 'printer' | 'prepress';

export interface GhostscriptOptions {
	preset: GhostscriptPreset;
	customDpi?: number;
}

// PDFium types
export interface PDFiumPage {
	number: number;
	width: number;
	height: number;
	render: (options: PDFiumRenderOptions) => Promise<PDFiumRenderResult>;
	destroy: () => void;
}

export interface PDFiumRenderOptions {
	scale?: number;
	render?: (options: { data: Uint8Array; width: number; height: number }) => Promise<Buffer | Uint8Array>;
}

export interface PDFiumRenderResult {
	data: Uint8Array | Buffer;
	width: number;
	height: number;
}

export interface PDFiumDocument {
	pages: () => Generator<PDFiumPage>;
	getPageCount: () => number;
	destroy: () => void;
}

export interface PDFiumLibrary {
	loadDocument: (data: Uint8Array | ArrayBuffer) => Promise<PDFiumDocument>;
	destroy: () => void;
}

// QPDF types
export interface QPDFModule {
	FS: {
		writeFile: (path: string, data: Uint8Array) => void;
		readFile: (path: string, opts?: { encoding: string }) => Uint8Array;
		mkdir: (path: string) => void;
		unlink: (path: string) => void;
	};
	callMain: (args: string[]) => number;
}

// Worker message types
export interface WorkerMessage<T = unknown> {
	type: string;
	id: string;
	payload: T;
}

export interface WorkerResponse<T = unknown> {
	type: string;
	id: string;
	success: boolean;
	result?: T;
	error?: string;
	progress?: number;
}

// Compression result
export interface CompressionResult {
	data: Uint8Array;
	originalSize: number;
	compressedSize: number;
	preset: GhostscriptPreset;
}

// Render result
export interface RenderResult {
	data: Uint8Array;
	width: number;
	height: number;
	pageNumber: number;
	format: 'png' | 'jpeg';
}

// QPDF operation types
export type QPDFOperation = 
	| { type: 'encrypt'; userPassword: string; ownerPassword: string; keyLength: 128 | 256 }
	| { type: 'decrypt'; password: string }
	| { type: 'linearize' }
	| { type: 'optimize' };
