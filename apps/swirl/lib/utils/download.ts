/**
 * Download utilities for Swirl
 * Handles single file and batch ZIP downloads
 */

import JSZip from 'jszip';

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Interface for items that can be downloaded
 */
export interface DownloadableItem {
	name: string;
	blob: Blob;
}

/**
 * Download multiple files as a ZIP
 */
export async function downloadAllAsZip(
	items: DownloadableItem[],
	zipFilename?: string
): Promise<void> {
	if (items.length === 0) return;

	const zip = new JSZip();

	// Track filenames to avoid duplicates
	const usedNames = new Map<string, number>();

	for (const item of items) {
		let filename = item.name;

		// Handle duplicate filenames
		const count = usedNames.get(filename) || 0;
		if (count > 0) {
			const ext = filename.lastIndexOf('.');
			if (ext > 0) {
				filename = `${filename.slice(0, ext)}-${count}${filename.slice(ext)}`;
			} else {
				filename = `${filename}-${count}`;
			}
		}
		usedNames.set(item.name, count + 1);

		zip.file(filename, item.blob);
	}

	const content = await zip.generateAsync({ type: 'blob' });
	downloadBlob(content, zipFilename || `swirl-output-${Date.now()}.zip`);
}

/**
 * Get output filename for a processed GIF
 */
export function getOutputFilename(originalName: string, suffix?: string): string {
	const baseName = originalName.replace(/\.[^/.]+$/, '');
	const extension = '.gif';
	
	if (suffix) {
		return `${baseName}-${suffix}${extension}`;
	}
	return `${baseName}-processed${extension}`;
}

/**
 * Copy a blob to clipboard
 * Returns true if successful, false if not supported
 */
export async function copyBlobToClipboard(blob: Blob): Promise<boolean> {
	try {
		// Check if clipboard API is available
		if (!navigator.clipboard || !navigator.clipboard.write) {
			return false;
		}

		// Create a ClipboardItem with the blob
		const clipboardItem = new ClipboardItem({
			[blob.type]: blob
		});

		await navigator.clipboard.write([clipboardItem]);
		return true;
	} catch (error) {
		console.error('Failed to copy to clipboard:', error);
		return false;
	}
}

/**
 * Check if clipboard write is supported
 */
export function isClipboardWriteSupported(): boolean {
	return !!(navigator.clipboard && navigator.clipboard.write);
}
