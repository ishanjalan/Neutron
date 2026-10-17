import { describe, it, expect, afterEach, vi } from 'vitest';
import { detectLocale } from '../../packages/utils/src/seo';

function withLanguage(language: string) {
	vi.stubGlobal('navigator', { language });
}

afterEach(() => vi.unstubAllGlobals());

describe('detectLocale', () => {
	it.each([
		['ar-SA', 'ar'],
		['ar', 'ar'],
		['id-ID', 'id'],
		['id', 'id'],
		['in', 'id'], // legacy Indonesian code
		['fr-CA', 'fr'],
		['uk-UA', 'uk'],
	])('maps %s to %s', (browser, expected) => {
		withLanguage(browser);
		expect(detectLocale()).toBe(expected);
	});

	it('falls back to English for unsupported languages', () => {
		withLanguage('ja-JP');
		expect(detectLocale()).toBe('en');
	});

	it('returns English when there is no navigator', () => {
		vi.stubGlobal('navigator', undefined);
		expect(detectLocale()).toBe('en');
	});
});
