/**
 * OCR (Optical Character Recognition) Utility
 * 
 * Uses Tesseract.js to extract text from scanned PDFs
 * Can output searchable PDFs or plain text
 * 
 * All processing happens locally in the browser.
 */

import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { base } from '$app/paths';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
	pdfjsLib.GlobalWorkerOptions.workerSrc = `${base}/pdf.worker.min.mjs`;
}

export type OCRLanguage = 'eng' | 'spa' | 'fra' | 'deu' | 'ita' | 'por' | 'nld' | 'pol' | 'rus' | 'jpn' | 'chi_sim' | 'chi_tra' | 'kor' | 'ara' | 'hin';

export type OCROutputMode = 'searchable-pdf' | 'text-only' | 'text-and-pdf';

export interface OCROptions {
	language: OCRLanguage;
	outputMode: OCROutputMode;
	onProgress?: (progress: number, stage: string) => void;
}

export interface OCRResult {
	searchablePdf?: Blob;
	text: string;
	confidence: number;
	pageCount: number;
	processingTimeMs: number;
}

export interface PageOCRResult {
	text: string;
	confidence: number;
	words: Array<{
		text: string;
		bbox: { x0: number; y0: number; x1: number; y1: number };
		confidence: number;
	}>;
}

export const LANGUAGE_OPTIONS: Array<{ value: OCRLanguage; label: string; native: string }> = [
	{ value: 'eng', label: 'English', native: 'English' },
	{ value: 'spa', label: 'Spanish', native: 'Español' },
	{ value: 'fra', label: 'French', native: 'Français' },
	{ value: 'deu', label: 'German', native: 'Deutsch' },
	{ value: 'ita', label: 'Italian', native: 'Italiano' },
	{ value: 'por', label: 'Portuguese', native: 'Português' },
	{ value: 'nld', label: 'Dutch', native: 'Nederlands' },
	{ value: 'pol', label: 'Polish', native: 'Polski' },
	{ value: 'rus', label: 'Russian', native: 'Русский' },
	{ value: 'jpn', label: 'Japanese', native: '日本語' },
	{ value: 'chi_sim', label: 'Chinese (Simplified)', native: '简体中文' },
	{ value: 'chi_tra', label: 'Chinese (Traditional)', native: '繁體中文' },
	{ value: 'kor', label: 'Korean', native: '한국어' },
	{ value: 'ara', label: 'Arabic', native: 'العربية' },
	{ value: 'hin', label: 'Hindi', native: 'हिन्दी' }
];

export const OUTPUT_MODE_OPTIONS: Array<{ value: OCROutputMode; label: string; desc: string }> = [
	{ value: 'searchable-pdf', label: 'Searchable PDF', desc: 'Add invisible text layer to PDF' },
	{ value: 'text-only', label: 'Text Only', desc: 'Extract text as .txt file' },
	{ value: 'text-and-pdf', label: 'Both', desc: 'Get searchable PDF and text file' }
];

let worker: Tesseract.Worker | null = null;

/**
 * Initialize Tesseract worker with specified language
 */
async function initWorker(language: OCRLanguage): Promise<Tesseract.Worker> {
	if (worker) {
		await worker.terminate();
	}
	
	worker = await Tesseract.createWorker(language, 1, {
		logger: (m) => {
			// Optionally log progress
			if (m.status === 'recognizing text') {
				// Progress is available in m.progress
			}
		}
	});
	
	return worker;
}

/**
 * Render a PDF page to a canvas and return as ImageData
 */
async function renderPageToImage(
	pdfDoc: pdfjsLib.PDFDocumentProxy,
	pageNum: number,
	scale: number = 2.0
): Promise<{ imageData: ImageData; width: number; height: number }> {
	const page = await pdfDoc.getPage(pageNum);
	const viewport = page.getViewport({ scale });
	
	const canvas = document.createElement('canvas');
	canvas.width = viewport.width;
	canvas.height = viewport.height;
	const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
	
	await page.render({
		canvasContext: ctx,
		viewport
	}).promise;
	
	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	
	return {
		imageData,
		width: viewport.width,
		height: viewport.height
	};
}

/**
 * Perform OCR on a single page image
 */
async function ocrPage(
	worker: Tesseract.Worker,
	imageData: ImageData
): Promise<PageOCRResult> {
	// Convert ImageData to canvas for Tesseract
	const canvas = document.createElement('canvas');
	canvas.width = imageData.width;
	canvas.height = imageData.height;
	const ctx = canvas.getContext('2d')!;
	ctx.putImageData(imageData, 0, 0);
	
	const result = await worker.recognize(canvas);
	
	const words = result.data.words.map(word => ({
		text: word.text,
		bbox: word.bbox,
		confidence: word.confidence
	}));
	
	return {
		text: result.data.text,
		confidence: result.data.confidence,
		words
	};
}

