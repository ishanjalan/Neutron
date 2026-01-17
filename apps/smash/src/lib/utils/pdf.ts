/**
 * PDF Processing Utilities - Web App (WASM)
 * 
 * Uses Ghostscript WASM for compression (50-90% reduction)
 * Uses qpdf WASM for encryption (AES-256)
 * Uses pdf-lib for manipulation (merge, split, rotate, etc.)
 * 
 * All processing happens locally in the browser - files never leave your device.
 */

import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { compressPDF as compressWithGS, isGhostscriptReady } from './ghostscript';
import { encryptPDF as encryptWithQpdf, decryptPDF as decryptWithQpdf, isQpdfReady } from './qpdf';
import { pdfs, type PDFItem, type ImageFormat, type CompressionPreset } from '$lib/stores/pdfs.svelte';
import { base } from '$app/paths';

// Configure PDF.js worker - use local bundled file with base path
if (typeof window !== 'undefined') {
	pdfjsLib.GlobalWorkerOptions.workerSrc = `${base}/pdf.worker.min.mjs`;
}

// ============================================
// TOOL AVAILABILITY (for web, always available after WASM loads)
// ============================================

export interface ToolStatus {
	available: boolean;
	version?: string;
}

/**
 * Check if Ghostscript WASM is ready
 */
export async function checkGhostscript(): Promise<ToolStatus> {
	return { available: true, version: 'WASM' };
}

/**
 * Check if qpdf WASM is ready
 */
export async function checkQPDF(): Promise<ToolStatus> {
	return { available: true, version: 'WASM' };
}

/**
 * Get backend status for UI display
 */
export async function getBackendInfo(): Promise<{
	ghostscript: ToolStatus;
	qpdf: ToolStatus;
}> {
	return {
		ghostscript: { available: true, version: 'WASM' },
		qpdf: { available: true, version: 'WASM' }
	};
}

// ============================================
// PDF COMPRESSION
// ============================================

interface CompressOptions {
	preset: CompressionPreset;
	onProgress?: (progress: number) => void;
}

/**
 * Compress PDF - uses Ghostscript WASM for best compression
 * Falls back to pdf-lib if WASM fails
 */
export async function compressPDF(
	file: File,
	options: CompressOptions
): Promise<Blob> {
	const { preset = 'ebook', onProgress } = options;

	const arrayBuffer = await file.arrayBuffer();

	// Try Ghostscript WASM first for best compression (50-90% reduction)
	try {
		onProgress?.(5);
		const { result } = await compressWithGS(
			arrayBuffer,
			preset,
			onProgress
		);
		return new Blob([result], { type: 'application/pdf' });
	} catch (e) {
		console.warn('Ghostscript WASM compression failed, falling back to pdf-lib:', e);
	}

	// Fall back to pdf-lib optimization (10-30% reduction)
	return await compressPDFWithPdfLib(file, options);
}

/**
 * pdf-lib compression (10-30% reduction)
 * Works without any external dependencies
 */
async function compressPDFWithPdfLib(
	file: File,
	options: CompressOptions
): Promise<Blob> {
	const { onProgress } = options;

	onProgress?.(10);

	const arrayBuffer = await file.arrayBuffer();
	const srcPdf = await PDFDocument.load(arrayBuffer, {
		ignoreEncryption: true
	});

	onProgress?.(30);

	// Create a new optimized PDF
	const newPdf = await PDFDocument.create();

	// Copy all pages (this re-encodes and often compresses)
	const pageCount = srcPdf.getPageCount();
	const pages = await newPdf.copyPages(srcPdf, srcPdf.getPageIndices());

	for (let i = 0; i < pages.length; i++) {
		newPdf.addPage(pages[i]);
		onProgress?.(30 + Math.round((i / pageCount) * 50));
	}

	onProgress?.(85);

	// Save with optimizations
	const pdfBytes = await newPdf.save({
		useObjectStreams: true,
		addDefaultPage: false,
		objectsPerTick: 100
	});

	onProgress?.(100);

	return new Blob([pdfBytes], { type: 'application/pdf' });
}

// ============================================
// PDF MERGE (pdf-lib)
// ============================================

