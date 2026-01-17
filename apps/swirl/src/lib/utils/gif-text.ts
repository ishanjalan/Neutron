/**
 * GIF Text Overlay Utility
 * Adds text to GIF frames using Canvas API and re-encodes with gifski-wasm
 */

import { extractGifFrames, type ExtractedFrame } from './gif-extractor';

export type TextPosition = 'top' | 'center' | 'bottom';

export interface TextOverlayOptions {
	text: string;
	position: TextPosition;
	fontSize: number;
	fontFamily: string;
	color: string;
	strokeColor: string;
	strokeWidth: number;
	padding: number;
}

export interface ProcessingStats {
	framesProcessed: number;
	originalSize: number;
	outputSize: number;
	processingTimeMs: number;
}

const DEFAULT_OPTIONS: TextOverlayOptions = {
	text: '',
	position: 'bottom',
	fontSize: 32,
	fontFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
	color: '#FFFFFF',
	strokeColor: '#000000',
	strokeWidth: 3,
	padding: 20
};

/**
 * Calculate Y position for text based on position setting
 */
function getTextY(position: TextPosition, canvasHeight: number, fontSize: number, padding: number): number {
	switch (position) {
		case 'top':
			return fontSize + padding;
		case 'center':
			return canvasHeight / 2 + fontSize / 3;
		case 'bottom':
			return canvasHeight - padding;
		default:
			return canvasHeight - padding;
	}
}

/**
 * Draw text on a canvas with stroke and fill
 */
function drawTextOnCanvas(
	ctx: CanvasRenderingContext2D,
	canvas: HTMLCanvasElement,
	options: TextOverlayOptions
): void {
	const { text, position, fontSize, fontFamily, color, strokeColor, strokeWidth, padding } = options;
	
	if (!text.trim()) return;
	
	// Set up text style
	ctx.font = `bold ${fontSize}px ${fontFamily}`;
	ctx.textAlign = 'center';
	ctx.textBaseline = position === 'top' ? 'top' : position === 'center' ? 'middle' : 'bottom';
	
	const x = canvas.width / 2;
	const y = getTextY(position, canvas.height, fontSize, padding);
	
	// Handle multi-line text
	const lines = text.split('\n');
	const lineHeight = fontSize * 1.2;
	const totalHeight = lines.length * lineHeight;
	const startY = position === 'center' 
		? y - (totalHeight / 2) + (lineHeight / 2)
		: position === 'top'
			? y
			: y - totalHeight + lineHeight;
	
	lines.forEach((line, index) => {
		const lineY = startY + (index * lineHeight);
		
		// Draw stroke (outline)
		if (strokeWidth > 0) {
			ctx.strokeStyle = strokeColor;
			ctx.lineWidth = strokeWidth;
			ctx.lineJoin = 'round';
			ctx.miterLimit = 2;
			ctx.strokeText(line, x, lineY);
		}
		
		// Draw fill
		ctx.fillStyle = color;
		ctx.fillText(line, x, lineY);
	});
}

/**
 * Process a single frame with text overlay
 */
