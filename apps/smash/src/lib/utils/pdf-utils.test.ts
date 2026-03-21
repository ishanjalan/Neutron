import { describe, it, expect } from 'vitest';
import { parsePageRangeHelper, getUserFriendlyError } from './pdf-utils';

describe('parsePageRangeHelper', () => {
	it('parses a simple range', () => {
		expect(parsePageRangeHelper('1-3', 10)).toEqual([1, 2, 3]);
	});

	it('parses a mix of individual pages and ranges', () => {
		expect(parsePageRangeHelper('1, 5, 8-10', 10)).toEqual([1, 5, 8, 9, 10]);
	});

	it('deduplicates overlapping ranges', () => {
		expect(parsePageRangeHelper('1-3, 2-4', 10)).toEqual([1, 2, 3, 4]);
	});

	it('clamps out-of-bounds pages to maxPages', () => {
		expect(parsePageRangeHelper('8-12', 10)).toEqual([8, 9, 10]);
	});

	it('returns empty array for reversed range (start > end)', () => {
		// Math.max(1, 5) = 5, Math.min(10, 3) = 3 → loop never executes
		expect(parsePageRangeHelper('5-3', 10)).toEqual([]);
	});

	it('returns empty array for empty string', () => {
		expect(parsePageRangeHelper('', 10)).toEqual([]);
	});

	it('returns empty array for whitespace-only string', () => {
		expect(parsePageRangeHelper('   ', 10)).toEqual([]);
	});

	it('ignores page numbers below 1', () => {
		expect(parsePageRangeHelper('0, 1, 2', 10)).toEqual([1, 2]);
	});

	it('ignores page numbers above maxPages', () => {
		expect(parsePageRangeHelper('9, 10, 11', 10)).toEqual([9, 10]);
	});

	it('returns sorted results', () => {
		expect(parsePageRangeHelper('5, 3, 1', 10)).toEqual([1, 3, 5]);
	});
});

describe('getUserFriendlyError', () => {
	it('returns password message for "password" in error', () => {
		const msg = getUserFriendlyError(new Error('password required'));
		expect(msg).toContain('password');
	});

	it('returns incorrect password message when "incorrect" present', () => {
		const msg = getUserFriendlyError(new Error('incorrect password'));
		expect(msg).toContain('Incorrect password');
	});

	it('returns corrupted/PDF message for "not a pdf"', () => {
		const msg = getUserFriendlyError(new Error('not a pdf'));
		expect(msg.toLowerCase()).toMatch(/corrupt|valid pdf/);
	});

	it('returns page range message for "page range"', () => {
		const msg = getUserFriendlyError(new Error('page range invalid'));
		expect(msg.toLowerCase()).toContain('page range');
	});

	it('returns too large message for "out of memory"', () => {
		const msg = getUserFriendlyError(new Error('out of memory'));
		expect(msg.toLowerCase()).toContain('too large');
	});

	it('returns compression engine message for "ghostscript failed"', () => {
		const msg = getUserFriendlyError(new Error('ghostscript failed'));
		expect(msg.toLowerCase()).toContain('compression engine');
	});

	it('returns a fallback string for unknown error — does not throw', () => {
		expect(() => getUserFriendlyError(new Error('something totally unexpected 🤔'))).not.toThrow();
		const msg = getUserFriendlyError(new Error('something totally unexpected 🤔'));
		expect(msg).toBeTypeOf('string');
		expect(msg.length).toBeGreaterThan(0);
	});

	it('handles non-Error objects gracefully', () => {
		expect(() => getUserFriendlyError({ message: 'ghostscript crash' })).not.toThrow();
		const msg = getUserFriendlyError({ message: 'ghostscript crash' });
		expect(msg).toContain('Compression engine');
	});

	it('handles string errors', () => {
		const msg = getUserFriendlyError('password wrong');
		expect(msg).toContain('password');
	});
});
