import { describe, it, expect } from 'vitest';
import { sniffFormat, detectImageFormat, readJpegOrientation } from './detect-format';

const bytes = (...parts: (string | number[])[]) =>
	new Uint8Array(
		parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p))
	);

describe('sniffFormat', () => {
	it('identifies formats by magic bytes', () => {
		expect(sniffFormat(bytes([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
		expect(sniffFormat(bytes([0x89], 'PNG\r\n\x1a\n'))).toBe('png');
		expect(sniffFormat(bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 '))).toBe('webp');
		expect(sniffFormat(bytes([0, 0, 0, 0x1c], 'ftypavif'))).toBe('avif');
		expect(sniffFormat(bytes([0, 0, 0, 0x18], 'ftypheic'))).toBe('heic');
		expect(sniffFormat(bytes([0xff, 0x0a, 0x00]))).toBe('jxl');
		expect(
			sniffFormat(bytes('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"/>'))
		).toBe('svg');
	});

	it('rejects everything else', () => {
		expect(sniffFormat(bytes('hello world, definitely not an image'))).toBeNull();
		expect(sniffFormat(bytes('GIF89a', [0, 0, 0, 0, 0, 0]))).toBeNull();
		expect(sniffFormat(bytes([0, 0, 0, 0x18], 'ftypmp42'))).toBeNull();
	});
});

describe('detectImageFormat', () => {
	it('trusts content over a wrong extension or empty MIME type', async () => {
		const jpeg = new File([bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0])], 'photo.png', {
			type: 'image/png',
		});
		expect(await detectImageFormat(jpeg)).toBe('jpeg');
		const heic = new File([bytes([0, 0, 0, 0x18], 'ftypheic', [0, 0, 0, 0])], 'IMG_1.HEIC');
		expect(await detectImageFormat(heic)).toBe('heic');
	});

	it('rejects empty and non-image files', async () => {
		expect(await detectImageFormat(new File([], 'empty.png', { type: 'image/png' }))).toBeNull();
		expect(
			await detectImageFormat(
				new File([bytes('nope nope nope nope')], 'a.jpg', { type: 'image/jpeg' })
			)
		).toBeNull();
	});
});

describe('readJpegOrientation', () => {
	const jpegWithOrientation = (value: number) => {
		const tiff = [
			0x49,
			0x49,
			0x2a,
			0,
			8,
			0,
			0,
			0,
			1,
			0,
			0x12,
			0x01,
			3,
			0,
			1,
			0,
			0,
			0,
			value,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
		];
		const exif = [...'Exif\0\0'].map((c) => c.charCodeAt(0)).concat(tiff);
		const len = exif.length + 2;
		return bytes([0xff, 0xd8, 0xff, 0xe1, len >> 8, len & 255], exif, [0xff, 0xd9]).buffer;
	};

	it('reads the EXIF orientation tag', () => {
		expect(readJpegOrientation(jpegWithOrientation(6))).toBe(6);
		expect(readJpegOrientation(jpegWithOrientation(8))).toBe(8);
	});

	it('defaults to 1 without EXIF', () => {
		expect(readJpegOrientation(bytes([0xff, 0xd8, 0xff, 0xd9]).buffer)).toBe(1);
		expect(readJpegOrientation(bytes('not a jpeg').buffer)).toBe(1);
	});
});
