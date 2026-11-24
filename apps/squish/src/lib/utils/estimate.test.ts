import { describe, it, expect } from 'vitest';
import { canEstimate, estimateKey } from './estimate';
import type { CompressionSettings, ImageItem } from '#lib/stores/images.svelte.ts';

const settings = {
	quality: 80,
	lossless: false,
	resizeEnabled: false,
	targetSizeMode: false,
} as CompressionSettings;
const item = { id: 'a', format: 'jpeg', outputFormat: 'webp', status: 'pending' } as ImageItem;

describe('canEstimate', () => {
	it('is true for a plain raster re-encode', () => {
		expect(canEstimate(item, settings)).toBe(true);
	});

	it('is false when the result does not follow the quality level', () => {
		expect(canEstimate(undefined, settings)).toBe(false);
		expect(canEstimate({ ...item, format: 'svg' }, settings)).toBe(false);
		expect(canEstimate(item, { ...settings, resizeEnabled: true })).toBe(false);
		expect(canEstimate(item, { ...settings, targetSizeMode: true })).toBe(false);
		expect(canEstimate({ ...item, status: 'processing' }, settings)).toBe(false);
	});
});

describe('estimateKey', () => {
	it('changes with the output format but not with quality', () => {
		expect(estimateKey(item)).toBe(estimateKey({ ...item }));
		expect(estimateKey({ ...item, outputFormat: 'jpeg' })).not.toBe(estimateKey(item));
	});
});
