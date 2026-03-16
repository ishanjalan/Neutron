import { describe, it, expect, beforeEach } from 'vitest';
import {
	videos,
	estimateFileSize,
	calculateBitrateForSize,
	getEffectiveDuration,
	suggestOptimalSettings,
	QUALITY_PRESETS,
	RESOLUTION_OPTIONS,
	type VideoItem,
	type CompressionSettings,
} from './videos.svelte';

// Minimal VideoItem factory for pure-function tests
function makeVideo(overrides: Partial<VideoItem> = {}): VideoItem {
	return {
		id: 'test-vid',
		file: new File([], 'test.mp4', { type: 'video/mp4' }),
		name: 'test.mp4',
		originalSize: 10_000_000,
		originalUrl: 'blob:mock',
		format: 'mp4',
		outputFormat: 'mp4',
		status: 'pending',
		progress: 0,
		duration: 60,
		width: 1920,
		height: 1080,
		bitrate: 5_000_000,
		...overrides,
	};
}

const defaultSettings: CompressionSettings = {
	quality: 'web',
	outputFormat: 'mp4',
	resolution: 'original',
	audioBitrate: '128k',
	audioCodec: 'aac',
	stripMetadata: false,
	twoPass: false,
	preset: 'medium',
};

describe('videos store', () => {
	beforeEach(() => {
		videos.clearAll();
		localStorage.clear();
	});

	describe('initial state', () => {
		it('starts empty after clear', () => {
			expect(videos.items).toEqual([]);
		});

		it('has default settings', () => {
			expect(videos.settings.quality).toBe('web');
			expect(videos.settings.outputFormat).toBe('mp4');
			expect(videos.settings.resolution).toBe('original');
		});
	});

	describe('updateSettings', () => {
		it('updates a field', () => {
			videos.updateSettings({ quality: 'tiny' });
			expect(videos.settings.quality).toBe('tiny');
		});

		it('merges without losing other fields', () => {
			const originalFormat = videos.settings.outputFormat;
			videos.updateSettings({ quality: 'high' });
			expect(videos.settings.outputFormat).toBe(originalFormat);
		});

		it('persists to localStorage', () => {
			videos.updateSettings({ quality: 'social' });
			const saved = JSON.parse(localStorage.getItem('squash-settings-v2') ?? '{}');
			expect(saved.quality).toBe('social');
		});
	});

	describe('clearAll', () => {
		it('empties the items array', () => {
			// directly inject via store internals -- not possible here, so just verify
			expect(() => videos.clearAll()).not.toThrow();
			expect(videos.items).toEqual([]);
		});
	});

	describe('getPendingItems / getCompletedItems', () => {
		it('getPendingItems returns empty when no items', () => {
			expect(videos.getPendingItems()).toEqual([]);
		});

		it('getCompletedItems returns empty when no items', () => {
			expect(videos.getCompletedItems()).toEqual([]);
		});
	});
});

describe('QUALITY_PRESETS', () => {
	it('includes all expected presets', () => {
		expect(Object.keys(QUALITY_PRESETS)).toEqual(['tiny', 'web', 'social', 'high', 'lossless']);
	});

	it('lossless has crf 0', () => {
		expect(QUALITY_PRESETS.lossless.crf).toBe(0);
	});

	it('tiny has highest crf (most compression)', () => {
		expect(QUALITY_PRESETS.tiny.crf).toBeGreaterThan(QUALITY_PRESETS.web.crf);
	});
});

describe('RESOLUTION_OPTIONS', () => {
	it('includes "original" option', () => {
		expect(RESOLUTION_OPTIONS.some((r) => r.value === 'original')).toBe(true);
	});

	it('includes 1080p', () => {
		expect(RESOLUTION_OPTIONS.some((r) => r.value === '1080p')).toBe(true);
	});
});

describe('getEffectiveDuration', () => {
	it('returns full duration when no trim', () => {
		const video = makeVideo({ duration: 120 });
		expect(getEffectiveDuration(video)).toBe(120);
	});

	it('returns trimmed duration when trim set', () => {
		const video = makeVideo({ duration: 120, trimStart: 10, trimEnd: 50 });
		expect(getEffectiveDuration(video)).toBe(40);
	});

	it('returns 0 for zero-length trim', () => {
		const video = makeVideo({ duration: 60, trimStart: 30, trimEnd: 30 });
		expect(getEffectiveDuration(video)).toBe(0);
	});

	it('returns 0 for missing duration', () => {
		const video = makeVideo({ duration: undefined });
		expect(getEffectiveDuration(video)).toBe(0);
	});
});

describe('estimateFileSize', () => {
	it('returns targetSizeMB in bytes when set', () => {
		const video = makeVideo();
		const result = estimateFileSize(video, { ...defaultSettings, targetSizeMB: 10 });
		expect(result).toBe(10 * 1024 * 1024);
	});

	it('returns 0 for zero duration', () => {
		const video = makeVideo({ duration: 0 });
		expect(estimateFileSize(video, defaultSettings)).toBe(0);
	});

	it('returns a positive estimate for a standard video', () => {
		const video = makeVideo({ duration: 60 });
		const result = estimateFileSize(video, defaultSettings);
		expect(result).toBeGreaterThan(0);
	});

	it('lossless mode returns close to original size', () => {
		const video = makeVideo({ originalSize: 50_000_000, duration: 60 });
		const result = estimateFileSize(video, { ...defaultSettings, quality: 'lossless' });
		expect(result).toBe(Math.round(50_000_000 * 0.9));
	});
});

describe('calculateBitrateForSize', () => {
	it('returns a positive bitrate for normal inputs', () => {
		const video = makeVideo({ duration: 60 });
		const result = calculateBitrateForSize(video, 5, defaultSettings);
		expect(result).toBeGreaterThan(0);
	});

	it('returns default bitrate when duration is 0', () => {
		const video = makeVideo({ duration: 0 });
		expect(calculateBitrateForSize(video, 5, defaultSettings)).toBe(2000000);
	});

	it('returns minimum bitrate when target is tiny', () => {
		const video = makeVideo({ duration: 3600 });
		const result = calculateBitrateForSize(video, 0.001, defaultSettings);
		expect(result).toBe(100000);
	});
});

describe('suggestOptimalSettings', () => {
	it('suggests web preset for a typical 60s 1080p video', () => {
		const video = makeVideo();
		const suggestion = suggestOptimalSettings(video);
		expect(suggestion.preset).toBe('web');
		expect(suggestion.format).toBe('mp4');
	});

	it('suggests downscaling for 4K content', () => {
		const video = makeVideo({ width: 3840, height: 2160 });
		const suggestion = suggestOptimalSettings(video);
		expect(suggestion.resolution).toBe('1080p');
	});

	it('suggests tiny for long videos', () => {
		const video = makeVideo({ duration: 700 });
		const suggestion = suggestOptimalSettings(video);
		expect(suggestion.preset).toBe('tiny');
	});

	it('suggests high quality for short clips', () => {
		const video = makeVideo({ duration: 15 });
		const suggestion = suggestOptimalSettings(video);
		expect(suggestion.preset).toBe('high');
	});
});
