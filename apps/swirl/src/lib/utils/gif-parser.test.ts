import { describe, it, expect } from 'vitest';
import { parseGifMetadata } from './gif-parser';

// ── GIF buffer builders ───────────────────────────────────────────────────────

/** Minimal static GIF (1 frame, no global color table, empty image data). */
function makeStaticGif(width: number, height: number, version: '89a' | '87a' = '89a'): ArrayBuffer {
	const versionBytes =
		version === '89a'
			? [0x38, 0x39, 0x61] // '89a'
			: [0x38, 0x37, 0x61]; // '87a'

	return new Uint8Array([
		// Header: "GIF" + version
		0x47,
		0x49,
		0x46,
		...versionBytes,
		// Logical Screen Descriptor
		width & 0xff,
		(width >> 8) & 0xff, // width (little-endian)
		height & 0xff,
		(height >> 8) & 0xff, // height (little-endian)
		0x00, // packed: no global color table
		0x00, // background color index
		0x00, // pixel aspect ratio
		// Image Descriptor
		0x2c, // separator
		0x00,
		0x00, // left = 0
		0x00,
		0x00, // top = 0
		width & 0xff,
		(width >> 8) & 0xff, // width
		height & 0xff,
		(height >> 8) & 0xff, // height
		0x00, // packed: no local color table
		// LZW data
		0x02, // LZW minimum code size
		0x00, // block terminator (empty)
		// GIF Trailer
		0x3b,
	]).buffer;
}

/**
 * Animated GIF with N frames, each preceded by a Graphics Control Extension
 * with the specified delay (in centiseconds).
 */
function makeAnimatedGif(width: number, height: number, delaysCs: number[]): ArrayBuffer {
	const bytes: number[] = [
		// Header: GIF89a
		0x47,
		0x49,
		0x46,
		0x38,
		0x39,
		0x61,
		// Logical Screen Descriptor
		width & 0xff,
		(width >> 8) & 0xff,
		height & 0xff,
		(height >> 8) & 0xff,
		0x00,
		0x00,
		0x00, // packed, bg, aspect
	];

	for (const delayCs of delaysCs) {
		// Graphics Control Extension
		bytes.push(
			0x21,
			0xf9, // ext introducer + GCE label
			0x04, // block size
			0x00, // packed
			delayCs & 0xff,
			(delayCs >> 8) & 0xff, // delay in centiseconds
			0x00, // transparent color index
			0x00 // block terminator
		);
		// Image Descriptor
		bytes.push(
			0x2c,
			0x00,
			0x00,
			0x00,
			0x00, // left, top
			width & 0xff,
			(width >> 8) & 0xff,
			height & 0xff,
			(height >> 8) & 0xff,
			0x00, // packed: no local color table
			0x02, // LZW minimum code size
			0x00 // block terminator
		);
	}

	bytes.push(0x3b); // GIF Trailer
	return new Uint8Array(bytes).buffer;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('parseGifMetadata — static GIF89a', () => {
	it('parses width and height', async () => {
		const buf = makeStaticGif(10, 10);
		const meta = await parseGifMetadata(buf);
		expect(meta.width).toBe(10);
		expect(meta.height).toBe(10);
	});

	it('reports 1 frame', async () => {
		const buf = makeStaticGif(10, 10);
		const meta = await parseGifMetadata(buf);
		expect(meta.frameCount).toBe(1);
	});

	it('reports hasGlobalColorTable = false', async () => {
		const buf = makeStaticGif(10, 10);
		const meta = await parseGifMetadata(buf);
		expect(meta.hasGlobalColorTable).toBe(false);
	});
});

describe('parseGifMetadata — GIF87a', () => {
	it('accepts GIF87a signature', async () => {
		const buf = makeStaticGif(8, 8, '87a');
		const meta = await parseGifMetadata(buf);
		expect(meta.width).toBe(8);
		expect(meta.frameCount).toBe(1);
	});
});

describe('parseGifMetadata — animated GIF', () => {
	it('reports correct frame count', async () => {
		const buf = makeAnimatedGif(10, 10, [10, 20, 30]);
		const meta = await parseGifMetadata(buf);
		expect(meta.frameCount).toBe(3);
	});

	it('reads per-frame delays in ms', async () => {
		const buf = makeAnimatedGif(10, 10, [10, 20, 30]);
		const meta = await parseGifMetadata(buf);
		// delays are in ms: 10cs = 100ms, 20cs = 200ms, 30cs = 300ms
		expect(meta.delays).toEqual([100, 200, 300]);
	});

	it('computes total duration from delays', async () => {
		const buf = makeAnimatedGif(10, 10, [10, 20, 30]);
		const meta = await parseGifMetadata(buf);
		// 100 + 200 + 300 = 600ms = 0.6s
		expect(meta.duration).toBeCloseTo(0.6, 5);
	});
});

describe('parseGifMetadata — corrupted buffer', () => {
	it('throws for wrong signature', async () => {
		const bad = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]).buffer;
		await expect(parseGifMetadata(bad)).rejects.toThrow('Invalid GIF file');
	});

	it('throws for "PNG" signature', async () => {
		// PNG header starts with 0x89 0x50 0x4E 0x47 ...
		const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]).buffer;
		await expect(parseGifMetadata(pngHeader)).rejects.toThrow('Invalid GIF file');
	});
});
