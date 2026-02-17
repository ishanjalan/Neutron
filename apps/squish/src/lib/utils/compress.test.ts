import { describe, it, expect } from 'vitest';
import { getOutputFilename, getOutputExtension } from './compress';

describe('compress utils', () => {
	describe('getOutputExtension', () => {
		it('should return correct extension for each format', () => {
			expect(getOutputExtension('jpeg')).toBe('.jpg');
			expect(getOutputExtension('png')).toBe('.png');
			expect(getOutputExtension('webp')).toBe('.webp');
			expect(getOutputExtension('avif')).toBe('.avif');
			expect(getOutputExtension('jxl')).toBe('.jxl');
			expect(getOutputExtension('svg')).toBe('.svg');
		});
	});

	describe('getOutputFilename', () => {
		it('should apply default template correctly', () => {
			const result = getOutputFilename('photo.jpg', 'webp');
			expect(result).toBe('photo-optimized.webp');
		});

		it('should apply custom template with name token', () => {
			const result = getOutputFilename('image.png', 'jpeg', '{name}-compressed.{ext}');
			expect(result).toBe('image-compressed.jpg');
		});

		it('should handle filenames without extensions', () => {
			const result = getOutputFilename('photo', 'webp', '{name}.{ext}');
			expect(result).toBe('photo.webp');
		});

		it('should handle complex filenames', () => {
			const result = getOutputFilename('my.photo.v2.jpg', 'webp', '{name}@2x.{ext}');
			expect(result).toBe('my.photo.v2@2x.webp');
		});

		it('should strip extension correctly for SVG', () => {
			const result = getOutputFilename('icon.svg', 'svg', '{name}-min.{ext}');
			expect(result).toBe('icon-min.svg');
		});
	});
});