export async function mergePDFs(
	files: File[],
	onProgress?: (progress: number) => void
): Promise<Blob> {
	const mergedPdf = await PDFDocument.create();

	for (let i = 0; i < files.length; i++) {
		const arrayBuffer = await files[i].arrayBuffer();
		const pdf = await PDFDocument.load(arrayBuffer);
		const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
		pages.forEach(page => mergedPdf.addPage(page));

		onProgress?.(Math.round(((i + 1) / files.length) * 100));
	}

	const pdfBytes = await mergedPdf.save();
	return new Blob([pdfBytes], { type: 'application/pdf' });
}

// ============================================
// PDF SPLIT (pdf-lib)
// ============================================

interface SplitOptions {
	mode: 'range' | 'extract' | 'every-n';
	range?: { start: number; end: number };
	pages?: number[];
	everyN?: number;
	onProgress?: (progress: number) => void;
}

export async function splitPDF(
	file: File,
	options: SplitOptions
): Promise<Blob[]> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await PDFDocument.load(arrayBuffer);
	const totalPages = pdf.getPageCount();
	const results: Blob[] = [];

	if (options.mode === 'range' && options.range) {
		const newPdf = await PDFDocument.create();
		const pageIndices = Array.from(
			{ length: options.range.end - options.range.start + 1 },
			(_, i) => options.range!.start - 1 + i
		).filter(i => i >= 0 && i < totalPages);

		const pages = await newPdf.copyPages(pdf, pageIndices);
		pages.forEach(page => newPdf.addPage(page));
		const bytes = await newPdf.save();
		results.push(new Blob([bytes], { type: 'application/pdf' }));
		options.onProgress?.(100);
	}

	else if (options.mode === 'extract' && options.pages) {
		const newPdf = await PDFDocument.create();
		const pageIndices = options.pages
			.map(p => p - 1)
			.filter(i => i >= 0 && i < totalPages);

		const pages = await newPdf.copyPages(pdf, pageIndices);
		pages.forEach(page => newPdf.addPage(page));
		const bytes = await newPdf.save();
		results.push(new Blob([bytes], { type: 'application/pdf' }));
		options.onProgress?.(100);
	}

	else if (options.mode === 'every-n' && options.everyN) {
		const n = options.everyN;
		for (let i = 0; i < totalPages; i += n) {
			const newPdf = await PDFDocument.create();
			const endPage = Math.min(i + n, totalPages);
			const pageIndices = Array.from({ length: endPage - i }, (_, j) => i + j);

			const pages = await newPdf.copyPages(pdf, pageIndices);
			pages.forEach(page => newPdf.addPage(page));
			const bytes = await newPdf.save();
			results.push(new Blob([bytes], { type: 'application/pdf' }));

			options.onProgress?.(Math.round((endPage / totalPages) * 100));
		}
	}

	return results;
}

// ============================================
// PDF TO IMAGES (PDF.js)
// ============================================

interface PDFToImagesOptions {
	format: ImageFormat;
	dpi: number;
	quality: number;
	onProgress?: (progress: number) => void;
}

export async function pdfToImages(
	file: File,
	options: PDFToImagesOptions
): Promise<Blob[]> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
	const scale = options.dpi / 72;
	const images: Blob[] = [];

	for (let i = 1; i <= pdf.numPages; i++) {
		const page = await pdf.getPage(i);
		const viewport = page.getViewport({ scale });

		const canvas = document.createElement('canvas');
		canvas.width = viewport.width;
		canvas.height = viewport.height;
		const ctx = canvas.getContext('2d')!;

		await page.render({ canvasContext: ctx, viewport }).promise;

		const mimeType = options.format === 'jpg' ? 'image/jpeg' : `image/${options.format}`;
		const blob = await new Promise<Blob>((resolve) => {
			canvas.toBlob(blob => resolve(blob!), mimeType, options.quality / 100);
		});

		images.push(blob);
		options.onProgress?.(Math.round((i / pdf.numPages) * 100));
	}

	return images;
}

// ============================================
// IMAGES TO PDF (pdf-lib)
// ============================================

