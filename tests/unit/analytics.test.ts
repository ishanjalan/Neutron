import { describe, it, expect } from 'vitest';
import { classifyFailure, eventRoute } from '@neutron/utils/analytics';

describe('classifyFailure', () => {
	it('buckets messages without returning them', () => {
		expect(classifyFailure('Incorrect password. Please try again.')).toBe('password');
		expect(classifyFailure('Image too large for browser memory.')).toBe('memory');
		expect(classifyFailure(new Error('WebCodecs not supported'))).toBe('unsupported');
		expect(classifyFailure('Network error loading image')).toBe('network');
		expect(classifyFailure('Need at least 2 PDFs to merge')).toBe('invalid-input');
		expect(classifyFailure('holiday-photos-private.pdf exploded')).toBe('other');
		expect(classifyFailure(undefined)).toBe('other');
	});
});

describe('eventRoute', () => {
	it('keeps plain paths and drops anything odd', () => {
		expect(eventRoute('/')).toBe('home');
		expect(eventRoute('/Smash/compress/')).toBe('Smash/compress');
		expect(eventRoute('/Smash/some file.pdf')).toBe('other');
		expect(eventRoute('/' + 'a'.repeat(80))).toBe('other');
	});
});
