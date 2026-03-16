import JSZip from 'jszip';

export interface DownloadFile {
	name: string;
	blob: Blob;
}

export interface ZipProgressCallback {
	(percent: number): void;
}

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
 * Bundle multiple files into a ZIP and download it
 */
export async function downloadAllAsZip(
	files: DownloadFile[],
	zipName: string,
	onProgress?: ZipProgressCallback
): Promise<void> {
	const zip = new JSZip();

	const usedNames = new Map<string, number>();
	for (const file of files) {
		let filename = file.name;
		const count = usedNames.get(filename) || 0;
		if (count > 0) {
			const ext = filename.lastIndexOf('.');
			filename =
				ext >= 0
					? `${filename.slice(0, ext)}-${count}${filename.slice(ext)}`
					: `${filename}-${count}`;
		}
		usedNames.set(file.name, count + 1);
		zip.file(filename, file.blob);
	}

	const content = await zip.generateAsync(
		{ type: 'blob' },
		onProgress ? (meta) => onProgress(meta.percent) : undefined
	);
	downloadBlob(content, zipName);
}

/**
 * Download multiple blobs sequentially, or as a ZIP if there are more than one.
 * Useful when processing yields an array of output files per input file.
 */
export async function downloadMultipleFiles(
	blobs: Blob[],
	baseName: string,
	extension: string
): Promise<void> {
	if (blobs.length === 1) {
		downloadBlob(blobs[0], `${baseName}${extension}`);
		return;
	}

	const zip = new JSZip();
	for (let i = 0; i < blobs.length; i++) {
		zip.file(`${baseName}-${i + 1}${extension}`, blobs[i]);
	}
	const zipBlob = await zip.generateAsync({ type: 'blob' });
	downloadBlob(zipBlob, `${baseName}.zip`);
}

/**
 * Save files directly to a user-chosen directory via the File System Access API.
 * Falls back silently if the API is unavailable.
 */
export async function saveFilesToDirectory(files: DownloadFile[]): Promise<void> {
	if (!isFileSystemAccessSupported()) {
		throw new Error('File System Access API not supported');
	}

	// @ts-expect-error - File System Access API types may not be available in all TS versions
	const dirHandle: FileSystemDirectoryHandle = await window.showDirectoryPicker({
		mode: 'readwrite',
		startIn: 'downloads',
	});

	const usedNames = new Map<string, number>();
	for (const file of files) {
		let filename = file.name;
		const count = usedNames.get(filename) || 0;
		if (count > 0) {
			const ext = filename.lastIndexOf('.');
			filename =
				ext >= 0
					? `${filename.slice(0, ext)}-${count}${filename.slice(ext)}`
					: `${filename}-${count}`;
		}
		usedNames.set(file.name, count + 1);

		const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
		const writable = await fileHandle.createWritable();
		await writable.write(file.blob);
		await writable.close();
	}
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