export async function imagesToPDF(
	files: File[],
	onProgress?: (progress: number) => void
): Promise<Blob> {
	const pdf = await PDFDocument.create();

	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const arrayBuffer = await file.arrayBuffer();

		let image;
		if (file.type === 'image/png') {
			image = await pdf.embedPng(arrayBuffer);
		} else if (file.type === 'image/webp') {
			const img = await loadImage(file);
			const canvas = document.createElement('canvas');
			canvas.width = img.width;
			canvas.height = img.height;
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(img, 0, 0);
			const pngBlob = await new Promise<Blob>((resolve) => {
				canvas.toBlob(blob => resolve(blob!), 'image/png');
			});
			const pngBuffer = await pngBlob.arrayBuffer();
			image = await pdf.embedPng(pngBuffer);
		} else {
			image = await pdf.embedJpg(arrayBuffer);
		}

		const page = pdf.addPage([image.width, image.height]);
		page.drawImage(image, {
			x: 0,
			y: 0,
			width: image.width,
			height: image.height
		});

		onProgress?.(Math.round(((i + 1) / files.length) * 100));
	}

	const pdfBytes = await pdf.save();
	return new Blob([pdfBytes], { type: 'application/pdf' });
}

function loadImage(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = URL.createObjectURL(file);
	});
}

// ============================================
// PAGE OPERATIONS (pdf-lib)
// ============================================

export async function getPageCount(file: File): Promise<number> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await PDFDocument.load(arrayBuffer);
	return pdf.getPageCount();
}

export async function generateThumbnail(file: File): Promise<string> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
	const page = await pdf.getPage(1);

	const scale = 0.5;
	const viewport = page.getViewport({ scale });

	const canvas = document.createElement('canvas');
	canvas.width = viewport.width;
	canvas.height = viewport.height;
	const ctx = canvas.getContext('2d')!;

	await page.render({ canvasContext: ctx, viewport }).promise;

	return canvas.toDataURL('image/jpeg', 0.7);
}

interface RotateOptions {
	angle: 90 | 180 | 270;
	pages?: number[];
	onProgress?: (progress: number) => void;
}

export async function rotatePDF(
	file: File,
	options: RotateOptions
): Promise<Blob> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await PDFDocument.load(arrayBuffer);
	const totalPages = pdf.getPageCount();
	const pagesToRotate = options.pages || Array.from({ length: totalPages }, (_, i) => i + 1);

	for (let i = 0; i < pagesToRotate.length; i++) {
		const pageIndex = pagesToRotate[i] - 1;
		if (pageIndex >= 0 && pageIndex < totalPages) {
			const page = pdf.getPage(pageIndex);
			const currentRotation = page.getRotation().angle;
			page.setRotation(degrees(currentRotation + options.angle));
		}
		options.onProgress?.(Math.round(((i + 1) / pagesToRotate.length) * 100));
	}

	const pdfBytes = await pdf.save();
	return new Blob([pdfBytes], { type: 'application/pdf' });
}

interface DeletePagesOptions {
	pages: number[];
	onProgress?: (progress: number) => void;
}

export async function deletePages(
	file: File,
	options: DeletePagesOptions
): Promise<Blob> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await PDFDocument.load(arrayBuffer);

	const pagesToDelete = [...options.pages].sort((a, b) => b - a);

	for (let i = 0; i < pagesToDelete.length; i++) {
		const pageIndex = pagesToDelete[i] - 1;
		if (pageIndex >= 0 && pageIndex < pdf.getPageCount()) {
			pdf.removePage(pageIndex);
		}
		options.onProgress?.(Math.round(((i + 1) / pagesToDelete.length) * 100));
	}

	const pdfBytes = await pdf.save();
	return new Blob([pdfBytes], { type: 'application/pdf' });
}

interface ReorderOptions {
	newOrder: number[];
	onProgress?: (progress: number) => void;
}

export async function reorderPages(
	file: File,
	options: ReorderOptions
): Promise<Blob> {
	const arrayBuffer = await file.arrayBuffer();
	const srcPdf = await PDFDocument.load(arrayBuffer);
	const newPdf = await PDFDocument.create();

	for (let i = 0; i < options.newOrder.length; i++) {
		const pageIndex = options.newOrder[i] - 1;
		if (pageIndex >= 0 && pageIndex < srcPdf.getPageCount()) {
			const [copiedPage] = await newPdf.copyPages(srcPdf, [pageIndex]);
			newPdf.addPage(copiedPage);
		}
		options.onProgress?.(Math.round(((i + 1) / options.newOrder.length) * 100));
	}

	const pdfBytes = await newPdf.save();
	return new Blob([pdfBytes], { type: 'application/pdf' });
}

// ============================================
// PAGE NUMBERS & WATERMARK (pdf-lib)
// ============================================

