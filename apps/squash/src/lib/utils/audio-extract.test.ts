import { describe, it, expect } from 'vitest';
import {
	audioFilename,
	estimateAudioBytes,
	AUDIO_FORMATS,
	AUDIO_FORMAT_ORDER,
} from './audio-extract';

describe('audioFilename', () => {
	it('swaps the extension for the chosen format', () => {
		expect(audioFilename('holiday.mov', 'mp3')).toBe('holiday.mp3');
		expect(audioFilename('clip.final.mp4', 'm4a')).toBe('clip.final.m4a');
		expect(audioFilename('talk.mkv', 'opus')).toBe('talk.ogg');
		expect(audioFilename('talk.webm', 'wav')).toBe('talk.wav');
	});

	it('handles names without an extension', () => {
		expect(audioFilename('recording', 'mp3')).toBe('recording.mp3');
	});
});

describe('estimateAudioBytes', () => {
	it('is bitrate × duration ÷ 8', () => {
		expect(estimateAudioBytes(60, 192_000)).toBe(1_440_000);
		expect(estimateAudioBytes(0, 192_000)).toBe(0);
	});
});

describe('AUDIO_FORMATS', () => {
	it('offers only formats browsers can encode (no FLAC/Vorbis)', () => {
		expect(AUDIO_FORMAT_ORDER).toEqual(['mp3', 'm4a', 'opus', 'wav']);
		expect(Object.keys(AUDIO_FORMATS)).not.toContain('flac');
	});

	it('marks WAV as lossless so bitrate is not offered', () => {
		expect(AUDIO_FORMATS.wav.lossy).toBe(false);
		expect(AUDIO_FORMATS.mp3.lossy).toBe(true);
	});
});
