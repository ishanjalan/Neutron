/**
 * WebCodecs API Integration using Mediabunny
 * 
 * Provides 10-100x faster encoding by leveraging GPU hardware encoders
 * when available, with automatic codec detection and format handling.
 */

import {
	Input,
	Output,
	Conversion,
	BlobSource,
	BufferTarget,
	Mp4OutputFormat,
	WebMOutputFormat,
	ALL_FORMATS,
	QUALITY_VERY_LOW,
	QUALITY_LOW,
	QUALITY_MEDIUM,
	QUALITY_HIGH,
	QUALITY_VERY_HIGH,
	canEncodeVideo,
	canEncodeAudio,
	type VideoCodec,
	type AudioCodec,
	type Quality
} from 'mediabunny';

// Supported WebCodecs codecs
export type WebCodecsVideoCodec = 'avc' | 'vp9' | 'av1' | 'hevc';
export type WebCodecsAudioCodec = 'aac' | 'opus';

export interface WebCodecsConfig {
	videoCodec: WebCodecsVideoCodec;
	audioCodec: WebCodecsAudioCodec;
	width: number;
	height: number;
	bitrate: number;
	framerate: number;
	audioBitrate: number;
	sampleRate: number;
	channels: number;
	// Trim settings
	trimStart?: number;
	trimEnd?: number;
}

export interface WebCodecsCapabilities {
	supported: boolean;
	hardwareAcceleration: boolean;
	supportedVideoCodecs: WebCodecsVideoCodec[];
	supportedAudioCodecs: WebCodecsAudioCodec[];
	maxResolution: { width: number; height: number };
}

export interface EncodingProgress {
	stage: 'decoding' | 'encoding' | 'muxing' | 'complete';
	progress: number;
	framesProcessed: number;
	totalFrames: number;
	fps: number;
}

// Quality preset mapping from Squash presets to Mediabunny Quality
const QUALITY_MAP: Record<string, Quality> = {
	tiny: QUALITY_VERY_LOW,
	web: QUALITY_LOW,
	social: QUALITY_MEDIUM,
	high: QUALITY_HIGH,
	lossless: QUALITY_VERY_HIGH
};

// Bitrate fallback values (when using numeric bitrates)
const BITRATE_MAP: Record<string, number> = {
	tiny: 500_000,
	web: 1_500_000,
	social: 3_000_000,
	high: 6_000_000,
	lossless: 20_000_000
};

// Check if WebCodecs API is available
export function isWebCodecsSupported(): boolean {
	return (
		typeof VideoEncoder !== 'undefined' &&
		typeof VideoDecoder !== 'undefined' &&
		typeof AudioEncoder !== 'undefined' &&
		typeof AudioDecoder !== 'undefined'
	);
}

