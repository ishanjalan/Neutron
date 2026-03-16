import type { PDFItem } from '$lib/stores/pdfs.svelte';
import { getOutputFilename } from './pdf';
import {
	downloadBlob,
	downloadAllAsZip as downloadAllAsZipGeneric,
	downloadMultipleFiles as downloadMultipleFilesGeneric,
} from '@neutron/utils';

export function downloadPDF(item: PDFItem) {
	if (!item.processedBlob) return;
	downloadBlob(item.processedBlob, getOutputFilename(item.name, 'compress'));
}

/**
 * Download all completed items -- single file direct download, multiple files as ZIP
 */
export async function downloadAll(items: PDFItem[], tool: string) {
	const completedItems = items.filter(
		(i) => i.status === 'completed' && (i.processedBlob || i.processedBlobs)
	);

	if (completedItems.length === 0) return;

	if (completedItems.length === 1) {
		const item = completedItems[0];
		if (item.processedBlob) {
			downloadBlob(item.processedBlob, getOutputFilename(item.name, tool));
		} else if (item.processedBlobs) {
			await downloadMultipleFiles(
				item.processedBlobs,
				item.name.replace(/\.[^/.]+$/, ''),
				tool === 'pdf-to-images' ? '.png' : '.pdf'
			);
		}
		return;
	}

	await downloadAllAsZip(completedItems, tool);
}

export async function downloadAllAsZip(items: PDFItem[], tool: string) {
	const files: { name: string; blob: Blob }[] = [];

	for (const item of items) {
		if (item.processedBlob) {
			files.push({ name: getOutputFilename(item.name, tool), blob: item.processedBlob });
		}
		if (item.processedBlobs) {
			const extension = tool === 'pdf-to-images' ? '.png' : '.pdf';
			for (let i = 0; i < item.processedBlobs.length; i++) {
				files.push({
					name: getOutputFilename(item.name, tool, i) + extension,
					blob: item.processedBlobs[i],
				});
			}
		}
	}

	await downloadAllAsZipGeneric(files, `smash-${tool}-${Date.now()}.zip`);
}

export async function downloadMultipleFiles(blobs: Blob[], baseName: string, extension: string) {
	await downloadMultipleFilesGeneric(blobs, baseName, extension);
}
