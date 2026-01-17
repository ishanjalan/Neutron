import {
	videos,
	QUALITY_PRESETS,
	type VideoItem,
	type OutputFormat,
	estimateCompressionTime,
	calculateBitrateForSize
} from '$lib/stores/videos.svelte';
import {
	isWebCodecsSupported,
	getWebCodecsCapabilities,
	encodeWithWebCodecs,
	getRecommendedCodecs,
	type WebCodecsCapabilities
} from './webcodecs';

// WebCodecs capabilities cache
let webCodecsCapabilities: WebCodecsCapabilities | null = null;

// Processing queue
let isProcessing = false;
const queue: string[] = [];

// Initialize and cache WebCodecs capabilities
export async function initWebCodecs(): Promise<WebCodecsCapabilities> {
	if (webCodecsCapabilities) return webCodecsCapabilities;
	
	webCodecsCapabilities = await getWebCodecsCapabilities();
	console.log('WebCodecs capabilities:', webCodecsCapabilities);
	return webCodecsCapabilities;
}

// Get cached capabilities (sync)
export function getCapabilitiesSync(): WebCodecsCapabilities | null {
	return webCodecsCapabilities;
}

// Check if browser supports WebCodecs
export function checkBrowserSupport(): { supported: boolean; reason?: string } {
	if (!isWebCodecsSupported()) {
		return {
			supported: false,
			reason: 'Your browser does not support WebCodecs. Please use Chrome, Edge, or Safari 16.4+.'
		};
	}
	return { supported: true };
}

// Check if a specific codec is available
export async function isCodecAvailable(codec: 'avc' | 'vp9' | 'av1' | 'hevc'): Promise<boolean> {
	const capabilities = await initWebCodecs();
	return capabilities.supportedVideoCodecs.includes(codec);
}

// Process videos
export async function processVideos(ids: string[]) {
	queue.push(...ids);
	if (!isProcessing) {
		processQueue();
	}
}

async function processQueue() {
	if (queue.length === 0) {
		isProcessing = false;
		return;
	}

	isProcessing = true;

	// Initialize WebCodecs capabilities early
	const capabilities = await initWebCodecs();

	if (!capabilities.supported) {
		// Mark all queued videos as error
		while (queue.length > 0) {
			const id = queue.shift()!;
			videos.updateItem(id, {
				status: 'error',
				error: 'WebCodecs not supported in this browser. Please use Chrome, Edge, or Safari 16.4+.'
			});
		}
		isProcessing = false;
		return;
	}

	// Process videos sequentially
	while (queue.length > 0) {
		const id = queue.shift()!;
		const item = videos.getItemById(id);
		if (item && item.status === 'pending') {
			await compressVideo(item);
		}
	}

	isProcessing = false;
}

async function compressVideo(item: VideoItem) {
	try {
		videos.updateItem(item.id, {
			status: 'processing',
			progress: 0,
			progressStage: 'Initializing hardware encoder...',
			eta: estimateCompressionTime(item, videos.settings)
		});

		const capabilities = await initWebCodecs();
		
		// Check if the required codec is supported
		const outputFormat = item.outputFormat;
		const { video: videoCodec } = getRecommendedCodecs(outputFormat);
		
		if (!capabilities.supportedVideoCodecs.includes(videoCodec)) {
			throw new Error(`${videoCodec.toUpperCase()} codec not supported by your hardware. Try a different output format.`);
		}

		const accelNote = capabilities.hardwareAcceleration ? ' (GPU)' : '';
		videos.updateItem(item.id, {
			progressStage: `Encoding with ${videoCodec.toUpperCase()}${accelNote}...`
		});

		const result = await compressWithWebCodecs(item);

		const compressedUrl = URL.createObjectURL(result.blob);

		videos.updateItem(item.id, {
			status: 'completed',
			progress: 100,
			progressStage: 'Complete',
			compressedSize: result.blob.size,
			compressedUrl,
			compressedBlob: result.blob,
			compressionDuration: result.duration,
			eta: undefined
		});
	} catch (error) {
		console.error('Compression error:', error);
		videos.updateItem(item.id, {
			status: 'error',
			error: error instanceof Error ? error.message : 'Compression failed',
			progressStage: undefined,
			eta: undefined
		});
	}
}

