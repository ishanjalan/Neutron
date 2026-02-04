// HEIC Conversion Web Worker
// Handles encoding PNG (from heic2any) to target format using icodec

export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif';

export interface WorkerRequest {
	id: string;
	type: 'encode';
	imageBuffer: ArrayBuffer;
	outputFormat: OutputFormat;
	quality: number;
}

export interface WorkerResponse {
	id: string;
	success: boolean;
	result?: ArrayBuffer;
	mimeType?: string;
	error?: string;
	progress?: number;
	width?: number;
	height?: number;
}

// icodec types
import type { jpeg, png, webp, avif, ImageDataLike } from 'icodec';

type JpegCodec = typeof jpeg;
type PngCodec = typeof png;
type WebpCodec = typeof webp;
type AvifCodec = typeof avif;

// Codec modules (loaded lazily)
let jpegCodec: JpegCodec | null = null;
let pngCodec: PngCodec | null = null;
let webpCodec: WebpCodec | null = null;
let avifCodec: AvifCodec | null = null;

let codecsInitialized = false;

// Convert standard ImageData to icodec's ImageDataLike
function toImageDataLike(imageData: ImageData): ImageDataLike {
	return {
		width: imageData.width,
		height: imageData.height,
		depth: 8,
		data: imageData.data,
	};
}

// Convert icodec's ImageDataLike back to standard ImageData
function toImageData(imageDataLike: ImageDataLike): ImageData {
	const sourceData = imageDataLike.data;
	const newBuffer = new ArrayBuffer(sourceData.byteLength);
	const data = new Uint8ClampedArray(newBuffer);
	data.set(sourceData);
	return new ImageData(data, imageDataLike.width, imageDataLike.height);
}

// Initialize WASM codecs
async function initCodecs() {
	if (codecsInitialized) return;

	const icodec = await import('icodec');

	jpegCodec = icodec.jpeg;
	pngCodec = icodec.png;
	webpCodec = icodec.webp;
	avifCodec = icodec.avif;

	// Load encoders and decoder for PNG (input)
	await Promise.all([
		pngCodec.loadDecoder(), // For decoding PNG from heic2any
		jpegCodec.loadEncoder(),
		pngCodec.loadEncoder(),
		webpCodec.loadEncoder(),
		avifCodec.loadEncoder(),
	]);

	codecsInitialized = true;
}

// Decode PNG buffer to ImageData
function decodePNG(buffer: ArrayBuffer): ImageData {
	const uint8 = new Uint8Array(buffer);
	return toImageData(pngCodec!.decode(uint8));
}

// Encode ImageData to target format
function encodeImage(imageData: ImageData, format: OutputFormat, quality: number): Uint8Array {
	const imageDataLike = toImageDataLike(imageData);

	switch (format) {
		case 'jpeg':
			return jpegCodec!.encode(imageDataLike, { quality });

		case 'png':
			// PNG: use quantization for smaller files
			return pngCodec!.encode(imageDataLike, {
				level: 3,
				quantize: true,
			});

		case 'webp':
			return webpCodec!.encode(imageDataLike, { quality });

		case 'avif':
			// AVIF: quality 0-100, speed 0-10 (6 = balanced)
			return avifCodec!.encode(imageDataLike, { quality, speed: 6 });

		default:
			throw new Error(`Unsupported output format: ${format}`);
	}
}

// Get MIME type for format
function getMimeType(format: OutputFormat): string {
	const map: Record<OutputFormat, string> = {
		jpeg: 'image/jpeg',
		png: 'image/png',
		webp: 'image/webp',
		avif: 'image/avif',
	};
	return map[format];
}

// Process encoding request
async function processRequest(request: WorkerRequest): Promise<WorkerResponse> {
	try {
		const { id, imageBuffer, outputFormat, quality } = request;

		// Initialize codecs on first use
		await initCodecs();

		// Report progress
		self.postMessage({ id, progress: 10 } as WorkerResponse);

		// Decode PNG to ImageData
		const imageData = decodePNG(imageBuffer);
		self.postMessage({ id, progress: 40 } as WorkerResponse);

		// Encode to target format
		const encoded = encodeImage(imageData, outputFormat, quality);
		self.postMessage({ id, progress: 80 } as WorkerResponse);

		const result = encoded.buffer;
		const mimeType = getMimeType(outputFormat);

		return {
			id,
			success: true,
			result,
			mimeType,
			width: imageData.width,
			height: imageData.height,
			progress: 100,
		};
	} catch (error) {
		return {
			id: request.id,
			success: false,
			error: error instanceof Error ? error.message : 'Unknown encoding error',
		};
	}
}

// Message handler
self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
	const response = await processRequest(e.data);
	self.postMessage(response, response.result ? [response.result] : []);
};
