import { describe, it, expect } from 'vitest';
import { sampleWindows, estimateKey, audioBytes, effectiveRange } from './estimate';
import type { CompressionSettings, VideoItem } from '#lib/stores/videos.svelte.ts';

const settings: CompressionSettings = {
	quality: 'web',
	outputFormat: 'mp4',
	resolution: 'original',
	maxFrameRate: 0,
	audioBitrate: '128k',
	audioCodec: 'aac',
	stripMetadata: false,
};
const item = { id: 'a', outputFormat: 'mp4', duration: 60 } as VideoItem;

describe('sampleWindows', () => {
	it('samples a short video whole', () => {
		expect(sampleWindows(0, 2.5)).toEqual([{ start: 0, end: 2.5 }]);
	});

	it('takes one 2 s window from the middle of a medium video', () => {
		expect(sampleWindows(0, 10)).toEqual([{ start: 4, end: 6 }]);
	});

	it('takes two 1.5 s windows inside a long video, away from the very start and end', () => {
		const windows = sampleWindows(0, 60);
		expect(windows).toHaveLength(2);
		for (const w of windows) {
			expect(w.end - w.start).toBeCloseTo(1.5);
			expect(w.start).toBeGreaterThan(5);
			expect(w.end).toBeLessThan(55);
		}
	});

	it('stays inside a trimmed range', () => {
		for (const w of sampleWindows(20, 60)) {
			expect(w.start).toBeGreaterThanOrEqual(20);
			expect(w.end).toBeLessThanOrEqual(60);
		}
	});
});

describe('estimateKey', () => {
	it('changes with anything that changes the answer, and only then', () => {
		const base = estimateKey(item, settings);
		expect(estimateKey(item, { ...settings, quality: 'high' })).toBe(base);
		expect(estimateKey(item, { ...settings, resolution: '720p' })).not.toBe(base);
		expect(estimateKey({ ...item, outputFormat: 'webm' }, settings)).not.toBe(base);
		expect(estimateKey({ ...item, trimStart: 5 }, settings)).not.toBe(base);
		expect(estimateKey({ ...item, rotation: 90 }, settings)).not.toBe(base);
	});
});

describe('audioBytes', () => {
	it('is zero when audio is removed and bitrate x seconds otherwise', () => {
		expect(audioBytes({ ...settings, audioCodec: 'none' }, 10)).toBe(0);
		expect(audioBytes(settings, 10)).toBe(160_000);
	});
});

describe('effectiveRange', () => {
	it('uses the trim range, clamped to the duration', () => {
		expect(effectiveRange(item)).toEqual({ start: 0, end: 60 });
		expect(effectiveRange({ ...item, trimStart: 10, trimEnd: 99 })).toEqual({ start: 10, end: 60 });
	});
});
