// Scan SVG text for embedded bitmap images (data: URLs or external http/https URLs in <image>
// elements). Covers common Figma/Sketch/Illustrator export patterns where raster content is
// wrapped inside an SVG file, giving none of the vector benefits.
export async function detectSvgEmbeddedRaster(file: File): Promise<boolean> {
	try {
		const text = await file.text();
		// Match <image ...> elements with data:image/ or http(s):// src
		return /<image[^>]+(href|xlink:href)\s*=\s*["'](data:image\/|https?:\/\/)/i.test(text);
	} catch {
		return false;
	}
}
