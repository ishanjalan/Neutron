import { getOutputFilename } from './compress';
import type { VideoItem } from '$lib/stores/videos.svelte';
import { downloadBlob, downloadAllAsZip as downloadAllAsZipGeneric } from '@neutron/utils';

export function downloadVideo(item: VideoItem) {
	if (!item.compressedBlob) return;
	downloadBlob(item.compressedBlob, getOutputFilename(item.name, item.outputFormat));
}

export async function downloadAllAsZip(items: VideoItem[]) {
	const files = items
		.filter((item) => item.compressedBlob)
		.map((item) => ({
			name: getOutputFilename(item.name, item.outputFormat),
			blob: item.compressedBlob!,
		}));
	await downloadAllAsZipGeneric(files, `squash-videos-${Date.now()}.zip`);
}