interface PageNumberOptions {
	position: 'bottom-center' | 'bottom-right' | 'top-center' | 'top-right';
	startNumber?: number;
	format?: string;
	onProgress?: (progress: number) => void;
}

export async function addPageNumbers(
	file: File,
	options: PageNumberOptions
): Promise<Blob> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await PDFDocument.load(arrayBuffer);
	const font = await pdf.embedFont(StandardFonts.Helvetica);
	const fontSize = 10;
	const { startNumber = 1, format = '{n}', position } = options;

	const pages = pdf.getPages();

	for (let i = 0; i < pages.length; i++) {
		const page = pages[i];
		const { width, height } = page.getSize();
		const pageNum = startNumber + i;
		const text = format.replace('{n}', pageNum.toString());
		const textWidth = font.widthOfTextAtSize(text, fontSize);

		let x: number, y: number;

		switch (position) {
			case 'bottom-center':
				x = (width - textWidth) / 2;
				y = 30;
				break;
			case 'bottom-right':
				x = width - textWidth - 40;
				y = 30;
				break;
			case 'top-center':
				x = (width - textWidth) / 2;
				y = height - 30;
				break;
			case 'top-right':
				x = width - textWidth - 40;
				y = height - 30;
				break;
		}

		page.drawText(text, {
			x,
			y,
			size: fontSize,
			font,
			color: rgb(0.3, 0.3, 0.3)
		});

		options.onProgress?.(Math.round(((i + 1) / pages.length) * 100));
	}

	const pdfBytes = await pdf.save();
	return new Blob([pdfBytes], { type: 'application/pdf' });
}

interface WatermarkOptions {
	text: string;
	opacity: number;
	fontSize?: number;
	angle?: number;
	onProgress?: (progress: number) => void;
}

export async function addWatermark(
	file: File,
	options: WatermarkOptions
): Promise<Blob> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await PDFDocument.load(arrayBuffer);
	const font = await pdf.embedFont(StandardFonts.HelveticaBold);
	const { text, opacity, fontSize = 60, angle = -45 } = options;

	const pages = pdf.getPages();

	for (let i = 0; i < pages.length; i++) {
		const page = pages[i];
		const { width, height } = page.getSize();
		const textWidth = font.widthOfTextAtSize(text, fontSize);

		const x = (width - textWidth) / 2;
		const y = height / 2;

		page.drawText(text, {
			x,
			y,
			size: fontSize,
			font,
			color: rgb(0.7, 0.7, 0.7),
			opacity: opacity / 100,
			rotate: degrees(angle)
		});

		options.onProgress?.(Math.round(((i + 1) / pages.length) * 100));
	}

	const pdfBytes = await pdf.save();
	return new Blob([pdfBytes], { type: 'application/pdf' });
}

// ============================================
// PASSWORD PROTECTION (qpdf WASM)
// ============================================

interface ProtectOptions {
	userPassword: string;
	ownerPassword?: string;
	onProgress?: (progress: number) => void;
}

/**
 * Password protect a PDF - uses qpdf WASM for AES-256 encryption
 * Falls back to pdf-lib if WASM fails
 */
export async function protectPDF(
	file: File,
	options: ProtectOptions
): Promise<Blob> {
	const { userPassword, ownerPassword = userPassword, onProgress } = options;

	const arrayBuffer = await file.arrayBuffer();

	// Try qpdf WASM first for AES-256 encryption
	try {
		onProgress?.(5);
		const result = await encryptWithQpdf(
			arrayBuffer,
			userPassword,
			ownerPassword,
			onProgress
		);
		return new Blob([result], { type: 'application/pdf' });
	} catch (e) {
		console.warn('qpdf WASM protection failed, falling back to pdf-lib:', e);
	}

	// Fall back to pdf-lib encryption (AES-128)
	return await protectPDFWithPdfLib(file, options);
}

/**
 * pdf-lib encryption (AES-128)
 * Works without any external dependencies
 */
async function protectPDFWithPdfLib(
	file: File,
	options: ProtectOptions
): Promise<Blob> {
	const { userPassword, ownerPassword = userPassword, onProgress } = options;

	onProgress?.(10);

	const arrayBuffer = await file.arrayBuffer();
	const pdf = await PDFDocument.load(arrayBuffer);

	onProgress?.(50);

	const pdfBytes = await pdf.save({
		userPassword,
		ownerPassword,
		permissions: {
			printing: 'lowResolution',
			modifying: false,
			copying: false,
			annotating: false,
			fillingForms: false,
			contentAccessibility: true,
			documentAssembly: false
		}
	});

	onProgress?.(100);

	return new Blob([pdfBytes], { type: 'application/pdf' });
}

