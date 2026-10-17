import { describe, it, expect } from 'vitest';
import { isGifFile } from './files';

const bytes = (s: string, pad = 20) =>
	new Uint8Array([...s].map((c) => c.charCodeAt(0)).concat(new Array(pad).fill(0)));

describe('isGifFile', () => {
	it('accepts GIF87a and GIF89a content regardless of name or type', async () => {
		expect(await isGifFile(new File([bytes('GIF89a')], 'x.png', { type: 'image/png' }))).toBe(true);
		expect(await isGifFile(new File([bytes('GIF87a')], 'x.gif'))).toBe(true);
	});

	it('rejects other formats, empty and truncated files', async () => {
		expect(
			await isGifFile(new File([bytes('\x89PNG\r\n\x1a\n')], 'x.gif', { type: 'image/gif' }))
		).toBe(false);
		expect(await isGifFile(new File([], 'empty.gif'))).toBe(false);
		expect(await isGifFile(new File([bytes('GIF89a', 0)], 'short.gif'))).toBe(false);
	});
});
