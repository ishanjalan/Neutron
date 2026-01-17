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
 * Check if File System Access API is supported
 */
export function isFileSystemAccessSupported(): boolean {
	return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Check if clipboard write is supported
 */
export function isClipboardWriteSupported(): boolean {
	return (
		typeof navigator !== 'undefined' && 'clipboard' in navigator && 'write' in navigator.clipboard
	);
}

/**
 * Copy a blob to clipboard (for images/GIFs)
 */
export async function copyBlobToClipboard(blob: Blob): Promise<boolean> {
	if (!isClipboardWriteSupported()) return false;

	try {
		const item = new ClipboardItem({ [blob.type]: blob });
		await navigator.clipboard.write([item]);
		return true;
	} catch {
		return false;
	}
}