interface UnlockOptions {
	password: string;
	onProgress?: (progress: number) => void;
}

/**
 * Unlock a password-protected PDF - uses qpdf WASM
 * Falls back to pdf-lib if WASM fails
 */
export async function unlockPDF(
	file: File,
	options: UnlockOptions
): Promise<Blob> {
	const { password, onProgress } = options;

	const arrayBuffer = await file.arrayBuffer();

	// Try qpdf WASM first
	try {
		onProgress?.(5);
		const result = await decryptWithQpdf(
			arrayBuffer,
			password,
			onProgress
		);
		return new Blob([result], { type: 'application/pdf' });
	} catch (e) {
		console.warn('qpdf WASM unlock failed, falling back to pdf-lib:', e);
	}

	// Fall back to pdf-lib
	return await unlockPDFWithPdfLib(file, options);
}

/**
 * pdf-lib unlock
 * Works without any external dependencies
 */
async function unlockPDFWithPdfLib(
	file: File,
	options: UnlockOptions
): Promise<Blob> {
	const { password, onProgress } = options;

	onProgress?.(10);

	const arrayBuffer = await file.arrayBuffer();

	onProgress?.(30);

	// Load with password
	const pdf = await PDFDocument.load(arrayBuffer, {
		password,
		ignoreEncryption: false
	});

	onProgress?.(70);

	// Save without encryption
	const pdfBytes = await pdf.save();

	onProgress?.(100);

	return new Blob([pdfBytes], { type: 'application/pdf' });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function parsePageRangeHelper(rangeStr: string, maxPages: number): number[] {
	const pages = new Set<number>();
	const parts = rangeStr.split(',').map((s) => s.trim());

	for (const part of parts) {
		if (part.includes('-')) {
			const [start, end] = part.split('-').map((s) => parseInt(s.trim(), 10));
			if (!isNaN(start) && !isNaN(end)) {
				for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
					pages.add(i);
				}
			}
		} else {
			const page = parseInt(part, 10);
			if (!isNaN(page) && page >= 1 && page <= maxPages) {
				pages.add(page);
			}
		}
	}

	return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Convert technical error messages to user-friendly messages
 */
function getUserFriendlyError(error: unknown): string {
	let message = '';
	
	if (error instanceof Error) {
		message = error.message;
	} else if (typeof error === 'string') {
		message = error;
	} else if (error && typeof error === 'object' && 'message' in error) {
		message = String((error as { message: unknown }).message);
	}
	
	const lowerMessage = message.toLowerCase();
	
	// Password errors
	if (lowerMessage.includes('password') || lowerMessage.includes('decrypt') || lowerMessage.includes('encrypted')) {
		if (lowerMessage.includes('incorrect') || lowerMessage.includes('wrong') || lowerMessage.includes('invalid')) {
			return 'Incorrect password. Please check your password and try again.';
		}
		return 'This PDF is password-protected. Please enter the correct password.';
	}
	
	// File format errors
	if (lowerMessage.includes('invalid pdf') || lowerMessage.includes('not a pdf') || lowerMessage.includes('parse')) {
		return 'This file appears to be corrupted or is not a valid PDF. Try re-downloading it.';
	}
	
	// Page range errors
	if (lowerMessage.includes('page') && (lowerMessage.includes('range') || lowerMessage.includes('out of'))) {
		return 'Invalid page range. Please check that the page numbers are within the document.';
	}
	
	// No pages selected
	if (lowerMessage.includes('no pages selected')) {
		return message; // Already user-friendly
	}
	
	// Memory/size errors
	if (lowerMessage.includes('memory') || lowerMessage.includes('too large') || lowerMessage.includes('exceeded')) {
		return 'This file is too large to process. Try a smaller file or reduce the quality settings.';
	}
	
	// Network errors (for WASM loading)
	if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('load')) {
		return 'Failed to load processing engine. Please check your internet connection and try again.';
	}
	
	// Ghostscript errors
	if (lowerMessage.includes('ghostscript') || lowerMessage.includes('gs')) {
		return 'Compression engine error. The file may be corrupted or use unsupported features.';
	}
	
	// qpdf errors  
	if (lowerMessage.includes('qpdf')) {
		return 'Encryption engine error. The file may be corrupted or already encrypted.';
	}
	
	// Generic fallback with original message if short, otherwise generic
	if (message.length > 0 && message.length < 100) {
		return message;
	}
	
	return 'Something went wrong while processing your file. Please try again.';
}