async function processFrame(
	frame: ExtractedFrame,
	options: TextOverlayOptions
): Promise<ImageData> {
	const canvas = document.createElement('canvas');
	canvas.width = frame.width;
	canvas.height = frame.height;
	const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
	
	// Draw original frame
	const img = new Image();
	await new Promise<void>((resolve, reject) => {
		img.onload = () => resolve();
		img.onerror = reject;
		img.src = frame.url;
	});
	ctx.drawImage(img, 0, 0, frame.width, frame.height);
	
	// Draw text overlay
	drawTextOnCanvas(ctx, canvas, options);
	
	// Return ImageData for gifski
	return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Add text overlay to a GIF file
 */
export async function addTextToGif(
	file: File,
	options: Partial<TextOverlayOptions>,
	onProgress?: (progress: number, stage: string) => void
): Promise<{ result: Blob; stats: ProcessingStats }> {
	const startTime = performance.now();
	const mergedOptions: TextOverlayOptions = { ...DEFAULT_OPTIONS, ...options };
	
	if (!mergedOptions.text.trim()) {
		throw new Error('Text is required');
	}
	
	onProgress?.(5, 'Extracting frames...');
	
	// Extract frames from GIF
	const frames = await extractGifFrames(file, (p) => {
		onProgress?.(5 + p.percentage * 0.3, `Extracting frame ${p.current}/${p.total}`);
	});
	
	if (frames.length === 0) {
		throw new Error('No frames found in GIF');
	}
	
	onProgress?.(35, 'Processing frames...');
	
	// Process each frame with text overlay
	const processedFrames: ImageData[] = [];
	const delays: number[] = [];
	
	for (let i = 0; i < frames.length; i++) {
		const frame = frames[i];
		const imageData = await processFrame(frame, mergedOptions);
		processedFrames.push(imageData);
		delays.push(frame.delay);
		
		const progress = 35 + ((i + 1) / frames.length) * 40;
		onProgress?.(progress, `Adding text to frame ${i + 1}/${frames.length}`);
	}
	
	onProgress?.(75, 'Encoding GIF...');
	
	// Encode to GIF using gifski-wasm
	const { GIFEncoder, quantize, applyPalette } = await import('gifski-wasm');
	
	const width = frames[0].width;
	const height = frames[0].height;
	
	const encoder = new GIFEncoder();
	
	for (let i = 0; i < processedFrames.length; i++) {
		const imageData = processedFrames[i];
		const delay = delays[i];
		
		// Quantize to 256 colors
		const palette = quantize(imageData.data, 256);
		const indexedPixels = applyPalette(imageData.data, palette);
		
		// Add frame (delay is in ms, gifski wants centiseconds)
		encoder.addFrame(
			indexedPixels,
			width,
			height,
			palette,
			Math.max(1, Math.round(delay / 10))
		);
		
		const progress = 75 + ((i + 1) / processedFrames.length) * 20;
		onProgress?.(progress, `Encoding frame ${i + 1}/${processedFrames.length}`);
	}
	
	const outputBytes = encoder.finish();
	const result = new Blob([outputBytes], { type: 'image/gif' });
	
	// Cleanup extracted frames
	frames.forEach(f => URL.revokeObjectURL(f.url));
	
	onProgress?.(100, 'Complete!');
	
	const stats: ProcessingStats = {
		framesProcessed: frames.length,
		originalSize: file.size,
		outputSize: result.size,
		processingTimeMs: Math.round(performance.now() - startTime)
	};
	
	return { result, stats };
}

/**
 * Get a preview frame with text overlay (for live preview)
 */
export async function getPreviewFrame(
	file: File,
	options: Partial<TextOverlayOptions>,
	frameIndex: number = 0
): Promise<string> {
	const mergedOptions: TextOverlayOptions = { ...DEFAULT_OPTIONS, ...options };
	
	// Extract just the first few frames
	const frames = await extractGifFrames(file);
	
	if (frames.length === 0) {
		throw new Error('No frames found in GIF');
	}
	
	const targetIndex = Math.min(frameIndex, frames.length - 1);
	const frame = frames[targetIndex];
	
	// Create canvas with text
	const canvas = document.createElement('canvas');
	canvas.width = frame.width;
	canvas.height = frame.height;
	const ctx = canvas.getContext('2d')!;
	
	// Draw original frame
	const img = new Image();
	await new Promise<void>((resolve, reject) => {
		img.onload = () => resolve();
		img.onerror = reject;
		img.src = frame.url;
	});
	ctx.drawImage(img, 0, 0, frame.width, frame.height);
	
	// Draw text overlay
	drawTextOnCanvas(ctx, canvas, mergedOptions);
	
	// Cleanup
	frames.forEach(f => URL.revokeObjectURL(f.url));
	
	// Return data URL
	return canvas.toDataURL('image/png');
}

/**
 * Validate text overlay options
 */
export function validateOptions(options: Partial<TextOverlayOptions>): string | null {
	if (!options.text || !options.text.trim()) {
		return 'Please enter some text';
	}
	
	if (options.fontSize && (options.fontSize < 8 || options.fontSize > 200)) {
		return 'Font size must be between 8 and 200';
	}
	
	return null;
}

export { DEFAULT_OPTIONS };
