/** What Squash can read as input. AVI is deliberately absent — browsers can't decode it. */
export const SUPPORTED_VIDEO_LABEL = 'MP4, WebM, MOV or MKV';

const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
const VIDEO_EXTENSIONS = ['mp4', 'm4v', 'webm', 'mov', 'mkv'];

/**
 * Whether Squash can read this file. MIME type first, then extension (browsers often
 * report MKV with an empty or generic type). Deliberately not "any video/*" — AVI is
 * `video/x-msvideo` and can't be decoded.
 */
export function isSupportedVideo(file: { name: string; type: string }): boolean {
	const ext = file.name.toLowerCase().split('.').pop() ?? '';
	return VIDEO_MIME_TYPES.includes(file.type) || VIDEO_EXTENSIONS.includes(ext);
}

const isAvi = (name: string) => /\.avi$/i.test(name);

/** User-facing explanation for files that were dropped but not added. */
export function rejectionMessage(files: { name: string }[]): string {
	if (files.length === 1) {
		const { name } = files[0];
		return isAvi(name)
			? `${name} is an AVI file, which browsers can’t decode. Convert it to MP4 first.`
			: `${name} isn’t a supported video. Use ${SUPPORTED_VIDEO_LABEL}.`;
	}
	if (files.every((f) => isAvi(f.name))) {
		return `${files.length} AVI files weren’t added — browsers can’t decode AVI. Convert them to MP4 first.`;
	}
	return `${files.length} files weren’t added — only ${SUPPORTED_VIDEO_LABEL} videos are supported.`;
}
