import { filesStore, type FileItem, type OutputFormat } from '$lib/stores/files.svelte';
import { processImage as processImageInWorker, initPool } from './worker-pool';
import heic2any from 'heic2any';

// Processing state
let isProcessing = false;
const queue: string[] = [];

// Abort controller for cancelling processing
let abortController: AbortController | null = null;

export function cancelProcessing(): void {
	if (abortController) {
		abortController.abort();
		abortController = null;
	}

	queue.length = 0;

	// Reset all processing files to pending
	filesStore.items
		.filter((f) => f.status === 'processing')
		.forEach((f) =>
			filesStore.updateFile(f.id, {
				status: 'pending',
				progress: 0,
			})
		);

	isProcessing = false;
}

export function isCurrentlyProcessing(): boolean {
	return isProcessing;
}

// Convert HEIC to PNG using heic2any
async function convertHeicToPng(
	file: File
): Promise<{ blob: Blob; width: number; height: number }> {
	const result = await heic2any({
		blob: file,
		toType: 'image/png', // Lossless intermediate format
		quality: 1,
	});

	// heic2any can return single blob or array
	const pngBlob = Array.isArray(result) ? result[0] : result;

	// Get dimensions from the converted PNG
	const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(pngBlob);
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve({ width: img.naturalWidth, height: img.naturalHeight });
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to get HEIC dimensions'));
		};
		img.src = url;
	});

	return { blob: pngBlob, ...dimensions };
}

// Convert a single HEIC file
async function convertFile(item: FileItem): Promise<void> {
	try {
		filesStore.setFileStatus(item.id, 'processing');
		filesStore.setFileProgress(item.id, 5);

		// Step 1: Convert HEIC to PNG (20% progress)
		const { blob: pngBlob, width, height } = await convertHeicToPng(item.file);
		filesStore.setFileProgress(item.id, 20);

		// If output is PNG, we're done
		if (item.outputFormat === 'png') {
			filesStore.setFileConverted(item.id, pngBlob, width, height);
			return;
		}

		// Step 2: Encode PNG to target format using worker (80% progress)
		const imageBuffer = await pngBlob.arrayBuffer();

		const {
			result,
			mimeType,
			width: outWidth,
			height: outHeight,
		} = await processImageInWorker(
			imageBuffer,
			'png', // Input is always PNG from heic2any
			item.outputFormat,
			filesStore.settings.quality,
			false, // Not lossless
			(progress) => {
				// Map worker progress (0-100) to our range (20-100)
				const mappedProgress = 20 + (progress * 80) / 100;
				filesStore.setFileProgress(item.id, mappedProgress);
			}
		);

		if (!result || !mimeType) {
			throw new Error('Worker returned no result');
		}

		// Step 3: Create blob and update store
		const convertedBlob = new Blob([result], { type: mimeType });
		filesStore.setFileConverted(item.id, convertedBlob, outWidth, outHeight);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown conversion error';
		filesStore.setFileStatus(item.id, 'error', errorMessage);
		console.error(`Failed to convert ${item.name}:`, error);
	}
}

// Process multiple files
export async function processFiles(ids: string[]): Promise<void> {
	// Start batch timing if this is a new batch
	if (!isProcessing && ids.length > 0) {
		filesStore.startBatch(ids.length);
		abortController = new AbortController();
	}

	// Add to queue
	queue.push(...ids);

	// Start processing if not already running
	if (!isProcessing) {
		isProcessing = true;
		await processQueue();
	}
}

// Process the queue
async function processQueue(): Promise<void> {
	// Initialize worker pool
	await initPool();

	while (queue.length > 0) {
		// Check if aborted
		if (abortController?.signal.aborted) {
			console.log('Processing cancelled');
			break;
		}

		const id = queue.shift();
		if (!id) continue;

		const item = filesStore.getFile(id);
		if (!item) continue;

		// Skip if already completed or has error
		if (item.status === 'completed' || item.status === 'error') {
			continue;
		}

		await convertFile(item);
	}

	// End batch timing
	if (queue.length === 0) {
		filesStore.endBatch();
		isProcessing = false;
		abortController = null;
	}
}

// Download a single file
export function downloadFile(item: FileItem): void {
	if (!item.convertedUrl || !item.convertedBlob) {
		console.error('No converted file to download');
		return;
	}

	const extension = item.outputFormat === 'jpeg' ? 'jpg' : item.outputFormat;
	const baseName = item.name.replace(/\.(heic|heif)$/i, '');
	const fileName = `${baseName}.${extension}`;

	const a = document.createElement('a');
	a.href = item.convertedUrl;
	a.download = fileName;
	a.click();
}

// Download all completed files as ZIP
export async function downloadAllAsZip(): Promise<void> {
	const completedFiles = filesStore.getFilesByStatus('completed');

	if (completedFiles.length === 0) {
		console.error('No completed files to download');
		return;
	}

	// Dynamically import JSZip
	const JSZip = (await import('jszip')).default;
	const zip = new JSZip();

	for (const file of completedFiles) {
		if (!file.convertedBlob) continue;

		const extension = file.outputFormat === 'jpeg' ? 'jpg' : file.outputFormat;
		const baseName = file.name.replace(/\.(heic|heif)$/i, '');
		const fileName = `${baseName}.${extension}`;

		zip.file(fileName, file.convertedBlob);
	}

	// Generate ZIP
	const zipBlob = await zip.generateAsync({ type: 'blob' });

	// Download
	const url = URL.createObjectURL(zipBlob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `heic-converted-${Date.now()}.zip`;
	a.click();
	URL.revokeObjectURL(url);
}
