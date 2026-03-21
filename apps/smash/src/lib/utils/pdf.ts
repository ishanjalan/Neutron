/**
 * PDF Processing Utilities - Web App (WASM)
 *
 * Uses Ghostscript WASM for compression (50-90% reduction)
 * Uses pdf-lib for manipulation (merge, split, rotate, encrypt, etc.)
 *
 * All processing happens locally in the browser - files never leave your device.
 */

import { PDFDocument, degrees, rgb, StandardFonts } from '@cantoo/pdf-lib';
import {
	compressPDF as compressWithGS,
	isGhostscriptReady,
	renderPageGS,
	renderAllPagesGS,
} from './ghostscript';
import {
	pdfs,
	type PDFItem,
	type ImageFormat,
	type CompressionPreset,
} from '$lib/stores/pdfs.svelte';
import { parsePageRangeHelper, getUserFriendlyError } from './pdf-utils';

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
 * Get backend status for UI display
 */
export async function getBackendInfo(): Promise<{
	ghostscript: ToolStatus;
}> {
	return {
		ghostscript: { available: true, version: 'WASM' },
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
export async function compressPDF(file: File, options: CompressOptions): Promise<Blob> {
	const { preset = 'ebook', onProgress } = options;

	const arrayBuffer = await file.arrayBuffer();

	// Try Ghostscript WASM first for best compression (50-90% reduction)
	try {
		onProgress?.(5);
		const { result } = await compressWithGS(arrayBuffer, preset, onProgress);
		return new Blob([result as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
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
async function compressPDFWithPdfLib(file: File, options: CompressOptions): Promise<Blob> {
	const { onProgress } = options;

	onProgress?.(10);

	const arrayBuffer = await file.arrayBuffer();
	const srcPdf = await PDFDocument.load(arrayBuffer, {
		ignoreEncryption: true,
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
		objectsPerTick: 100,
	});

	onProgress?.(100);

	return new Blob([pdfBytes as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
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
		pages.forEach((page) => mergedPdf.addPage(page));

		onProgress?.(Math.round(((i + 1) / files.length) * 100));
	}

	const pdfBytes = await mergedPdf.save();
	return new Blob([pdfBytes as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
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

export async function splitPDF(file: File, options: SplitOptions): Promise<Blob[]> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await PDFDocument.load(arrayBuffer);
	const totalPages = pdf.getPageCount();
	const results: Blob[] = [];

	if (options.mode === 'range' && options.range) {
		const newPdf = await PDFDocument.create();
		const pageIndices = Array.from(
			{ length: options.range.end - options.range.start + 1 },
			(_, i) => options.range!.start - 1 + i
		).filter((i) => i >= 0 && i < totalPages);

		const pages = await newPdf.copyPages(pdf, pageIndices);
		pages.forEach((page) => newPdf.addPage(page));
		const bytes = await newPdf.save();
		results.push(
			new Blob([bytes as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })
		);
		options.onProgress?.(100);
	} else if (options.mode === 'extract' && options.pages) {
		const newPdf = await PDFDocument.create();
		const pageIndices = options.pages.map((p) => p - 1).filter((i) => i >= 0 && i < totalPages);

		const pages = await newPdf.copyPages(pdf, pageIndices);
		pages.forEach((page) => newPdf.addPage(page));
		const bytes = await newPdf.save();
		results.push(
			new Blob([bytes as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })
		);
		options.onProgress?.(100);
	} else if (options.mode === 'every-n' && options.everyN) {
		const n = options.everyN;
		for (let i = 0; i < totalPages; i += n) {
			const newPdf = await PDFDocument.create();
			const endPage = Math.min(i + n, totalPages);
			const pageIndices = Array.from({ length: endPage - i }, (_, j) => i + j);

			const pages = await newPdf.copyPages(pdf, pageIndices);
			pages.forEach((page) => newPdf.addPage(page));
			const bytes = await newPdf.save();
			results.push(
				new Blob([bytes as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })
			);

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

export async function pdfToImages(file: File, options: PDFToImagesOptions): Promise<Blob[]> {
	const arrayBuffer = await file.arrayBuffer();
	const pngBuffers = await renderAllPagesGS(arrayBuffer, options.dpi);
	const mimeType = options.format === 'jpg' ? 'image/jpeg' : `image/${options.format}`;
	const images: Blob[] = [];

	for (let i = 0; i < pngBuffers.length; i++) {
		const bitmap = await createImageBitmap(new Blob([pngBuffers[i]], { type: 'image/png' }));
		const canvas = document.createElement('canvas');
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const ctx = canvas.getContext('2d')!;
		ctx.drawImage(bitmap, 0, 0);
		bitmap.close();

		const blob = await new Promise<Blob>((resolve) => {
			canvas.toBlob(
				(blob) => {
					canvas.width = 0;
					canvas.height = 0;
					resolve(blob!);
				},
				mimeType,
				options.quality / 100
			);
		});

		images.push(blob);
		options.onProgress?.(Math.round(((i + 1) / pngBuffers.length) * 100));
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
				canvas.toBlob((blob) => {
					canvas.width = 0;
					canvas.height = 0;
					resolve(blob!);
				}, 'image/png');
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
			height: image.height,
		});

		onProgress?.(Math.round(((i + 1) / files.length) * 100));
	}

	const pdfBytes = await pdf.save();
	return new Blob([pdfBytes as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
}

function loadImage(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load image'));
		};
		img.src = url;
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
	const pngBuffer = await renderPageGS(arrayBuffer, 1, 36);
	const bitmap = await createImageBitmap(new Blob([pngBuffer], { type: 'image/png' }));
	const canvas = document.createElement('canvas');
	canvas.width = bitmap.width;
	canvas.height = bitmap.height;
	const ctx = canvas.getContext('2d')!;
	ctx.drawImage(bitmap, 0, 0);
	bitmap.close();
	const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
	canvas.width = 0;
	canvas.height = 0;
	return dataUrl;
}

interface RotateOptions {
	angle: 90 | 180 | 270;
	pages?: number[];
	onProgress?: (progress: number) => void;
}

export async function rotatePDF(file: File, options: RotateOptions): Promise<Blob> {
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
	return new Blob([pdfBytes as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
}

interface DeletePagesOptions {
	pages: number[];
	onProgress?: (progress: number) => void;
}

export async function deletePages(file: File, options: DeletePagesOptions): Promise<Blob> {
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
	return new Blob([pdfBytes as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
}

interface ReorderOptions {
	newOrder: number[];
	onProgress?: (progress: number) => void;
}

export async function reorderPages(file: File, options: ReorderOptions): Promise<Blob> {
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
	return new Blob([pdfBytes as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
}

// ============================================
// PASSWORD PROTECTION (pdf-lib AES-128)
// ============================================

interface ProtectOptions {
	userPassword: string;
	ownerPassword?: string;
	onProgress?: (progress: number) => void;
}

/**
 * Password protect a PDF using pdf-lib (AES-128 encryption)
 */
export async function protectPDF(file: File, options: ProtectOptions): Promise<Blob> {
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
			documentAssembly: false,
		},
	} as any);

	onProgress?.(100);

	return new Blob([pdfBytes as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
}

interface UnlockOptions {
	password: string;
	onProgress?: (progress: number) => void;
}

/**
 * Unlock a password-protected PDF using pdf-lib
 */
export async function unlockPDF(file: File, options: UnlockOptions): Promise<Blob> {
	const { password, onProgress } = options;

	onProgress?.(10);

	const arrayBuffer = await file.arrayBuffer();

	onProgress?.(30);

	const pdf = await PDFDocument.load(arrayBuffer, {
		password,
		ignoreEncryption: false,
	});

	onProgress?.(70);

	const pdfBytes = await pdf.save();

	onProgress?.(100);

	return new Blob([pdfBytes as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
}

// ============================================
// ADD PAGE NUMBERS (pdf-lib)
// ============================================

interface PageNumberOptions {
	position: 'bottom-center' | 'bottom-right' | 'top-center' | 'top-right';
	startAt: number;
	fontSize: number;
	onProgress?: (progress: number) => void;
}

export async function addPageNumbers(file: File, options: PageNumberOptions): Promise<Blob> {
	const { position, startAt, fontSize, onProgress } = options;

	const arrayBuffer = await file.arrayBuffer();
	const pdf = await PDFDocument.load(arrayBuffer);
	const font = await pdf.embedFont(StandardFonts.Helvetica);
	const pages = pdf.getPages();

	onProgress?.(10);

	for (let i = 0; i < pages.length; i++) {
		const page = pages[i];
		const { width, height } = page.getSize();
		const label = String(startAt + i);
		const textWidth = font.widthOfTextAtSize(label, fontSize);
		const margin = 20;

		let x: number;
		let y: number;

		switch (position) {
			case 'bottom-center':
				x = (width - textWidth) / 2;
				y = margin;
				break;
			case 'bottom-right':
				x = width - textWidth - margin;
				y = margin;
				break;
			case 'top-center':
				x = (width - textWidth) / 2;
				y = height - fontSize - margin;
				break;
			case 'top-right':
				x = width - textWidth - margin;
				y = height - fontSize - margin;
				break;
		}

		page.drawText(label, {
			x,
			y,
			size: fontSize,
			font,
			color: rgb(0, 0, 0),
		});

		onProgress?.(10 + Math.round(((i + 1) / pages.length) * 85));
	}

	onProgress?.(100);

	const pdfBytes = await pdf.save();
	return new Blob([pdfBytes as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
}

// ============================================
// WATERMARK (pdf-lib)
// ============================================

interface WatermarkOptions {
	text: string;
	opacity: number; // 0-100
	fontSize: number;
	onProgress?: (progress: number) => void;
}

export async function addWatermark(file: File, options: WatermarkOptions): Promise<Blob> {
	const { text, opacity, fontSize, onProgress } = options;

	if (!text.trim()) throw new Error('Watermark text cannot be empty');

	const arrayBuffer = await file.arrayBuffer();
	const pdf = await PDFDocument.load(arrayBuffer);
	const font = await pdf.embedFont(StandardFonts.HelveticaBold);
	const pages = pdf.getPages();

	onProgress?.(10);

	for (let i = 0; i < pages.length; i++) {
		const page = pages[i];
		const { width, height } = page.getSize();
		const textWidth = font.widthOfTextAtSize(text, fontSize);

		page.drawText(text, {
			x: (width - textWidth) / 2,
			y: height / 2 - fontSize / 2,
			size: fontSize,
			font,
			color: rgb(0.5, 0.5, 0.5),
			opacity: opacity / 100,
			rotate: degrees(45),
		});

		onProgress?.(10 + Math.round(((i + 1) / pages.length) * 85));
	}

	onProgress?.(100);

	const pdfBytes = await pdf.save();
	return new Blob([pdfBytes as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
}

// ============================================
// REVERSE PAGES (pdf-lib)
// ============================================

export async function reversePages(
	file: File,
	onProgress?: (progress: number) => void
): Promise<Blob> {
	const arrayBuffer = await file.arrayBuffer();
	const srcPdf = await PDFDocument.load(arrayBuffer);
	const newPdf = await PDFDocument.create();
	const pageCount = srcPdf.getPageCount();

	onProgress?.(10);

	const reversedIndices = Array.from({ length: pageCount }, (_, i) => pageCount - 1 - i);
	const pages = await newPdf.copyPages(srcPdf, reversedIndices);
	pages.forEach((page) => newPdf.addPage(page));

	onProgress?.(90);

	const pdfBytes = await newPdf.save();

	onProgress?.(100);

	return new Blob([pdfBytes as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
}

// ============================================
// REMOVE BLANK PAGES (pdfjs-dist + pdf-lib)
// ============================================

interface RemoveBlankPagesOptions {
	/** 0 = remove only completely empty pages; 1-100 = increasingly aggressive */
	threshold: number;
	onProgress?: (progress: number) => void;
}

export async function removeBlankPages(
	file: File,
	options: RemoveBlankPagesOptions
): Promise<Blob> {
	const { threshold, onProgress } = options;

	const arrayBuffer = await file.arrayBuffer();

	onProgress?.(5);

	// Render all pages at 72 DPI for pixel-based blank detection
	const pngBuffers = await renderAllPagesGS(arrayBuffer, 72);
	const totalPages = pngBuffers.length;

	// threshold 0 = allow 0.1% non-white (artifact tolerance)
	// threshold N = allow N * 0.1% non-white
	const maxNonWhitePct = threshold === 0 ? 0.1 : threshold * 0.1;

	const blankPageIndices: number[] = []; // 0-based

	for (let i = 0; i < pngBuffers.length; i++) {
		const bitmap = await createImageBitmap(new Blob([pngBuffers[i]], { type: 'image/png' }));
		const canvas = document.createElement('canvas');
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
		ctx.drawImage(bitmap, 0, 0);
		bitmap.close();

		const { width, height } = canvas;
		const data = ctx.getImageData(0, 0, width, height).data;
		canvas.width = 0;
		canvas.height = 0;

		let nonWhitePixels = 0;
		for (let p = 0; p < data.length; p += 4) {
			if (data[p] < 240 || data[p + 1] < 240 || data[p + 2] < 240) {
				nonWhitePixels++;
			}
		}

		const nonWhitePct = (nonWhitePixels / (width * height)) * 100;
		if (nonWhitePct <= maxNonWhitePct) {
			blankPageIndices.push(i);
		}

		onProgress?.(5 + Math.round(((i + 1) / totalPages) * 70));
	}

	if (blankPageIndices.length === 0) {
		onProgress?.(100);
		return new Blob([arrayBuffer], { type: 'application/pdf' });
	}

	const srcPdf = await PDFDocument.load(arrayBuffer);
	for (const idx of [...blankPageIndices].sort((a, b) => b - a)) {
		srcPdf.removePage(idx);
	}

	onProgress?.(95);

	const pdfBytes = await srcPdf.save();

	onProgress?.(100);

	return new Blob([pdfBytes as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
}

// ============================================
// EDIT METADATA (pdf-lib)
// ============================================

interface EditMetadataOptions {
	title: string;
	author: string;
	subject: string;
	keywords: string;
	onProgress?: (progress: number) => void;
}

export async function editMetadata(file: File, options: EditMetadataOptions): Promise<Blob> {
	const { title, author, subject, keywords, onProgress } = options;

	const arrayBuffer = await file.arrayBuffer();
	const pdf = await PDFDocument.load(arrayBuffer);

	onProgress?.(30);

	if (title !== '') pdf.setTitle(title);
	if (author !== '') pdf.setAuthor(author);
	if (subject !== '') pdf.setSubject(subject);
	if (keywords !== '') pdf.setKeywords([keywords]);

	onProgress?.(80);

	const pdfBytes = await pdf.save();

	onProgress?.(100);

	return new Blob([pdfBytes as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
}

// ============================================
// HELPER FUNCTIONS
// ============================================
// parsePageRangeHelper and getUserFriendlyError are imported from ./pdf-utils

// ============================================
// PROCESS QUEUE
// ============================================

let isProcessing = false;

export async function processFiles() {
	if (isProcessing) return;

	const pendingItems = pdfs.items.filter((i) => i.status === 'pending');
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
			progressStage: 'Processing...',
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
							progressStage:
								p < 30 ? 'Initializing...' : p < 80 ? 'Compressing...' : 'Finalizing...',
						});
					},
				});
				break;

			case 'split': {
				const pageCount = await getPageCount(item.file);
				let splitOptions: SplitOptions;

				if (settings.splitMode === 'every-n') {
					splitOptions = {
						mode: 'every-n',
						everyN: settings.splitEveryN,
						onProgress: (p) => pdfs.updateItem(item.id, { progress: p }),
					};
				} else {
					// Use visual selection (item.selectedPages) if available, otherwise parse text input
					const selectedPages =
						item.selectedPages && item.selectedPages.length > 0
							? item.selectedPages
							: parsePageRangeHelper(settings.splitRange, pageCount);

					if (selectedPages.length === 0) {
						throw new Error('No pages selected. Please select pages to extract.');
					}

					splitOptions = {
						mode: 'extract',
						pages: selectedPages,
						onProgress: (p) => pdfs.updateItem(item.id, { progress: p }),
					};
				}

				result = await splitPDF(item.file, splitOptions);
				break;
			}

			case 'rotate':
				result = await rotatePDF(item.file, {
					angle: settings.rotationAngle,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p }),
				});
				break;

			case 'delete-pages': {
				const deletePageCount = await getPageCount(item.file);
				// Use visual selection (item.selectedPages) if available, otherwise parse text input
				const pagesToDelete =
					item.selectedPages && item.selectedPages.length > 0
						? item.selectedPages
						: parsePageRangeHelper(settings.splitRange, deletePageCount);

				if (pagesToDelete.length === 0) {
					throw new Error('No pages selected. Please select pages to delete.');
				}

				result = await deletePages(item.file, {
					pages: pagesToDelete,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p }),
				});
				break;
			}

			case 'reorder': {
				const reorderPageCount = await getPageCount(item.file);
				const newOrder =
					item.selectedPages || Array.from({ length: reorderPageCount }, (_, i) => i + 1);
				result = await reorderPages(item.file, {
					newOrder,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p }),
				});
				break;
			}

			case 'pdf-to-images':
				result = await pdfToImages(item.file, {
					format: settings.imageFormat,
					dpi: settings.imageDPI,
					quality: settings.imageQuality,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p }),
				});
				break;

			case 'protect':
				pdfs.updateItem(item.id, { progressStage: 'Encrypting...' });
				result = await protectPDF(item.file, {
					userPassword: settings.userPassword,
					ownerPassword: settings.ownerPassword || settings.userPassword,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p }),
				});
				break;

			case 'unlock':
				pdfs.updateItem(item.id, { progressStage: 'Decrypting...' });
				result = await unlockPDF(item.file, {
					password: settings.userPassword,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p }),
				});
				break;

			case 'add-page-numbers':
				pdfs.updateItem(item.id, { progressStage: 'Adding page numbers...' });
				result = await addPageNumbers(item.file, {
					position: settings.pageNumberPosition,
					startAt: settings.pageNumberStartAt,
					fontSize: settings.pageNumberFontSize,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p }),
				});
				break;

			case 'watermark':
				pdfs.updateItem(item.id, { progressStage: 'Adding watermark...' });
				result = await addWatermark(item.file, {
					text: settings.watermarkText,
					opacity: settings.watermarkOpacity,
					fontSize: settings.watermarkFontSize,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p }),
				});
				break;

			case 'reverse-pages':
				pdfs.updateItem(item.id, { progressStage: 'Reversing pages...' });
				result = await reversePages(item.file, (p) => pdfs.updateItem(item.id, { progress: p }));
				break;

			case 'remove-blank-pages':
				pdfs.updateItem(item.id, { progressStage: 'Scanning for blank pages...' });
				result = await removeBlankPages(item.file, {
					threshold: settings.blankPageThreshold,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p }),
				});
				break;

			case 'edit-metadata':
				pdfs.updateItem(item.id, { progressStage: 'Updating metadata...' });
				result = await editMetadata(item.file, {
					title: settings.metadataTitle,
					author: settings.metadataAuthor,
					subject: settings.metadataSubject,
					keywords: settings.metadataKeywords,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p }),
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
				progressStage: `${result.length} files created`,
			});
		} else {
			const processedUrl = URL.createObjectURL(result);
			pdfs.updateItem(item.id, {
				status: 'completed',
				progress: 100,
				processedBlob: result,
				processedUrl,
				processedSize: result.size,
				progressStage: 'Complete',
			});
		}
	} catch (error) {
		console.error('Processing error:', error);
		pdfs.updateItem(item.id, {
			status: 'error',
			error: getUserFriendlyError(error),
		});
	}
}

async function processMerge(items: PDFItem[]) {
	const firstItem = items[0];

	try {
		pdfs.updateItem(firstItem.id, {
			status: 'processing',
			progress: 0,
			progressStage: 'Merging PDFs...',
		});

		const sortedFiles = [...items]
			.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
			.map((i) => i.file);

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
			progressStage: `Merged ${items.length} PDFs`,
		});

		for (let i = 1; i < items.length; i++) {
			pdfs.removeItem(items[i].id);
		}
	} catch (error) {
		console.error('Merge error:', error);
		pdfs.updateItem(firstItem.id, {
			status: 'error',
			error: getUserFriendlyError(error),
		});
	}
}

