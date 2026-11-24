/**
 * Predicting the output size of each quality level for a particular video.
 *
 * Encoders take a relative quality, not a size, and the result depends heavily on the footage
 * (a screen recording and a football match differ many times over). So instead of a formula we
 * encode a couple of short samples at every level, measure them, and extrapolate to the full
 * duration. It is an estimate — the real size is shown once compression finishes.
 */

import { Input, BlobSource, ALL_FORMATS } from 'mediabunny';
import {
	encodeWithWebCodecs,
	getRecommendedCodecs,
	CompressionCancelledError,
	type WebCodecsConfig,
} from './webcodecs';
import { fitDimensions, shortSideFromResolution } from './target-plan';
import type { CompressionSettings, VideoItem } from '#lib/stores/videos.svelte.ts';

export const QUALITY_KEYS = ['tiny', 'web', 'social', 'high', 'lossless'] as const;
export type QualityKey = (typeof QUALITY_KEYS)[number];

/** Length of each sample, and where in the (trimmed) video they start. */
const SAMPLE_SECONDS = 1.5;
const SAMPLE_POSITIONS = [0.3, 0.7];
/** Videos shorter than this get one slightly longer sample from the middle: faster, still close. */
const SINGLE_SAMPLE_BELOW = 30;
const SINGLE_SAMPLE_SECONDS = 2;

/** Predicted total output bytes per quality level (filled in as each level finishes). */
export type LevelBytes = Partial<Record<QualityKey, number>>;

export function effectiveRange(item: VideoItem): { start: number; end: number } {
	const duration = item.duration ?? 0;
	const start = Math.max(0, item.trimStart ?? 0);
	const end = Math.min(duration || Infinity, item.trimEnd ?? duration);
	return { start, end: Number.isFinite(end) ? end : start };
}

/** Everything that changes the answer. Equal keys can reuse an estimate. */
export function estimateKey(item: VideoItem, settings: CompressionSettings): string {
	const { start, end } = effectiveRange(item);
	return [
		item.id,
		item.outputFormat,
		settings.resolution,
		settings.maxFrameRate,
		settings.audioCodec,
		settings.audioBitrate,
		item.rotation ?? 0,
		start.toFixed(2),
		end.toFixed(2),
	].join('|');
}

/** Windows to sample, inside the trimmed range. Short videos are sampled whole. */
export function sampleWindows(start: number, end: number): { start: number; end: number }[] {
	const length = end - start;
	if (length <= SAMPLE_SECONDS * 2) return [{ start, end }];
	if (length < SINGLE_SAMPLE_BELOW) {
		const from = start + (length - SINGLE_SAMPLE_SECONDS) / 2;
		return [{ start: from, end: from + SINGLE_SAMPLE_SECONDS }];
	}
	return SAMPLE_POSITIONS.map((p) => {
		const from = Math.min(start + length * p, end - SAMPLE_SECONDS);
		return { start: from, end: from + SAMPLE_SECONDS };
	});
}

/** Audio bytes for the whole output, from the settings. */
export function audioBytes(settings: CompressionSettings, seconds: number): number {
	if (settings.audioCodec === 'none') return 0;
	const bitrate = (parseInt(settings.audioBitrate, 10) || 128) * 1000;
	return Math.round((bitrate * seconds) / 8);
}

export async function estimateLevels(
	item: VideoItem,
	settings: CompressionSettings,
	signal: AbortSignal,
	/** Called as each level finishes, so the selected one can show up first. */
	onLevel?: (key: QualityKey, bytes: number) => void
): Promise<LevelBytes | null> {
	const { start, end } = effectiveRange(item);
	const seconds = end - start;
	if (!item.duration || seconds <= 0) return null;

	const { video: videoCodec, audio: audioCodec } = getRecommendedCodecs(item.outputFormat);
	const container = item.outputFormat === 'webm' ? 'webm' : 'mp4';
	const rotation = item.rotation ?? 0;
	const sideways = rotation === 90 || rotation === 270;
	const srcWidth = (sideways ? item.height : item.width) || (sideways ? 1080 : 1920);
	const srcHeight = (sideways ? item.width : item.height) || (sideways ? 1920 : 1080);
	const shortSide = shortSideFromResolution(settings.resolution);
	const dims = shortSide
		? fitDimensions(srcWidth, srcHeight, shortSide)
		: { width: srcWidth, height: srcHeight };
	// A source with no audio track produces none, whatever the audio setting says
	const input = new Input({ source: new BlobSource(item.file), formats: ALL_FORMATS });
	const hasAudio = (await input.getAudioTracks()).length > 0;
	const windows = sampleWindows(start, end);
	const sampled = windows.reduce((sum, w) => sum + (w.end - w.start), 0);

	// Start with the level the user is on, then work outwards from it
	const order = [...QUALITY_KEYS].sort(
		(a, b) =>
			Math.abs(QUALITY_KEYS.indexOf(a) - QUALITY_KEYS.indexOf(settings.quality)) -
			Math.abs(QUALITY_KEYS.indexOf(b) - QUALITY_KEYS.indexOf(settings.quality))
	);
	const result: LevelBytes = {};
	for (const key of order) {
		let bytes = 0;
		for (const window of windows) {
			if (signal.aborted) throw new CompressionCancelledError();
			const config: WebCodecsConfig = {
				videoCodec,
				audioCodec,
				audioMode: 'none',
				width: dims.width,
				height: dims.height,
				rotate: rotation || undefined,
				maxFrameRate: settings.maxFrameRate || undefined,
				audioBitrate: 128000,
				sampleRate: 48000,
				channels: 2,
				trimStart: window.start,
				trimEnd: window.end,
			};
			const encoded = await encodeWithWebCodecs(
				item.file,
				config,
				container,
				key,
				false,
				undefined,
				signal
			);
			bytes += encoded.blob.size;
		}
		result[key] =
			Math.round((bytes / sampled) * seconds) + (hasAudio ? audioBytes(settings, seconds) : 0);
	}
	return result;
}
