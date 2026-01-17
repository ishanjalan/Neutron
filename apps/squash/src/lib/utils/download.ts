import JSZip from 'jszip';
import { getOutputFilename } from './compress';
import type { VideoItem } from '$lib/stores/videos.svelte';

export function downloadVideo(item: VideoItem) {
	if (!item.compressedBlob) return;

	const filename = getOutputFilename(item.name, item.outputFormat);
	const url = URL.createObjectURL(item.compressedBlob);
	
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	
	URL.revokeObjectURL(url);
}

export async function downloadAllAsZip(items: VideoItem[]) {
	const zip = new JSZip();
	
	for (const item of items) {
		if (item.compressedBlob) {
			const filename = getOutputFilename(item.name, item.outputFormat);
			zip.file(filename, item.compressedBlob);
		}
	}
	
	const blob = await zip.generateAsync({ type: 'blob' });
	const url = URL.createObjectURL(blob);
	
	const a = document.createElement('a');
	a.href = url;
	a.download = `squash-videos-${Date.now()}.zip`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	
	URL.revokeObjectURL(url);
}
