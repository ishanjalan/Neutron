/**
 * Audio-only export: pull the audio track out of a video as MP3, M4A (AAC), Opus or WAV.
 *
 * Verified in Chrome against real audio: all four encode and decode back to the right
 * duration. FLAC and Vorbis are not offered — the browser can't encode them.
 */

import {
	Input,
	Output,
	Conversion,
	BlobSource,
	BufferTarget,
	Mp4OutputFormat,
	Mp3OutputFormat,
	OggOutputFormat,
	WavOutputFormat,
	ALL_FORMATS,
	canEncodeAudio,
	ConversionCanceledError,
	type AudioCodec,
	type OutputFormat,
} from 'mediabunny';
import { CompressionCancelledError } from './webcodecs';

export type AudioFormat = 'mp3' | 'm4a' | 'opus' | 'wav';

export interface AudioFormatInfo {
	label: string;
	extension: string;
	mime: string;
	codec: AudioCodec;
	/** Whether bitrate applies (WAV is uncompressed PCM). */
	lossy: boolean;
	blurb: string;
}

export const AUDIO_FORMATS: Record<AudioFormat, AudioFormatInfo> = {
	mp3: {
		label: 'MP3',
		extension: 'mp3',
		mime: 'audio/mpeg',
		codec: 'mp3',
		lossy: true,
		blurb: 'Plays everywhere',
	},
	m4a: {
		label: 'M4A',
		extension: 'm4a',
		mime: 'audio/mp4',
		codec: 'aac',
		lossy: true,
		blurb: 'AAC — great on Apple devices',
	},
	opus: {
		label: 'Opus',
		extension: 'ogg',
		mime: 'audio/ogg',
		codec: 'opus',
		lossy: true,
		blurb: 'Smallest, best for speech',
	},
	wav: {
		label: 'WAV',
		extension: 'wav',
		mime: 'audio/wav',
		codec: 'pcm-s16',
		lossy: false,
		blurb: 'Uncompressed, large',
	},
};

export const AUDIO_FORMAT_ORDER: AudioFormat[] = ['mp3', 'm4a', 'opus', 'wav'];

/** Bits per second. */
export const AUDIO_BITRATE_CHOICES = [64_000, 128_000, 192_000, 256_000, 320_000] as const;
export const DEFAULT_AUDIO_BITRATE = 192_000;

/** "holiday.mov" + mp3 → "holiday.mp3". */
export function audioFilename(originalName: string, format: AudioFormat): string {
	const dot = originalName.lastIndexOf('.');
	const base = dot > 0 ? originalName.slice(0, dot) : originalName;
	return `${base}.${AUDIO_FORMATS[format].extension}`;
}

/** Roughly how big the result will be, for lossy formats at a given bitrate. */
export function estimateAudioBytes(durationSeconds: number, bitrate: number): number {
	return Math.round((bitrate * durationSeconds) / 8);
}

export class NoAudioTrackError extends Error {
	constructor() {
		super('This video has no audio track.');
		this.name = 'NoAudioTrackError';
	}
}

// The MP3 encoder is a ~1.7 MB WebAssembly module — only load it when someone picks MP3.
let mp3Ready: Promise<void> | undefined;
function ensureMp3Encoder(): Promise<void> {
	mp3Ready ??= import('@mediabunny/mp3-encoder').then((m) => m.registerMp3Encoder());
	return mp3Ready;
}

/** Which formats this browser can actually produce. */
export async function detectAudioFormats(): Promise<Record<AudioFormat, boolean>> {
	const probe = async (codec: AudioCodec) => {
		try {
			return await canEncodeAudio(codec, {
				numberOfChannels: 2,
				sampleRate: 48000,
				bitrate: 128_000,
			});
		} catch {
			return false;
		}
	};
	const [m4a, opus, wav] = await Promise.all([probe('aac'), probe('opus'), probe('pcm-s16')]);
	// MP3 is encoded by our own WebAssembly module, so it only needs WebAssembly itself
	return { mp3: typeof WebAssembly !== 'undefined', m4a, opus, wav };
}

function outputFormatFor(format: AudioFormat): OutputFormat {
	switch (format) {
		case 'mp3':
			return new Mp3OutputFormat();
		case 'm4a':
			return new Mp4OutputFormat();
		case 'opus':
			return new OggOutputFormat();
		case 'wav':
			return new WavOutputFormat();
	}
}

export async function extractAudio(
	file: File,
	format: AudioFormat,
	bitrate: number,
	options: { signal?: AbortSignal; onProgress?: (percent: number) => void } = {}
): Promise<Blob> {
	const { signal, onProgress } = options;
	const info = AUDIO_FORMATS[format];

	if (signal?.aborted) throw new CompressionCancelledError();
	if (format === 'mp3') await ensureMp3Encoder();

	const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
	const audioTracks = await input.getAudioTracks();
	if (audioTracks.length === 0) throw new NoAudioTrackError();

	const target = new BufferTarget();
	const output = new Output({ format: outputFormatFor(format), target });
	const conversion = await Conversion.init({
		input,
		output,
		video: { discard: true },
		audio: info.lossy ? { codec: info.codec, bitrate } : { codec: info.codec },
		showWarnings: false,
	});

	if (!conversion.isValid) {
		throw new Error(`Your browser can’t encode ${info.label} audio. Try a different format.`);
	}

	const onAbort = () => void conversion.cancel();
	signal?.addEventListener('abort', onAbort, { once: true });
	conversion.onProgress = (progress: number) => onProgress?.(Math.round(progress * 100));

	try {
		await conversion.execute();
	} catch (error) {
		if (error instanceof ConversionCanceledError || signal?.aborted) {
			throw new CompressionCancelledError();
		}
		throw error;
	} finally {
		signal?.removeEventListener('abort', onAbort);
	}

	if (!target.buffer) throw new Error('Audio extraction produced no output.');
	return new Blob([target.buffer], { type: info.mime });
}
