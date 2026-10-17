/** What Squash can read as input. AVI is deliberately absent — browsers can't decode it. */
export const SUPPORTED_VIDEO_LABEL = 'MP4, WebM, MOV or MKV';

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