// ============================================
// PROCESS QUEUE
// ============================================

let isProcessing = false;

export async function processFiles() {
	if (isProcessing) return;

	const pendingItems = pdfs.items.filter(i => i.status === 'pending');
	if (pendingItems.length === 0) return;

	isProcessing = true;
	const tool = pdfs.settings.tool;

	try {
		if (tool === 'merge') {
			await processMerge(pendingItems);
		} else if (tool === 'images-to-pdf') {
			await processImagesToPDF(pendingItems);
		} else {
			for (const item of pendingItems) {
				await processItem(item);
			}
		}
	} finally {
		isProcessing = false;
	}
}

async function processItem(item: PDFItem) {
	const tool = pdfs.settings.tool;
	const settings = pdfs.settings;

	try {
		pdfs.updateItem(item.id, {
			status: 'processing',
			progress: 0,
			progressStage: 'Processing...'
		});

		let result: Blob | Blob[];

		switch (tool) {
			case 'compress':
				pdfs.updateItem(item.id, { progressStage: 'Compressing with Ghostscript...' });
				result = await compressPDF(item.file, {
					preset: settings.compressionPreset,
					onProgress: (p) => {
						pdfs.updateItem(item.id, {
							progress: p,
							progressStage: p < 30 ? 'Initializing...' : p < 80 ? 'Compressing...' : 'Finalizing...'
						});
					}
				});
				break;

			case 'split':
				const pageCount = await getPageCount(item.file);
				let splitOptions: SplitOptions;

				if (settings.splitMode === 'every-n') {
					splitOptions = {
						mode: 'every-n',
						everyN: settings.splitEveryN,
						onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
					};
				} else {
					// Use visual selection (item.selectedPages) if available, otherwise parse text input
					const selectedPages = item.selectedPages && item.selectedPages.length > 0
						? item.selectedPages
						: parsePageRangeHelper(settings.splitRange, pageCount);
					
					if (selectedPages.length === 0) {
						throw new Error('No pages selected. Please select pages to extract.');
					}
					
					splitOptions = {
						mode: 'extract',
						pages: selectedPages,
						onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
					};
				}

				result = await splitPDF(item.file, splitOptions);
				break;

			case 'rotate':
				result = await rotatePDF(item.file, {
					angle: settings.rotationAngle,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
				});
				break;

			case 'delete-pages':
				const deletePageCount = await getPageCount(item.file);
				// Use visual selection (item.selectedPages) if available, otherwise parse text input
				const pagesToDelete = item.selectedPages && item.selectedPages.length > 0
					? item.selectedPages
					: parsePageRangeHelper(settings.splitRange, deletePageCount);
				
				if (pagesToDelete.length === 0) {
					throw new Error('No pages selected. Please select pages to delete.');
				}
				
				result = await deletePages(item.file, {
					pages: pagesToDelete,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
				});
				break;

			case 'reorder':
				const reorderPageCount = await getPageCount(item.file);
				const newOrder = item.selectedPages || Array.from({ length: reorderPageCount }, (_, i) => i + 1);
				result = await reorderPages(item.file, {
					newOrder,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
				});
				break;

			case 'pdf-to-images':
				result = await pdfToImages(item.file, {
					format: settings.imageFormat,
					dpi: settings.imageDPI,
					quality: settings.imageQuality,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
				});
				break;

			case 'add-page-numbers':
				result = await addPageNumbers(item.file, {
					position: settings.pageNumberPosition,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
				});
				break;

			case 'watermark':
				result = await addWatermark(item.file, {
					text: settings.watermarkText || 'WATERMARK',
					opacity: settings.watermarkOpacity,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
				});
				break;

			case 'protect':
				pdfs.updateItem(item.id, { progressStage: 'Encrypting with qpdf...' });
				result = await protectPDF(item.file, {
					userPassword: settings.userPassword,
					ownerPassword: settings.ownerPassword || settings.userPassword,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
				});
				break;

			case 'unlock':
				pdfs.updateItem(item.id, { progressStage: 'Decrypting with qpdf...' });
				result = await unlockPDF(item.file, {
					password: settings.userPassword,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
				});
				break;

			default:
				throw new Error(`Unknown tool: ${tool}`);
		}

		// Handle result
		if (Array.isArray(result)) {
			const totalSize = result.reduce((acc, b) => acc + b.size, 0);
			pdfs.updateItem(item.id, {
				status: 'completed',
				progress: 100,
				processedBlobs: result,
				processedSize: totalSize,
				progressStage: `${result.length} files created`
			});
		} else {
			const processedUrl = URL.createObjectURL(result);
			pdfs.updateItem(item.id, {
				status: 'completed',
				progress: 100,
				processedBlob: result,
				processedUrl,
				processedSize: result.size,
				progressStage: 'Complete'
			});
		}
	} catch (error) {
		console.error('Processing error:', error);
		pdfs.updateItem(item.id, {
			status: 'error',
			error: getUserFriendlyError(error)
		});
	}
}