// Compress using WebCodecs (hardware acceleration via Mediabunny)
async function compressWithWebCodecs(
	item: VideoItem
): Promise<{ blob: Blob; duration: number }> {
	const startTime = Date.now();
	const quality = videos.settings.quality;
	const outputFormat = item.outputFormat;

	// Map quality to bitrate
	const bitrateMap: Record<string, number> = {
		tiny: 500_000,
		web: 1_500_000,
		social: 3_000_000,
		high: 6_000_000,
		lossless: 20_000_000
	};

	// Calculate bitrate - either from target size or quality preset
	let targetBitrate = bitrateMap[quality] || 2_000_000;
	if (videos.settings.targetSizeMB) {
		targetBitrate = calculateBitrateForSize(item, videos.settings.targetSizeMB, videos.settings);
	}

	// Get resolution settings
	const resolutionMap: Record<string, { width: number; height: number }> = {
		original: { width: item.width || 1920, height: item.height || 1080 },
		'2160p': { width: 3840, height: 2160 },
		'1440p': { width: 2560, height: 1440 },
		'1080p': { width: 1920, height: 1080 },
		'720p': { width: 1280, height: 720 },
		'480p': { width: 854, height: 480 },
		'360p': { width: 640, height: 360 }
	};

	const resolution = resolutionMap[videos.settings.resolution] || resolutionMap['original'];
	const { video: videoCodec, audio: audioCodec } = getRecommendedCodecs(outputFormat);

	// Audio bitrate mapping
	const audioBitrateMap: Record<string, number> = {
		'64k': 64000,
		'128k': 128000,
		'192k': 192000,
		'256k': 256000,
		'320k': 320000
	};

	// Determine actual output format for container (AV1 and HEVC use MP4 container)
	const containerFormat = (outputFormat === 'av1' || outputFormat === 'hevc') ? 'mp4' : outputFormat;

	const blob = await encodeWithWebCodecs(
		item.file,
		{
			videoCodec,
			audioCodec,
			width: resolution.width,
			height: resolution.height,
			bitrate: targetBitrate,
			framerate: 30,
			audioBitrate: audioBitrateMap[videos.settings.audioBitrate] || 128000,
			sampleRate: 48000,
			channels: 2,
			trimStart: item.trimStart,
			trimEnd: item.trimEnd
		},
		containerFormat as 'mp4' | 'webm',
		quality,
		videos.settings.stripMetadata,
		(progress) => {
			videos.updateItem(item.id, {
				progress: progress.progress,
				progressStage: `${progress.stage} (${progress.framesProcessed}/${progress.totalFrames} frames)`,
				eta: progress.fps > 0 
					? Math.round((progress.totalFrames - progress.framesProcessed) / progress.fps)
					: undefined
			});
		}
	);

	return {
		blob,
		duration: Date.now() - startTime
	};
}

export function getOutputExtension(format: OutputFormat): string {
	// AV1 and HEVC use MP4 container
	return (format === 'av1' || format === 'hevc') ? '.mp4' : `.${format}`;
}

export function getOutputFilename(originalName: string, format: OutputFormat): string {
	const baseName = originalName.replace(/\.[^/.]+$/, '');
	return `${baseName}-compressed${getOutputExtension(format)}`;
}

// Re-process a single video with new settings
export async function reprocessVideo(id: string) {
	const item = videos.getItemById(id);
	if (!item) return;

	// Clean up old compressed URL
	if (item.compressedUrl) {
		URL.revokeObjectURL(item.compressedUrl);
	}
	if (item.previewUrl) {
		URL.revokeObjectURL(item.previewUrl);
	}

	// Reset status and clear error
	videos.updateItem(id, {
		status: 'pending',
		progress: 0,
		progressStage: undefined,
		compressedSize: undefined,
		compressedUrl: undefined,
		compressedBlob: undefined,
		previewUrl: undefined,
		eta: undefined,
		error: undefined
	});

	// Get fresh item reference
	const updatedItem = videos.getItemById(id);
	if (updatedItem) {
		await compressVideo(updatedItem);
	}
}

// Re-process all completed videos with current settings
export async function reprocessAllVideos() {
	const completedItems = videos.items.filter((i) => i.status === 'completed');

	if (completedItems.length === 0) return;

	// Reset all completed items to pending
	for (const item of completedItems) {
		if (item.compressedUrl) {
			URL.revokeObjectURL(item.compressedUrl);
		}
		if (item.previewUrl) {
			URL.revokeObjectURL(item.previewUrl);
		}

		videos.updateItem(item.id, {
			outputFormat: videos.settings.outputFormat,
			status: 'pending',
			progress: 0,
			progressStage: undefined,
			compressedSize: undefined,
			compressedUrl: undefined,
			compressedBlob: undefined,
			previewUrl: undefined,
			eta: undefined
		});
	}

	// Process all items sequentially
	for (const item of completedItems) {
		const updatedItem = videos.getItemById(item.id);
		if (updatedItem && updatedItem.status === 'pending') {
			await compressVideo(updatedItem);
		}
	}
}

// Check all capabilities
export async function getCapabilities(): Promise<{
	hardwareConcurrency: number;
	deviceMemory: number;
	webCodecs: WebCodecsCapabilities;
}> {
	const webCodecs = await initWebCodecs();
	
	return {
		hardwareConcurrency: navigator.hardwareConcurrency || 4,
		deviceMemory: (navigator as { deviceMemory?: number }).deviceMemory || 4,
		webCodecs
	};
}

// Pre-load encoder (initialize WebCodecs)
export async function preloadEncoder(): Promise<boolean> {
	try {
		await initWebCodecs();
		return true;
	} catch {
		return false;
	}
}
