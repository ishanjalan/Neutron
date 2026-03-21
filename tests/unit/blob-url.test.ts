import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTrackedUrl, revokeTrackedUrl, revokeAll, getTrackedUrlCount } from '@neutron/utils';

// Override the global mock to return unique URLs per call so the Set tracks
// multiple entries correctly.
let urlCounter = 0;
beforeEach(() => {
	urlCounter = 0;
	URL.createObjectURL = vi.fn(() => `blob:mock-url-${urlCounter++}`);
	URL.revokeObjectURL = vi.fn();
	// Reset tracked state between tests
	revokeAll();
	// Reset counter so URL mock starts fresh
	urlCounter = 0;
	URL.createObjectURL = vi.fn(() => `blob:mock-url-${urlCounter++}`);
});

describe('createTrackedUrl', () => {
	it('returns a string URL', () => {
		const blob = new Blob(['hello']);
		const url = createTrackedUrl(blob);
		expect(url).toBeTypeOf('string');
		expect(url).toContain('blob:');
	});

	it('increases tracked count', () => {
		const blob = new Blob(['hello']);
		createTrackedUrl(blob);
		expect(getTrackedUrlCount()).toBe(1);
		createTrackedUrl(blob);
		expect(getTrackedUrlCount()).toBe(2);
	});
});

describe('revokeTrackedUrl', () => {
	it('decreases tracked count and calls revokeObjectURL', () => {
		const blob = new Blob(['hello']);
		const url = createTrackedUrl(blob);
		expect(getTrackedUrlCount()).toBe(1);

		revokeTrackedUrl(url);
		expect(getTrackedUrlCount()).toBe(0);
		expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
	});

	it('does nothing for null or undefined', () => {
		revokeTrackedUrl(null);
		revokeTrackedUrl(undefined);
		expect(URL.revokeObjectURL).not.toHaveBeenCalled();
	});

	it('does nothing for a URL not in the tracked set', () => {
		revokeTrackedUrl('blob:not-tracked');
		expect(getTrackedUrlCount()).toBe(0);
	});
});

describe('revokeAll', () => {
	it('revokes all tracked URLs and resets count to 0', () => {
		const blob = new Blob(['hello']);
		createTrackedUrl(blob);
		createTrackedUrl(blob);
		createTrackedUrl(blob);
		expect(getTrackedUrlCount()).toBe(3);

		revokeAll();
		expect(getTrackedUrlCount()).toBe(0);
		expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3);
	});

	it('is a no-op when nothing is tracked', () => {
		revokeAll();
		expect(getTrackedUrlCount()).toBe(0);
		expect(URL.revokeObjectURL).not.toHaveBeenCalled();
	});
});

describe('getTrackedUrlCount', () => {
	it('accurately reflects count after create and revoke operations', () => {
		expect(getTrackedUrlCount()).toBe(0);

		const blob = new Blob(['hello']);
		const a = createTrackedUrl(blob);
		expect(getTrackedUrlCount()).toBe(1);

		const b = createTrackedUrl(blob);
		expect(getTrackedUrlCount()).toBe(2);

		revokeTrackedUrl(a);
		expect(getTrackedUrlCount()).toBe(1);

		revokeTrackedUrl(b);
		expect(getTrackedUrlCount()).toBe(0);
	});
});
