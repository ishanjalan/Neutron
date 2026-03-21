import { describe, it, expect } from 'vitest';
import { formatDuration, formatETA, formatTimeInput, parseTimeInput } from './format';

describe('formatDuration', () => {
	it('formats 0 seconds', () => {
		expect(formatDuration(0)).toBe('0:00');
	});

	it('formats 30 seconds', () => {
		expect(formatDuration(30)).toBe('0:30');
	});

	it('formats 60 seconds as 1:00', () => {
		expect(formatDuration(60)).toBe('1:00');
	});

	it('formats 90 seconds as 1:30', () => {
		expect(formatDuration(90)).toBe('1:30');
	});

	it('formats 3661 seconds as 61:01', () => {
		expect(formatDuration(3661)).toBe('61:01');
	});
});

describe('formatETA', () => {
	it('formats under 60s as seconds only', () => {
		expect(formatETA(45)).toBe('45s');
	});

	it('formats 60s as 1m 0s', () => {
		expect(formatETA(60)).toBe('1m 0s');
	});

	it('formats 90s as 1m 30s', () => {
		expect(formatETA(90)).toBe('1m 30s');
	});
});

describe('formatTimeInput', () => {
	it('produces same output as formatDuration for equivalent inputs', () => {
		for (const s of [0, 30, 60, 90, 3661]) {
			expect(formatTimeInput(s)).toBe(formatDuration(s));
		}
	});
});

describe('parseTimeInput', () => {
	it('parses MM:SS format', () => {
		expect(parseTimeInput('1:30')).toBe(90);
	});

	it('parses 0:45', () => {
		expect(parseTimeInput('0:45')).toBe(45);
	});

	it('parses raw seconds as integer', () => {
		expect(parseTimeInput('90')).toBe(90);
	});

	it('parses decimal seconds', () => {
		expect(parseTimeInput('1.5')).toBe(1.5);
	});

	it('returns null for non-numeric string', () => {
		expect(parseTimeInput('invalid')).toBeNull();
	});

	it('handles too-many-colons by returning the leading number (parseFloat behavior)', () => {
		// '1:2:3' has 3 parts — MM:SS branch is skipped; parseFloat('1:2:3') = 1
		expect(parseTimeInput('1:2:3')).toBe(1);
	});
});