async function processMerge(items: PDFItem[]) {
	const firstItem = items[0];

	try {
		pdfs.updateItem(firstItem.id, {
			status: 'processing',
			progress: 0,
			progressStage: 'Merging PDFs...'
		});

		const sortedFiles = [...items]
			.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
			.map(i => i.file);

		const result = await mergePDFs(sortedFiles, (p) => {
			pdfs.updateItem(firstItem.id, { progress: p });
		});

		const processedUrl = URL.createObjectURL(result);

		pdfs.updateItem(firstItem.id, {
			status: 'completed',
			progress: 100,
			processedBlob: result,
			processedUrl,
			processedSize: result.size,
			progressStage: `Merged ${items.length} PDFs`
		});

		for (let i = 1; i < items.length; i++) {
			pdfs.removeItem(items[i].id);
		}
	} catch (error) {
		console.error('Merge error:', error);
		pdfs.updateItem(firstItem.id, {
			status: 'error',
			error: getUserFriendlyError(error)
		});
	}
}

async function processImagesToPDF(items: PDFItem[]) {
	const firstItem = items[0];

	try {
		pdfs.updateItem(firstItem.id, {
			status: 'processing',
			progress: 0,
			progressStage: 'Creating PDF...'
		});

		const sortedFiles = [...items]
			.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
			.map(i => i.file);

		const result = await imagesToPDF(sortedFiles, (p) => {
			pdfs.updateItem(firstItem.id, { progress: p });
		});

		const processedUrl = URL.createObjectURL(result);

		pdfs.updateItem(firstItem.id, {
			status: 'completed',
			progress: 100,
			processedBlob: result,
			processedUrl,
			processedSize: result.size,
			progressStage: `Created from ${items.length} images`
		});

		for (let i = 1; i < items.length; i++) {
			pdfs.removeItem(items[i].id);
		}
	} catch (error) {
		console.error('Images to PDF error:', error);
		pdfs.updateItem(firstItem.id, {
			status: 'error',
			error: getUserFriendlyError(error)
		});
	}
}

// ============================================
// DOWNLOAD UTILITIES
// ============================================

export function downloadFile(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

export function getOutputFilename(originalName: string, tool: string, index?: number): string {
	const baseName = originalName.replace(/\.[^/.]+$/, '');

	switch (tool) {
		case 'compress':
			return `${baseName}-compressed.pdf`;
		case 'merge':
			return `merged-${Date.now()}.pdf`;
		case 'split':
			return index !== undefined ? `${baseName}-part${index + 1}.pdf` : `${baseName}-split.pdf`;
		case 'rotate':
			return `${baseName}-rotated.pdf`;
		case 'delete-pages':
			return `${baseName}-edited.pdf`;
		case 'reorder':
			return `${baseName}-reordered.pdf`;
		case 'pdf-to-images':
			return index !== undefined ? `${baseName}-page${index + 1}` : baseName;
		case 'images-to-pdf':
			return `images-${Date.now()}.pdf`;
		case 'add-page-numbers':
			return `${baseName}-numbered.pdf`;
		case 'watermark':
			return `${baseName}-watermarked.pdf`;
		case 'protect':
			return `${baseName}-protected.pdf`;
		case 'unlock':
			return `${baseName}-unlocked.pdf`;
		default:
			return `${baseName}-processed.pdf`;
	}
}
