import { describe, it, expect } from 'vitest';
import { getOutputFilename } from '@neutron/utils';

describe('getOutputFilename', () => {
	it('adds default processed suffix', () => {
		expect(getOutputFilename('photo.jpg')).toBe('photo-processed.jpg');
	});

	it('uses custom suffix', () => {
		expect(getOutputFilename('photo.jpg', { suffix: 'compressed' })).toBe('photo-compressed.jpg');
	});

	it('uses custom extension', () => {
		expect(getOutputFilename('photo.jpg', { extension: 'webp' })).toBe('photo-processed.webp');
	});

	it('strips leading dot from extension', () => {
		expect(getOutputFilename('photo.jpg', { extension: '.webp' })).toBe('photo-processed.webp');
	});

	it('applies template with {name} and {ext} tokens', () => {
		expect(getOutputFilename('photo.jpg', { template: '{name}-small.{ext}' })).toBe(
			'photo-small.jpg'
		);
	});

	it('applies template with custom extension', () => {
		expect(
			getOutputFilename('photo.jpg', { template: '{name}-optimized.{ext}', extension: 'png' })
		).toBe('photo-optimized.png');
	});

	it('handles file with no extension', () => {
		expect(getOutputFilename('nodotfile')).toBe('nodotfile-processed');
	});

	it('handles multiple dots — only last is treated as extension', () => {
		expect(getOutputFilename('my.photo.backup.jpg')).toBe('my.photo.backup-processed.jpg');
	});

	it('uses suffix and extension together', () => {
		expect(getOutputFilename('photo.jpg', { suffix: 'compressed', extension: 'webp' })).toBe(
			'photo-compressed.webp'
		);
	});
});
