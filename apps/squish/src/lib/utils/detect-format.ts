import type { ImageFormat } from '$lib/stores/images.svelte';

const EXTENSION_FORMATS: Record<string, ImageFormat> = {
	jpg: 'jpeg',
	jpeg: 'jpeg',
	png: 'png',
	webp: 'webp',
	avif: 'avif',
	jxl: 'jxl',
	svg: 'svg',
	heic: 'heic',
	heif: 'heic',
};

const ascii = (b: Uint8Array, from: number, to: number) =>
	String.fromCharCode(...b.slice(from, to));

/** Identify an image by its first bytes. Returns null when the content isn't a supported image. */
export function sniffFormat(head: Uint8Array): ImageFormat | null {
	if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'jpeg';
	if (head.length >= 8 && head[0] === 0x89 && ascii(head, 1, 4) === 'PNG') return 'png';
	if (head.length >= 12 && ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 12) === 'WEBP')
		return 'webp';
	// JPEG XL: bare codestream (FF 0A) or ISO-BMFF container
	if (head.length >= 2 && head[0] === 0xff && head[1] === 0x0a) return 'jxl';
	if (head.length >= 12 && head[3] === 0x0c && ascii(head, 4, 8) === 'JXL ') return 'jxl';
	if (head.length >= 12 && ascii(head, 4, 8) === 'ftyp') {
		const brand = ascii(head, 8, 12);
		if (brand === 'avif' || brand === 'avis') return 'avif';
		if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand))
			return 'heic';
		return null;
	}
	const text = ascii(head, 0, Math.min(head.length, 512))
		.replace(/^\u00EF\u00BB\u00BF/, '') // UTF-8 BOM, read byte-wise
		.trimStart();
	if (/^(<\?xml[\s\S]*?)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[\s\S]*?>\s*)?<svg[\s>]/i.test(text)) {
		return 'svg';
	}
	return null;
}

/**
 * Work out what a file really is. File contents win over the MIME type and extension, which
 * are often empty (.heic/.jxl on Windows and Linux) or simply wrong (a JPEG named .png).
 */
export async function detectImageFormat(file: File): Promise<ImageFormat | null> {
	if (file.size === 0) return null;
	const head = new Uint8Array(await file.slice(0, 512).arrayBuffer());
	const sniffed = sniffFormat(head);
	if (sniffed) return sniffed;
	// SVGs can start with a long comment/prolog; trust a matching declared type for those only
	const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
	if (file.type === 'image/svg+xml' || ext === 'svg') {
		const text = await file.text();
		return /<svg[\s>]/i.test(text) ? 'svg' : null;
	}
	return null;
}

export function isKnownImageExtension(name: string): boolean {
	return (name.split('.').pop()?.toLowerCase() ?? '') in EXTENSION_FORMATS;
}

/** EXIF orientation (1–8) of a JPEG, or 1 when absent/unreadable. */
export function readJpegOrientation(buffer: ArrayBuffer): number {
	const view = new DataView(buffer);
	if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return 1;
	let offset = 2;
	while (offset + 4 <= view.byteLength) {
		if (view.getUint8(offset) !== 0xff) return 1;
		const marker = view.getUint8(offset + 1);
		if (marker === 0xda || marker === 0xd9) return 1; // start of scan / end: no EXIF after this
		const size = view.getUint16(offset + 2);
		if (
			marker === 0xe1 &&
			offset + 10 <= view.byteLength &&
			view.getUint32(offset + 4) === 0x45786966
		) {
			const tiff = offset + 10;
			if (tiff + 8 > view.byteLength) return 1;
			const little = view.getUint16(tiff) === 0x4949;
			const ifd = tiff + view.getUint32(tiff + 4, little);
			if (ifd + 2 > view.byteLength) return 1;
			const entries = view.getUint16(ifd, little);
			for (let i = 0; i < entries; i++) {
				const entry = ifd + 2 + i * 12;
				if (entry + 12 > view.byteLength) return 1;
				if (view.getUint16(entry, little) === 0x0112) {
					const value = view.getUint16(entry + 8, little);
					return value >= 1 && value <= 8 ? value : 1;
				}
			}
			return 1;
		}
		offset += 2 + size;
	}
	return 1;
}