async function processImagesToPDF(items: PDFItem[]) {
	const firstItem = items[0];

	try {
		pdfs.updateItem(firstItem.id, {
			status: 'processing',
			progress: 0,
			progressStage: 'Creating PDF...',
		});

		const sortedFiles = [...items]
			.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
			.map((i) => i.file);

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
			progressStage: `Created from ${items.length} images`,
		});

		for (let i = 1; i < items.length; i++) {
			pdfs.removeItem(items[i].id);
		}
	} catch (error) {
		console.error('Images to PDF error:', error);
		pdfs.updateItem(firstItem.id, {
			status: 'error',
			error: getUserFriendlyError(error),
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
		case 'protect':
			return `${baseName}-protected.pdf`;
		case 'unlock':
			return `${baseName}-unlocked.pdf`;
		case 'add-page-numbers':
			return `${baseName}-numbered.pdf`;
		case 'watermark':
			return `${baseName}-watermarked.pdf`;
		case 'reverse-pages':
			return `${baseName}-reversed.pdf`;
		case 'remove-blank-pages':
			return `${baseName}-cleaned.pdf`;
		case 'edit-metadata':
			return `${baseName}-metadata.pdf`;
		case 'sign':
			return `${baseName}-signed.pdf`;
		default:
			return `${baseName}-processed.pdf`;
	}
}

// ============================================
// SIGNATURE
// ============================================

export interface SignaturePlacement {
	pageNum: number;
	x: number; // PDF coordinate (from left)
	y: number; // PDF coordinate (from bottom)
	width: number;
	height: number;
}

/**
 * Embed a signature image into a PDF page at the given placement.
 */
export async function signPDF(
	file: File,
	signatureDataUrl: string,
	placement: SignaturePlacement
): Promise<Blob> {
	const arrayBuffer = await file.arrayBuffer();
	const pdfDoc = await PDFDocument.load(arrayBuffer);

	// Decode base64 data URL
	const [header, base64Data] = signatureDataUrl.split(',');
	const isPng = header.includes('image/png');
	const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

	const image = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

	const pages = pdfDoc.getPages();
	if (placement.pageNum < 1 || placement.pageNum > pages.length) {
		throw new Error(`Page ${placement.pageNum} does not exist`);
	}
	const page = pages[placement.pageNum - 1];

	page.drawImage(image, {
		x: placement.x,
		y: placement.y,
		width: placement.width,
		height: placement.height,
	});

	const resultBytes = await pdfDoc.save();
	return new Blob([resultBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

// ============================================
// ANNOTATIONS
// ============================================

export interface Annotation {
	type: 'highlight' | 'freetext' | 'ink';
	pageNum: number;
	// Highlight: quad points (x,y pairs in PDF coords)
	quadPoints?: number[];
	// FreeText: position + content
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	content?: string;
	// Ink: array of stroke point arrays
	inkStrokes?: Array<Array<{ x: number; y: number }>>;
	color?: { r: number; g: number; b: number };
	opacity?: number;
}

/**
 * Save pending annotations into a PDF using pdf-lib.
 */
export async function saveAnnotations(file: File, annotations: Annotation[]): Promise<Blob> {
	const arrayBuffer = await file.arrayBuffer();
	const pdfDoc = await PDFDocument.load(arrayBuffer);
	const pages = pdfDoc.getPages();

	for (const ann of annotations) {
		if (ann.pageNum < 1 || ann.pageNum > pages.length) continue;
		const page = pages[ann.pageNum - 1];
		const { height: pageHeight } = page.getSize();
		const r = ann.color?.r ?? 1;
		const g = ann.color?.g ?? 0.9;
		const b = ann.color?.b ?? 0;
		const opacity = ann.opacity ?? 0.3;

		if (ann.type === 'highlight' && ann.quadPoints && ann.quadPoints.length >= 8) {
			// Draw a rectangle highlight approximation (pdf-lib doesn't support QuadPoints directly)
			const xs = ann.quadPoints.filter((_, i) => i % 2 === 0);
			const ys = ann.quadPoints.filter((_, i) => i % 2 === 1);
			const minX = Math.min(...xs);
			const minY = Math.min(...ys);
			const maxX = Math.max(...xs);
			const maxY = Math.max(...ys);
			page.drawRectangle({
				x: minX,
				y: pageHeight - maxY,
				width: maxX - minX,
				height: maxY - minY,
				color: rgb(r, g, b),
				opacity,
				borderWidth: 0,
			});
		} else if (
			ann.type === 'freetext' &&
			ann.content &&
			ann.x !== undefined &&
			ann.y !== undefined
		) {
			const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
			page.drawText(ann.content, {
				x: ann.x,
				y: pageHeight - (ann.y ?? 0) - 12,
				font: helvetica,
				size: 10,
				color: rgb(0.1, 0.1, 0.1),
				maxWidth: ann.width ?? 200,
			});
		}
	}

	const resultBytes = await pdfDoc.save();
	return new Blob([resultBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

// Page manipulation context menu operations
export async function rotateSinglePage(
	file: File,
	pageNum: number,
	angle: 90 | -90 | 180
): Promise<Blob> {
	const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
	const pages = pdfDoc.getPages();
	if (pageNum < 1 || pageNum > pages.length) throw new Error('Invalid page');
	const page = pages[pageNum - 1];
	const current = page.getRotation().angle;
	const normalizedAngle = (((current + angle) % 360) + 360) % 360;
	page.setRotation(degrees(normalizedAngle));
	return new Blob([(await pdfDoc.save()).buffer as ArrayBuffer], { type: 'application/pdf' });
}

export async function deleteSinglePage(file: File, pageNum: number): Promise<Blob> {
	const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
	pdfDoc.removePage(pageNum - 1);
	return new Blob([(await pdfDoc.save()).buffer as ArrayBuffer], { type: 'application/pdf' });
}

export async function extractSinglePage(file: File, pageNum: number): Promise<Blob> {
	const src = await PDFDocument.load(await file.arrayBuffer());
	const newDoc = await PDFDocument.create();
	const [copied] = await newDoc.copyPages(src, [pageNum - 1]);
	newDoc.addPage(copied);
	return new Blob([(await newDoc.save()).buffer as ArrayBuffer], { type: 'application/pdf' });
}

export async function duplicatePage(file: File, pageNum: number): Promise<Blob> {
	const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
	const [copied] = await pdfDoc.copyPages(pdfDoc, [pageNum - 1]);
	pdfDoc.insertPage(pageNum, copied);
	return new Blob([(await pdfDoc.save()).buffer as ArrayBuffer], { type: 'application/pdf' });
}

export async function insertBlankPage(file: File, afterPageNum: number): Promise<Blob> {
	const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
	const pages = pdfDoc.getPages();
	// Use same size as adjacent page
	const refPage = pages[Math.min(afterPageNum - 1, pages.length - 1)];
	const { width, height } = refPage.getSize();
	pdfDoc.insertPage(afterPageNum, [width, height]);
	return new Blob([(await pdfDoc.save()).buffer as ArrayBuffer], { type: 'application/pdf' });
}

/**
 * Move a single page from one position to another (1-indexed).
 * fromPage and toPage are both 1-indexed page numbers.
 */
export async function movePage(file: File, fromPage: number, toPage: number): Promise<Blob> {
	const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
	const count = pdfDoc.getPageCount();
	if (fromPage === toPage || fromPage < 1 || fromPage > count || toPage < 1 || toPage > count) {
		return new Blob([await file.arrayBuffer()], { type: 'application/pdf' });
	}
	// Build new order by moving fromPage to toPage
	const order = Array.from({ length: count }, (_, i) => i + 1);
	order.splice(fromPage - 1, 1);
	order.splice(toPage - 1, 0, fromPage);
	return reorderPages(file, { newOrder: order });
}