/**
 * Create a searchable PDF by adding an invisible text layer
 */
async function createSearchablePdf(
	originalPdf: ArrayBuffer,
	ocrResults: PageOCRResult[],
	scale: number = 2.0
): Promise<Blob> {
	const pdfDoc = await PDFDocument.load(originalPdf);
	const pages = pdfDoc.getPages();
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
	
	for (let i = 0; i < pages.length && i < ocrResults.length; i++) {
		const page = pages[i];
		const ocrResult = ocrResults[i];
		const { width, height } = page.getSize();
		
		// Add invisible text layer
		for (const word of ocrResult.words) {
			// Convert OCR coordinates (from scaled image) to PDF coordinates
			const x = word.bbox.x0 / scale;
			// PDF y-axis is from bottom, OCR is from top
			const y = height - (word.bbox.y1 / scale);
			
			// Calculate approximate font size based on word bounding box
			const wordHeight = (word.bbox.y1 - word.bbox.y0) / scale;
			const fontSize = Math.max(4, Math.min(wordHeight * 0.8, 20));
			
			// Draw invisible text (very small opacity)
			page.drawText(word.text, {
				x,
				y,
				size: fontSize,
				font,
				color: rgb(0, 0, 0),
				opacity: 0.01 // Nearly invisible but selectable
			});
		}
	}
	
	const pdfBytes = await pdfDoc.save();
	return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Main OCR function - process a PDF file
 */
export async function performOCR(
	file: File,
	options: OCROptions
): Promise<OCRResult> {
	const startTime = performance.now();
	const { language, outputMode, onProgress } = options;
	
	onProgress?.(2, 'Initializing OCR engine...');
	
	// Initialize Tesseract worker
	const tessWorker = await initWorker(language);
	
	onProgress?.(5, 'Loading PDF...');
	
	// Load PDF with pdf.js
	const arrayBuffer = await file.arrayBuffer();
	const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
	const pageCount = pdfDoc.numPages;
	
	onProgress?.(10, `Processing ${pageCount} page(s)...`);
	
	// OCR each page
	const ocrResults: PageOCRResult[] = [];
	const scale = 2.0; // Higher scale = better OCR accuracy
	
	for (let i = 1; i <= pageCount; i++) {
		const progressBase = 10 + ((i - 1) / pageCount) * 70;
		onProgress?.(progressBase, `OCR page ${i}/${pageCount}...`);
		
		// Render page to image
		const { imageData } = await renderPageToImage(pdfDoc, i, scale);
		
		// Perform OCR
		const pageResult = await ocrPage(tessWorker, imageData);
		ocrResults.push(pageResult);
	}
	
	onProgress?.(80, 'Generating output...');
	
	// Combine all text
	const fullText = ocrResults.map((r, i) => `--- Page ${i + 1} ---\n${r.text}`).join('\n\n');
	const avgConfidence = ocrResults.reduce((sum, r) => sum + r.confidence, 0) / ocrResults.length;
	
	// Generate searchable PDF if requested
	let searchablePdf: Blob | undefined;
	
	if (outputMode === 'searchable-pdf' || outputMode === 'text-and-pdf') {
		onProgress?.(85, 'Creating searchable PDF...');
		searchablePdf = await createSearchablePdf(arrayBuffer, ocrResults, scale);
	}
	
	onProgress?.(95, 'Cleaning up...');
	
	// Cleanup
	await tessWorker.terminate();
	worker = null;
	
	onProgress?.(100, 'Complete!');
	
	return {
		searchablePdf,
		text: fullText,
		confidence: avgConfidence,
		pageCount,
		processingTimeMs: Math.round(performance.now() - startTime)
	};
}

/**
 * Quick check if OCR is available (always true in browser with Tesseract.js)
 */
export function isOCRAvailable(): boolean {
	return true;
}

/**
 * Get estimated processing time based on page count
 */
export function estimateProcessingTime(pageCount: number): string {
	// Rough estimate: 5-15 seconds per page depending on complexity
	const minSeconds = pageCount * 5;
	const maxSeconds = pageCount * 15;
	
	if (maxSeconds < 60) {
		return `${minSeconds}-${maxSeconds} seconds`;
	} else {
		const minMinutes = Math.ceil(minSeconds / 60);
		const maxMinutes = Math.ceil(maxSeconds / 60);
		return `${minMinutes}-${maxMinutes} minutes`;
	}
}
