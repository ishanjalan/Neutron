import { describe, it, expect } from 'vitest';
import { detectSvgEmbeddedRaster } from './svg-analyze';

function makeFile(content: string): File {
	return {
		text: () => Promise.resolve(content),
	} as unknown as File;
}

function makeFailingFile(): File {
	return {
		text: () => Promise.reject(new Error('read error')),
	} as unknown as File;
}

describe('detectSvgEmbeddedRaster', () => {
	it('returns false for clean SVG with no images', async () => {
		const svg = '<svg><rect width="100" height="100"/></svg>';
		expect(await detectSvgEmbeddedRaster(makeFile(svg))).toBe(false);
	});

	it('returns true for data:image/png base64 href', async () => {
		const svg = '<svg><image href="data:image/png;base64,abc123"/></svg>';
		expect(await detectSvgEmbeddedRaster(makeFile(svg))).toBe(true);
	});

	it('returns true for data:image/jpeg xlink:href', async () => {
		const svg = '<svg><image xlink:href="data:image/jpeg;base64,abc123"/></svg>';
		expect(await detectSvgEmbeddedRaster(makeFile(svg))).toBe(true);
	});

	it('returns true for https external image URL', async () => {
		const svg = '<svg><image href="https://example.com/photo.jpg"/></svg>';
		expect(await detectSvgEmbeddedRaster(makeFile(svg))).toBe(true);
	});

	it('returns true for http external image URL', async () => {
		const svg = '<svg><image href="http://example.com/photo.png"/></svg>';
		expect(await detectSvgEmbeddedRaster(makeFile(svg))).toBe(true);
	});

	it('returns false for relative SVG href (not a raster URL)', async () => {
		const svg = '<svg><image href="icon.svg"/></svg>';
		expect(await detectSvgEmbeddedRaster(makeFile(svg))).toBe(false);
	});

	it('returns false when file.text() throws', async () => {
		expect(await detectSvgEmbeddedRaster(makeFailingFile())).toBe(false);
	});

	it('is case-insensitive on the <image> tag match', async () => {
		const svg = '<svg><IMAGE HREF="data:image/webp;base64,abc"/></svg>';
		expect(await detectSvgEmbeddedRaster(makeFile(svg))).toBe(true);
	});
});
