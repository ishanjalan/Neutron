import JSZip from 'jszip';
import type { PDFItem } from '$lib/stores/pdfs.svelte';
import { getOutputFilename } from './pdf';

export function downloadPDF(item: PDFItem) {
	if (!item.processedBlob) return;

	const filename = getOutputFilename(item.name, 'compress');
	const url = URL.createObjectURL(item.processedBlob);
	
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	
	URL.revokeObjectURL(url);
}

/**
 * Download all completed items - single file direct download, multiple files as ZIP
 */
export async function downloadAll(items: PDFItem[], tool: string) {
	const completedItems = items.filter(
		i => i.status === 'completed' && (i.processedBlob || i.processedBlobs)
	);
	
	if (completedItems.length === 0) return;
	
	// Single item - direct download
	if (completedItems.length === 1) {
		const item = completedItems[0];
		if (item.processedBlob) {
			const filename = getOutputFilename(item.name, tool);
			const url = URL.createObjectURL(item.processedBlob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} else if (item.processedBlobs) {
			await downloadMultipleFiles(
				item.processedBlobs, 
				item.name.replace(/\.[^/.]+$/, ''),
				tool === 'pdf-to-images' ? '.png' : '.pdf'
			);
		}
		return;
	}
	
	// Multiple items - download as ZIP
	await downloadAllAsZip(completedItems, tool);
}

export async function downloadAllAsZip(items: PDFItem[], tool: string) {
	const zip = new JSZip();
	
	for (const item of items) {
		if (item.processedBlob) {
			const filename = getOutputFilename(item.name, tool);
			zip.file(filename, item.processedBlob);
		}
		
		// Handle multiple outputs (split, pdf-to-images)
		if (item.processedBlobs) {
			const extension = tool === 'pdf-to-images' ? '.png' : '.pdf';
			for (let i = 0; i < item.processedBlobs.length; i++) {
				const filename = getOutputFilename(item.name, tool, i) + extension;
				zip.file(filename, item.processedBlobs[i]);
			}
		}
	}
	
	const blob = await zip.generateAsync({ type: 'blob' });
	const url = URL.createObjectURL(blob);
	
	const a = document.createElement('a');
	a.href = url;
	a.download = `smash-${tool}-${Date.now()}.zip`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	
	URL.revokeObjectURL(url);
}

export async function downloadMultipleFiles(blobs: Blob[], baseName: string, extension: string) {
	if (blobs.length === 1) {
		// Single file - direct download
		const url = URL.createObjectURL(blobs[0]);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${baseName}${extension}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	} else {
		// Multiple files - zip them
		const zip = new JSZip();
		for (let i = 0; i < blobs.length; i++) {
			zip.file(`${baseName}-${i + 1}${extension}`, blobs[i]);
		}
		
		const zipBlob = await zip.generateAsync({ type: 'blob' });
		const url = URL.createObjectURL(zipBlob);
		
		const a = document.createElement('a');
		a.href = url;
		a.download = `${baseName}.zip`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
}
