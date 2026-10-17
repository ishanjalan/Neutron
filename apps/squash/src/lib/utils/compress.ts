import {
	videos,
	type VideoItem,
	type OutputFormat,
	estimateCompressionTime,
	getEffectiveDuration,
	type FitReport,
} from '$lib/stores/videos.svelte';
import {
	planForTarget,
	nextBudget,
	nextBudgetUp,
	FILL_GOAL,
	fitDimensions,
	shortSideFromResolution,
	MIN_VIDEO_BITRATE,
	RETRY_FLOOR,
	type TargetPlan,
} from './target-plan';
import { getOutputFilename as getOutputFilenameShared } from '@neutron/utils';
import {
	isWebCodecsSupported,
	getWebCodecsCapabilities,
	encodeWithWebCodecs,
	getRecommendedCodecs,
	CompressionCancelledError,
	isUnsupportedInputError,
	type WebCodecsCapabilities,
} from './webcodecs';

// WebCodecs capabilities cache
let webCodecsCapabilities: WebCodecsCapabilities | null = null;

// Processing queue
let isProcessing = false;
const queue: string[] = [];
// One controller per video currently being encoded, so it can be cancelled
const controllers = new Map<string, AbortController>();

/** Stop compressing a video (or take it out of the queue). It returns to "pending". */
export function cancelCompression(id: string) {
	const queued = queue.indexOf(id);
	if (queued !== -1) queue.splice(queued, 1);

	const controller = controllers.get(id);
	if (controller) {
		controller.abort();
	} else {
		videos.updateItem(id, {
			status: 'pending',
			progress: 0,
			progressStage: undefined,
			eta: undefined,
		});
	}
}

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
			reason: 'Your browser does not support WebCodecs. Please use Chrome, Edge, or Safari 16.4+.',
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

	// Show initializing state on all queued videos before the (potentially slow) first init
	if (!getCapabilitiesSync()) {
		for (const id of queue) {
			videos.updateItem(id, {
				status: 'processing',
				progress: 0,
				progressStage: 'Initializing encoder...',
			});
		}
	}

	// Initialize WebCodecs capabilities early
	const capabilities = await initWebCodecs();

	if (!capabilities.supported) {
		// Mark all queued videos as error
		while (queue.length > 0) {
			const id = queue.shift()!;
			videos.updateItem(id, {
				status: 'error',
				error: 'WebCodecs not supported in this browser. Please use Chrome, Edge, or Safari 16.4+.',
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

const UNSUPPORTED_INPUT_MESSAGE =
	'Squash can’t read this file — its format or codec isn’t supported by your browser. Try converting it to MP4 (H.264) first.';

async function compressVideo(item: VideoItem) {
	const controller = new AbortController();
	controllers.set(item.id, controller);
	try {
		videos.updateItem(item.id, {
			status: 'processing',
			progress: 0,
			progressStage: 'Initializing hardware encoder...',
			eta: estimateCompressionTime(item, videos.settings),
		});

		const capabilities = await initWebCodecs();

		// Check if the required codec is supported
		const outputFormat = item.outputFormat;
		const { video: videoCodec } = getRecommendedCodecs(outputFormat);

		if (!capabilities.supportedVideoCodecs.includes(videoCodec)) {
			const isWebmVp9 = outputFormat === 'webm' && videoCodec === 'vp9';
			throw new Error(
				isWebmVp9
					? 'WebM/VP9 encoding is not supported in this browser. Try Chrome, or switch to MP4.'
					: `${videoCodec.toUpperCase()} codec not supported by your hardware. Try a different output format.`
			);
		}

		const accelNote = capabilities.hardwareAcceleration ? ' (GPU)' : '';
		videos.updateItem(item.id, {
			progressStage: `Encoding with ${videoCodec.toUpperCase()}${accelNote}...`,
		});

		const result = await compressWithWebCodecs(item, controller.signal);

		const compressedUrl = URL.createObjectURL(result.blob);

		videos.updateItem(item.id, {
			status: 'completed',
			progress: 100,
			progressStage: 'Complete',
			compressedSize: result.blob.size,
			compressedUrl,
			compressedBlob: result.blob,
			compressionDuration: result.duration,
			fit: result.fit,
			eta: undefined,
		});
	} catch (error) {
		if (error instanceof CompressionCancelledError) {
			// Not a failure — put it back so it can be run again
			videos.updateItem(item.id, {
				status: 'pending',
				progress: 0,
				progressStage: undefined,
				eta: undefined,
			});
			return;
		}

		console.error('Compression error:', error);
		const unreadable = isUnsupportedInputError(error);
		videos.updateItem(item.id, {
			status: 'error',
			error: unreadable
				? UNSUPPORTED_INPUT_MESSAGE
				: error instanceof Error
					? error.message
					: 'Compression failed',
			// Retrying a file we can't read just fails the same way
			retryable: !unreadable,
			progressStage: undefined,
			eta: undefined,
		});
	} finally {
		controllers.delete(item.id);
	}
}

const MAX_FIT_PASSES = 3;

const AUDIO_BITRATES: Record<string, number> = {
	'64k': 64000,
	'128k': 128000,
	'192k': 192000,
	'256k': 256000,
	'320k': 320000,
};

// Compress using WebCodecs (hardware acceleration via Mediabunny)
async function compressWithWebCodecs(
	item: VideoItem,
	signal: AbortSignal
): Promise<{ blob: Blob; duration: number; fit?: FitReport }> {
	const startTime = Date.now();
	const settings = videos.settings;
	const outputFormat = item.outputFormat;
	const { video: videoCodec, audio: audioCodec } = getRecommendedCodecs(outputFormat);

	// AV1 and HEVC use MP4 container
	const containerFormat = outputFormat === 'av1' || outputFormat === 'hevc' ? 'mp4' : outputFormat;

	const srcWidth = item.width || 1920;
	const srcHeight = item.height || 1080;
	const requestedShortSide = shortSideFromResolution(settings.resolution);
	const audioMode =
		settings.audioCodec === 'none' ? 'none' : settings.audioCodec === 'copy' ? 'copy' : 'encode';
	const audioBitrate = AUDIO_BITRATES[settings.audioBitrate] || 128000;

	// A target size needs a known duration to turn into a bitrate
	const effectiveDuration = getEffectiveDuration(item);
	const targetBytes =
		settings.targetSizeMB && effectiveDuration > 0
			? Math.round(settings.targetSizeMB * 1024 * 1024)
			: undefined;

	let budget = targetBytes ?? 0;
	let plan: TargetPlan | undefined;
	let blob: Blob | undefined;
	let passes = 0;
	// Measured from the source on the first pass; refines later passes and the fit report
	let sourceFps: number | undefined;
	let frameRateCapped = false;
	// Largest encode that fits under the target so far — what we return if later passes overshoot
	let best: { blob: Blob; plan: TargetPlan } | undefined;

	while (passes < (targetBytes ? MAX_FIT_PASSES : 1)) {
		if (signal.aborted) throw new CompressionCancelledError();
		passes++;

		if (targetBytes) {
			plan = planForTarget({
				width: srcWidth,
				height: srcHeight,
				duration: effectiveDuration,
				targetBytes: budget,
				codec: videoCodec,
				audio: audioMode,
				audioBitrate,
				requestedShortSide,
				sourceBitrate: item.bitrate,
				sourceFps,
				// If an earlier pass overshot, allow going lower than the usual quality floor
				minShortSide: passes > 1 ? RETRY_FLOOR : undefined,
			});
		}

		const dims = plan
			? { width: plan.width, height: plan.height }
			: requestedShortSide
				? fitDimensions(srcWidth, srcHeight, requestedShortSide)
				: { width: srcWidth, height: srcHeight };

		const encoded = await encodeWithWebCodecs(
			item.file,
			{
				videoCodec,
				audioCodec,
				audioMode,
				width: dims.width,
				height: dims.height,
				bitrate: plan?.videoBitrate,
				// Cap high-frame-rate sources only when we're squeezing into a size budget
				maxFrameRate: plan ? 30 : undefined,
				audioBitrate: plan?.audioBitrate || audioBitrate,
				sampleRate: 48000,
				channels: 2,
				trimStart: item.trimStart,
				trimEnd: item.trimEnd,
			},
			containerFormat as 'mp4' | 'webm',
			settings.quality,
			settings.stripMetadata,
			(progress) => {
				videos.updateItem(item.id, {
					progress: progress.progress,
					progressStage:
						passes > 1
							? `Fitting to ${settings.targetSizeMB} MB — pass ${passes} of ${MAX_FIT_PASSES} (${progress.progress}%)`
							: `${progress.stage} (${progress.framesProcessed}/${progress.totalFrames} frames)`,
					eta:
						progress.fps > 0
							? Math.round((progress.totalFrames - progress.framesProcessed) / progress.fps)
							: undefined,
				});
			},
			signal
		);
		blob = encoded.blob;
		sourceFps = encoded.sourceFps;
		frameRateCapped = encoded.frameRateCapped;

		if (!targetBytes || !plan) break;

		if (blob.size <= targetBytes) {
			if (!best || blob.size > best.blob.size) best = { blob, plan };
			// Filled most of the target — good enough
			if (blob.size >= targetBytes * FILL_GOAL) break;
			// Came in well under: the encoder under-delivered, so ask for more — unless the
			// plan is already as high as the source's own bitrate (nothing more to give)
			if (item.bitrate && plan.videoBitrate >= Math.round(item.bitrate * 0.95) - 1) break;
			budget = nextBudgetUp(targetBytes, budget, blob.size);
		} else {
			// Over the target — already at the bitrate floor, another pass can't shrink it
			if (plan.videoBitrate <= MIN_VIDEO_BITRATE) break;
			budget = nextBudget(targetBytes, budget, blob.size);
		}
	}

	const chosen = best ?? (blob && plan ? { blob, plan } : undefined);

	const fit: FitReport | undefined =
		targetBytes && chosen
			? {
					targetBytes,
					ok: chosen.blob.size <= targetBytes,
					passes,
					width: chosen.plan.width,
					height: chosen.plan.height,
					scaledDown: chosen.plan.scaledDown,
					frameRateCapped,
					feasibility: chosen.plan.feasibility,
				}
			: undefined;

	return {
		blob: (chosen?.blob ?? blob)!,
		duration: Date.now() - startTime,
		fit,
	};
}

export function getOutputExtension(format: OutputFormat): string {
	// AV1 and HEVC use MP4 container
	return format === 'av1' || format === 'hevc' ? '.mp4' : `.${format}`;
}

export function getOutputFilename(originalName: string, format: OutputFormat): string {
	return getOutputFilenameShared(originalName, {
		suffix: 'compressed',
		extension: getOutputExtension(format).replace(/^\./, ''),
	});
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
		error: undefined,
		retryable: undefined,
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
			eta: undefined,
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
		webCodecs,
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