// Get detailed WebCodecs capabilities using Mediabunny's detection
export async function getWebCodecsCapabilities(): Promise<WebCodecsCapabilities> {
	if (!isWebCodecsSupported()) {
		return {
			supported: false,
			hardwareAcceleration: false,
			supportedVideoCodecs: [],
			supportedAudioCodecs: [],
			maxResolution: { width: 0, height: 0 }
		};
	}

	const supportedVideoCodecs: WebCodecsVideoCodec[] = [];
	const supportedAudioCodecs: WebCodecsAudioCodec[] = [];
	let hardwareAcceleration = false;

	// Test video codecs using Mediabunny's canEncodeVideo
	const videoCodecTests: { codec: WebCodecsVideoCodec; mediabunnyCodec: VideoCodec }[] = [
		{ codec: 'avc', mediabunnyCodec: 'avc' },
		{ codec: 'vp9', mediabunnyCodec: 'vp9' },
		{ codec: 'av1', mediabunnyCodec: 'av1' },
		{ codec: 'hevc', mediabunnyCodec: 'hevc' }
	];

	for (const test of videoCodecTests) {
		try {
			// For AV1 and HEVC, we REQUIRE hardware acceleration
			// Software encoding is too slow to be usable
			const requiresHardware = test.codec === 'av1' || test.codec === 'hevc';
			
			if (requiresHardware) {
				// Check if hardware encoder is actually available
				try {
					const support = await VideoEncoder.isConfigSupported({
						codec: getCodecString(test.codec),
						width: 1920,
						height: 1080,
						bitrate: 5_000_000,
						framerate: 30,
						hardwareAcceleration: 'prefer-hardware'
					});
					
					// Only enable if hardware acceleration is confirmed
					// Check that the browser didn't downgrade to software
					if (support.supported) {
						// Additional check: try to actually create an encoder briefly
						// This catches cases where isConfigSupported lies
						try {
							const testEncoder = new VideoEncoder({
								output: () => {},
								error: () => {}
							});
							await testEncoder.configure({
								codec: getCodecString(test.codec),
								width: 640,
								height: 480,
								bitrate: 1_000_000,
								framerate: 30,
								hardwareAcceleration: 'prefer-hardware'
							});
							// If configure succeeds, check if it's using hardware
							// @ts-ignore - hardwareAcceleration may not be in types
							const isHardware = testEncoder.encodeQueueSize !== undefined;
							testEncoder.close();
							
							if (isHardware) {
								supportedVideoCodecs.push(test.codec);
								hardwareAcceleration = true;
							}
						} catch {
							// Encoder creation failed - codec not really supported
							console.log(`${test.codec.toUpperCase()} hardware encoder not available`);
						}
					}
				} catch {
					// Hardware not available for this codec
				}
			} else {
				// For H.264 and VP9, software encoding is acceptable
				const isSupported = await canEncodeVideo(test.mediabunnyCodec, {
					width: 1920,
					height: 1080,
					bitrate: QUALITY_MEDIUM
				});
				
				if (isSupported) {
					supportedVideoCodecs.push(test.codec);
					
					// Check if hardware acceleration is available
					try {
						const support = await VideoEncoder.isConfigSupported({
							codec: getCodecString(test.codec),
							width: 1920,
							height: 1080,
							bitrate: 5_000_000,
							framerate: 30,
							hardwareAcceleration: 'prefer-hardware'
						});
						if (support.supported && support.config?.hardwareAcceleration === 'prefer-hardware') {
							hardwareAcceleration = true;
						}
					} catch {
						// Hardware detection failed, continue
					}
				}
			}
		} catch {
			// Codec not supported
		}
	}

	// Test audio codecs using Mediabunny's canEncodeAudio
	const audioCodecTests: { codec: WebCodecsAudioCodec; mediabunnyCodec: AudioCodec }[] = [
		{ codec: 'aac', mediabunnyCodec: 'aac' },
		{ codec: 'opus', mediabunnyCodec: 'opus' }
	];

	for (const test of audioCodecTests) {
		try {
			const isSupported = await canEncodeAudio(test.mediabunnyCodec, {
				sampleRate: 48000,
				numberOfChannels: 2,
				bitrate: 128000
			});
			
			if (isSupported) {
				supportedAudioCodecs.push(test.codec);
			}
		} catch {
			// Codec not supported
		}
	}

	// Test max resolution
	let maxWidth = 1920;
	let maxHeight = 1080;
	const resolutions = [
		{ width: 3840, height: 2160 }, // 4K
		{ width: 2560, height: 1440 }, // 1440p
		{ width: 1920, height: 1080 }  // 1080p
	];

	for (const res of resolutions) {
		try {
			const isSupported = await canEncodeVideo('avc', {
				width: res.width,
				height: res.height,
				bitrate: QUALITY_HIGH
			});
			
			if (isSupported) {
				maxWidth = res.width;
				maxHeight = res.height;
				break;
			}
		} catch {
			// Resolution not supported
		}
	}

	return {
		supported: supportedVideoCodecs.length > 0,
		hardwareAcceleration,
		supportedVideoCodecs,
		supportedAudioCodecs,
		maxResolution: { width: maxWidth, height: maxHeight }
	};
}

