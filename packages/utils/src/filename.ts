/**
 * Generate an output filename from an original filename.
 *
 * @param originalName - Original file name (e.g., "photo.jpg")
 * @param opts.suffix  - Suffix to append before the extension (e.g., "compressed" → "photo-compressed.webp")
 * @param opts.extension - New extension, with or without leading dot (e.g., "webp" or ".webp")
 * @param opts.template - Template string using {name}, {suffix}, {ext} tokens
 *
 * @example
 * getOutputFilename('photo.jpg', { suffix: 'compressed', extension: 'webp' })
 * // → "photo-compressed.webp"
 *
 * getOutputFilename('photo.jpg', { template: '{name}-optimized.{ext}', extension: 'png' })
 * // → "photo-optimized.png"
 *
 * getOutputFilename('photo.jpg')
 * // → "photo-processed.jpg"
 */
export function getOutputFilename(
	originalName: string,
	opts?: {
		suffix?: string;
		extension?: string;
		template?: string;
	}
): string {
	const dotIndex = originalName.lastIndexOf('.');
	const baseName = dotIndex >= 0 ? originalName.slice(0, dotIndex) : originalName;
	const originalExt = dotIndex >= 0 ? originalName.slice(dotIndex + 1) : '';

	const ext = opts?.extension
		? opts.extension.replace(/^\./, '') // strip leading dot if present
		: originalExt;

	if (opts?.template) {
		return opts.template
			.replace('{name}', baseName)
			.replace('{suffix}', opts.suffix ?? '')
			.replace('{ext}', ext);
	}

	const suffix = opts?.suffix ?? 'processed';
	return `${baseName}-${suffix}${ext ? '.' + ext : ''}`;
}
