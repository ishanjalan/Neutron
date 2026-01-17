/**
 * Unit tests for format utilities
 * Run with: pnpm test:unit
 */

import { describe, it, expect } from 'vitest';
import { formatBytes, formatPercent, formatDuration } from '@neutron/utils';

describe('formatBytes', () => {
	it('should format bytes correctly', () => {
		expect(formatBytes(0)).toBe('0 B');
		expect(formatBytes(500)).toBe('500 B');
	});

	it('should format kilobytes correctly', () => {
		expect(formatBytes(1024)).toBe('1 KB');
		expect(formatBytes(1536)).toBe('1.5 KB');
	});

	it('should format megabytes correctly', () => {
		expect(formatBytes(1024 * 1024)).toBe('1 MB');
		expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
	});

	it('should format gigabytes correctly', () => {
		expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
		expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
	});
});

describe('formatPercent', () => {
	it('should format percentages correctly', () => {
		expect(formatPercent(0)).toBe('0%');
		expect(formatPercent(50)).toBe('50%');
		expect(formatPercent(100)).toBe('100%');
	});

	it('should handle decimals by rounding', () => {
		expect(formatPercent(33.333)).toBe('33%');
		expect(formatPercent(66.666)).toBe('67%');
	});
});

describe('formatDuration', () => {
	it('should format milliseconds correctly', () => {
		expect(formatDuration(0)).toBe('0ms');
		expect(formatDuration(500)).toBe('500ms');
		expect(formatDuration(999)).toBe('999ms');
	});

	it('should format seconds correctly', () => {
		expect(formatDuration(1000)).toBe('1.0s');
		expect(formatDuration(5000)).toBe('5.0s');
		expect(formatDuration(30000)).toBe('30.0s');
	});

	it('should format minutes correctly', () => {
		expect(formatDuration(60000)).toBe('1m 0s');
		expect(formatDuration(90000)).toBe('1m 30s');
		expect(formatDuration(125000)).toBe('2m 5s');
	});
});