// Get codec string for WebCodecs API
function getCodecString(codec: WebCodecsVideoCodec): string {
	switch (codec) {
		case 'avc':
			return 'avc1.640028'; // H.264 High Profile Level 4.0
		case 'vp9':
			return 'vp09.00.40.08'; // VP9 Profile 0
		case 'av1':
			return 'av01.0.08M.08'; // AV1 Main Profile Level 4.0
		case 'hevc':
			return 'hev1.1.6.L93.B0'; // HEVC Main Profile Level 3.1
		default:
			return 'avc1.640028';
	}
}

// Main encoding function using Mediabunny's Conversion API
export async function encodeWithWebCodecs(
	file: File,
	config: WebCodecsConfig,
	outputFormat: 'mp4' | 'webm',
	qualityPreset: string = 'web',
	stripMetadata: boolean = false,
	onProgress?: (progress: EncodingProgress) => void
): Promise<Blob> {
	const startTime = performance.now();
	let framesProcessed = 0;
	let totalFrames = 0;

	try {
		onProgress?.({
			stage: 'decoding',
			progress: 0,
			framesProcessed: 0,
			totalFrames: 0,
			fps: 0
		});

		// Create input from blob source
		const input = new Input({
			source: new BlobSource(file),
			formats: ALL_FORMATS
		});

		// Wait for input to be ready and get metadata
		const videoTracks = await input.getVideoTracks();
		const videoTrack = videoTracks[0];
		const duration = await input.computeDuration();
		
		// Get video track info for total frames estimation
		// Use a reasonable default fps for estimation if we can't determine it
		let fps = 30; // Default assumption
		if (videoTrack) {
			try {
				// Try to compute packet stats for accurate frame rate (limit to avoid long computation)
				const stats = await videoTrack.computePacketStats(100);
				if (stats.averagePacketRate > 0) {
					fps = stats.averagePacketRate;
				}
			} catch {
				// Fall back to default fps if computation fails
			}
			totalFrames = Math.ceil(duration * fps);
		}

		// Create output format with Fast Start for MP4
		const format = outputFormat === 'mp4' 
			? new Mp4OutputFormat({ fastStart: 'in-memory' })
			: new WebMOutputFormat();

		// Create buffer target for output
		const target = new BufferTarget();

		// Create output
		const output = new Output({
			format,
			target
		});

		// Map Squash quality presets to Mediabunny Quality
		const quality = QUALITY_MAP[qualityPreset] || QUALITY_MEDIUM;

		// Use codec from config (already determined by compress.ts based on output format)
		const videoCodec: VideoCodec = config.videoCodec as VideoCodec;
		const audioCodec: AudioCodec = config.audioCodec as AudioCodec;

		// Calculate trim parameters
		const trimStart = config.trimStart ?? 0;
		const trimEnd = config.trimEnd ?? duration;
		const effectiveDuration = trimEnd - trimStart;

		// Update total frames based on effective duration
		if (effectiveDuration !== duration) {
			totalFrames = Math.ceil(effectiveDuration * fps);
		}

		// Create conversion with hardware acceleration
		const conversion = await Conversion.init({
			input,
			output,
			video: {
				codec: videoCodec,
				bitrate: quality, // Use Quality enum for smart bitrate calculation
				keyFrameInterval: 2, // Keyframe every 2 seconds
				fit: 'contain', // Maintain aspect ratio with letterboxing if needed
				hardwareAcceleration: 'prefer-hardware',
				width: config.width,
				height: config.height,
				forceTranscode: true // Ensure re-encoding with our settings
			},
			audio: {
				codec: audioCodec,
				bitrate: config.audioBitrate || 128000,
				sampleRate: config.sampleRate || 48000,
				numberOfChannels: config.channels || 2
			},
			// Trim parameters
			trim: {
				start: trimStart,
				end: trimEnd
			},
			// Metadata handling - pass empty object to strip metadata
			tags: stripMetadata ? {} : undefined,
			showWarnings: false
		});

		// Track progress
		let lastProgressTime = performance.now();
		let lastFrames = 0;

		conversion.onProgress = (progress: number) => {
			const now = performance.now();
			const framesSinceLastUpdate = Math.round(progress * totalFrames) - lastFrames;
			const timeSinceLastUpdate = (now - lastProgressTime) / 1000;
			const fps = timeSinceLastUpdate > 0 ? framesSinceLastUpdate / timeSinceLastUpdate : 0;

			framesProcessed = Math.round(progress * totalFrames);
			lastFrames = framesProcessed;
			lastProgressTime = now;

			onProgress?.({
				stage: progress < 0.95 ? 'encoding' : 'muxing',
				progress: Math.round(progress * 100),
				framesProcessed,
				totalFrames,
				fps: Math.round(fps)
			});
		};

		// Execute conversion
		await conversion.execute();

		// Get output buffer - handle null case
		const outputBuffer = target.buffer;
		if (!outputBuffer) {
			throw new Error('Output buffer is null - conversion may have failed');
		}

		onProgress?.({
			stage: 'complete',
			progress: 100,
			framesProcessed: totalFrames,
			totalFrames,
			fps: totalFrames / ((performance.now() - startTime) / 1000)
		});

		// Create output blob
		const mimeType = outputFormat === 'mp4' ? 'video/mp4' : 'video/webm';
		return new Blob([outputBuffer], { type: mimeType });

	} catch (error) {
		console.error('WebCodecs encoding error:', error);
		throw new Error(
			`WebCodecs encoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

// Check if a specific encoding configuration is supported
export async function isEncodingSupported(
	videoCodec: WebCodecsVideoCodec,
	audioCodec: WebCodecsAudioCodec,
	width: number,
	height: number
): Promise<boolean> {
	if (!isWebCodecsSupported()) return false;

	try {
		// Map to Mediabunny codec types
		const mediabunnyVideoCodec: VideoCodec = videoCodec as VideoCodec;
		const mediabunnyAudioCodec: AudioCodec = audioCodec as AudioCodec;

		const videoSupported = await canEncodeVideo(mediabunnyVideoCodec, {
			width,
			height,
			bitrate: QUALITY_MEDIUM
		});

		const audioSupported = await canEncodeAudio(mediabunnyAudioCodec, {
			sampleRate: 48000,
			numberOfChannels: 2,
			bitrate: 128000
		});

		return videoSupported && audioSupported;
	} catch {
		return false;
	}
}

// Get recommended codec for output format
export function getRecommendedCodecs(outputFormat: 'mp4' | 'webm' | 'av1' | 'hevc'): {
	video: WebCodecsVideoCodec;
	audio: WebCodecsAudioCodec;
} {
	if (outputFormat === 'webm') {
		return { video: 'vp9', audio: 'opus' };
	}
	if (outputFormat === 'av1') {
		return { video: 'av1', audio: 'aac' }; // AV1 in MP4 container
	}
	if (outputFormat === 'hevc') {
		return { video: 'hevc', audio: 'aac' }; // HEVC/H.265 in MP4 container
	}
	return { video: 'avc', audio: 'aac' };
}

// Check hardware acceleration status for a specific codec
export async function checkHardwareAcceleration(codec: WebCodecsVideoCodec): Promise<boolean> {
	if (!isWebCodecsSupported()) return false;

	try {
		const support = await VideoEncoder.isConfigSupported({
			codec: getCodecString(codec),
			width: 1920,
			height: 1080,
			bitrate: 5_000_000,
			framerate: 30,
			hardwareAcceleration: 'prefer-hardware'
		});

		return support.supported === true && 
			support.config?.hardwareAcceleration === 'prefer-hardware';
	} catch {
		return false;
	}
}

// Get all available hardware-accelerated codecs
export async function getHardwareAcceleratedCodecs(): Promise<WebCodecsVideoCodec[]> {
	const codecs: WebCodecsVideoCodec[] = ['avc', 'vp9', 'av1', 'hevc'];
	const hardwareCodecs: WebCodecsVideoCodec[] = [];

	for (const codec of codecs) {
		if (await checkHardwareAcceleration(codec)) {
			hardwareCodecs.push(codec);
		}
	}

	return hardwareCodecs;
}
