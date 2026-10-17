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
	return typeof VideoDecoder !== 'undefined' && typeof VideoEncoder !== 'undefined';
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
			maxResolution: { width: 0, height: 0 },
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
				hardwareAcceleration: 'prefer-hardware',
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
		maxResolution: { width: 3840, height: 2160 },
	};
}

export interface FrameExtractionOptions {
	startTime: number;
	endTime: number;
	fps: number;
	width: number;
	height?: number;
}

function throwIfAborted(signal?: AbortSignal) {
	if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
}

/** Number of frames a clip yields at the given frame rate (always at least one). */
export function countFrames(startTime: number, endTime: number, fps: number): number {
	return Math.max(1, Math.floor((endTime - startTime) * fps));
}

/**
 * Extract frames with mediabunny's CanvasSink: packets are demuxed and decoded once,
 * in order, instead of seeking an HTMLVideoElement for every frame.
 */
async function extractFramesWithMediabunny(
	file: File,
	options: FrameExtractionOptions,
	onProgress?: (progress: FrameExtractionProgress) => void,
	signal?: AbortSignal
): Promise<ImageData[]> {
	const { Input, BlobSource, ALL_FORMATS, CanvasSink } = await import('mediabunny');
	const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
	try {
		const track = await input.getPrimaryVideoTrack();
		if (!track) throw new Error('No video track');
		if (!(await track.canDecode())) throw new Error('Video codec not decodable');

		const targetWidth = options.width;
		const targetHeight =
			options.height ?? Math.round(targetWidth * (track.displayHeight / track.displayWidth));
		const sink = new CanvasSink(track, { width: targetWidth, height: targetHeight, fit: 'fill' });

		const firstTimestamp = await track.getFirstTimestamp();
		const totalFrames = countFrames(options.startTime, options.endTime, options.fps);
		const timestamps: number[] = [];
		for (let i = 0; i < totalFrames; i++) {
			// A timestamp before the first frame yields null, so clamp to it.
			timestamps.push(Math.max(firstTimestamp, options.startTime + i / options.fps));
		}

		const scratch = document.createElement('canvas');
		scratch.width = targetWidth;
		scratch.height = targetHeight;
		const ctx = scratch.getContext('2d', { willReadFrequently: true })!;

		const frames: ImageData[] = [];
		for await (const wrapped of sink.canvasesAtTimestamps(timestamps)) {
			throwIfAborted(signal);
			if (wrapped) {
				ctx.clearRect(0, 0, targetWidth, targetHeight);
				ctx.drawImage(wrapped.canvas as CanvasImageSource, 0, 0, targetWidth, targetHeight);
			}
			// A null frame (gap in the track) repeats the previous pixels.
			frames.push(ctx.getImageData(0, 0, targetWidth, targetHeight));
			onProgress?.({
				currentFrame: frames.length,
				totalFrames,
				progress: Math.round((frames.length / totalFrames) * 100),
			});
		}
		return frames;
	} finally {
		input.dispose();
	}
}

/** Legacy path: seek an HTMLVideoElement for every frame (slow, imprecise). */
async function extractFramesWithVideoElement(
	file: File,
	options: FrameExtractionOptions,
	onProgress?: (progress: FrameExtractionProgress) => void,
	signal?: AbortSignal
): Promise<ImageData[]> {
	const frames: ImageData[] = [];
	const videoUrl = URL.createObjectURL(file);
	const video = document.createElement('video');
	video.src = videoUrl;
	video.muted = true;
	video.preload = 'auto';

	try {
		await new Promise<void>((resolve, reject) => {
			video.onloadedmetadata = () => resolve();
			video.onerror = () => reject(new Error('Failed to load video'));
		});

		const aspectRatio = video.videoHeight / video.videoWidth;
		const targetWidth = options.width;
		const targetHeight = options.height || Math.round(targetWidth * aspectRatio);

		const canvas = document.createElement('canvas');
		canvas.width = targetWidth;
		canvas.height = targetHeight;
		const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

		const totalFrames = countFrames(options.startTime, options.endTime, options.fps);

		for (let i = 0; i < totalFrames; i++) {
			throwIfAborted(signal);
			video.currentTime = options.startTime + i / options.fps;
			await new Promise<void>((resolve) => {
				video.onseeked = () => resolve();
			});

			ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
			frames.push(ctx.getImageData(0, 0, targetWidth, targetHeight));

			onProgress?.({
				currentFrame: i + 1,
				totalFrames,
				progress: Math.round(((i + 1) / totalFrames) * 100),
			});
		}

		canvas.width = 0;
		canvas.height = 0;
	} finally {
		video.src = '';
		video.load();
		URL.revokeObjectURL(videoUrl);
	}

	return frames;
}

/**
 * Extract evenly spaced frames from a video clip. Uses mediabunny when it can read the
 * file, falling back to seeking a <video> element for anything it cannot decode.
 */
export async function extractFramesFromVideo(
	file: File,
	options: FrameExtractionOptions,
	onProgress?: (progress: FrameExtractionProgress) => void,
	signal?: AbortSignal
): Promise<ImageData[]> {
	if (isWebCodecsSupported()) {
		try {
			return await extractFramesWithMediabunny(file, options, onProgress, signal);
		} catch (error) {
			if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
				throw error;
			}
			console.warn('mediabunny extraction failed, falling back to <video> seeking', error);
		}
	}
	return extractFramesWithVideoElement(file, options, onProgress, signal);
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
			message:
				'Your browser does not support WebCodecs. Please use Chrome 94+, Edge 94+, or Safari 16.4+ for best performance.',
		};
	}
	return { supported: true };
}
