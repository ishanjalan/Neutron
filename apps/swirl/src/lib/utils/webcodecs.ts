/**
 * WebCodecs API Integration
 * 
 * Provides video frame extraction capabilities,
 * leveraging GPU hardware acceleration when available.
 */

// Supported WebCodecs codecs for decoding
export type WebCodecsVideoCodec = 'avc' | 'vp9' | 'av1' | 'hevc';

export interface WebCodecsCapabilities {
	supported: boolean;
	hardwareAcceleration: boolean;
	supportedVideoCodecs: WebCodecsVideoCodec[];
	maxResolution: { width: number; height: number };
}

export interface VideoMetadata {
	width: number;
	height: number;
	duration: number;
	frameRate: number;
	codec: string;
}

export interface FrameExtractionProgress {
	currentFrame: number;
	totalFrames: number;
	progress: number;
}

// Check if WebCodecs API is available
export function isWebCodecsSupported(): boolean {
	return (
		typeof VideoDecoder !== 'undefined' &&
		typeof VideoEncoder !== 'undefined'
	);
}

// Get codec string for WebCodecs API
function getCodecString(codec: WebCodecsVideoCodec): string {
	switch (codec) {
		case 'avc':
			return 'avc1.640028';
		case 'vp9':
			return 'vp09.00.40.08';
		case 'av1':
			return 'av01.0.08M.08';
		case 'hevc':
			return 'hev1.1.6.L93.B0';
		default:
			return 'avc1.640028';
	}
}

// Get detailed WebCodecs capabilities
export async function getWebCodecsCapabilities(): Promise<WebCodecsCapabilities> {
	if (!isWebCodecsSupported()) {
		return {
			supported: false,
			hardwareAcceleration: false,
			supportedVideoCodecs: [],
			maxResolution: { width: 0, height: 0 }
		};
	}

	const supportedVideoCodecs: WebCodecsVideoCodec[] = [];
	let hardwareAcceleration = false;

	// Test video codecs for decoding
	const codecTests: WebCodecsVideoCodec[] = ['avc', 'vp9', 'av1', 'hevc'];

	for (const codec of codecTests) {
		try {
			const codecString = getCodecString(codec);
			const support = await VideoDecoder.isConfigSupported({
				codec: codecString,
				hardwareAcceleration: 'prefer-hardware'
			});
			if (support.supported) {
				supportedVideoCodecs.push(codec);
				hardwareAcceleration = true;
			}
		} catch {
			// Codec not supported
		}
	}

	return {
		supported: supportedVideoCodecs.length > 0,
		hardwareAcceleration,
		supportedVideoCodecs,
		maxResolution: { width: 3840, height: 2160 }
	};
}

// Extract frames from video using canvas
export async function extractFramesFromVideo(
	file: File,
	options: {
		startTime: number;
		endTime: number;
		fps: number;
		width: number;
		height?: number;
	},
	onProgress?: (progress: FrameExtractionProgress) => void
): Promise<ImageData[]> {
	const frames: ImageData[] = [];
	
	// Create a video element for seeking
	const videoUrl = URL.createObjectURL(file);
	const video = document.createElement('video');
	video.src = videoUrl;
	video.muted = true;
	video.preload = 'auto';
	
	try {
		// Wait for video to load
		await new Promise<void>((resolve, reject) => {
			video.onloadedmetadata = () => resolve();
			video.onerror = () => reject(new Error('Failed to load video'));
		});

		// Calculate dimensions maintaining aspect ratio
		const aspectRatio = video.videoHeight / video.videoWidth;
		const targetWidth = options.width;
		const targetHeight = options.height || Math.round(targetWidth * aspectRatio);

		// Create canvas for frame extraction
		const canvas = document.createElement('canvas');
		canvas.width = targetWidth;
		canvas.height = targetHeight;
		const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

		// Calculate frame times
		const clipDuration = options.endTime - options.startTime;
		const frameInterval = 1 / options.fps;
		const totalFrames = Math.floor(clipDuration * options.fps);

		for (let i = 0; i < totalFrames; i++) {
			const frameTime = options.startTime + (i * frameInterval);
			
			// Seek to frame time
			video.currentTime = frameTime;
			await new Promise<void>((resolve) => {
				video.onseeked = () => resolve();
			});

			// Draw frame to canvas
			ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
			const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
			frames.push(imageData);

			onProgress?.({
				currentFrame: i + 1,
				totalFrames,
				progress: Math.round(((i + 1) / totalFrames) * 100)
			});
		}
	} finally {
		URL.revokeObjectURL(videoUrl);
	}

	return frames;
}

// Capabilities cache
let cachedCapabilities: WebCodecsCapabilities | null = null;

export async function getCachedCapabilities(): Promise<WebCodecsCapabilities> {
	if (!cachedCapabilities) {
		cachedCapabilities = await getWebCodecsCapabilities();
	}
	return cachedCapabilities;
}

// Check browser support with user-friendly message
export function checkBrowserSupport(): { supported: boolean; message?: string } {
	if (!isWebCodecsSupported()) {
		return {
			supported: false,
			message: 'Your browser does not support WebCodecs. Please use Chrome 94+, Edge 94+, or Safari 16.4+ for best performance.'
		};
	}
	return { supported: true };
}
