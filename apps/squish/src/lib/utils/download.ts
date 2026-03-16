import type { ImageItem } from '$lib/stores/images.svelte';
import { getOutputFilename } from './compress';
import {
	downloadBlob,
	downloadAllAsZip as downloadAllAsZipGeneric,
	saveFilesToDirectory,
	isFileSystemAccessSupported,
	type ZipProgressCallback,
} from '@neutron/utils';

// Re-export auto-save from .svelte.ts module where $state works
export {
	getAutoSaveState,
	enableAutoSave,
	disableAutoSave,
	autoSaveFile,
} from './auto-save.svelte';

// Re-export shared helpers for convenience
export { downloadBlob, isFileSystemAccessSupported } from '@neutron/utils';

const LARGE_BATCH_COUNT = 20;
const LARGE_BATCH_SIZE_MB = 50;

export function downloadImage(item: ImageItem, template?: string) {
	if (!item.compressedBlob) return;
	const filename = getOutputFilename(item.name, item.outputFormat, template);
	downloadBlob(item.compressedBlob, filename);
}

export async function downloadAllAsZip(
	items: ImageItem[],
	onProgress?: ZipProgressCallback,
	template?: string
): Promise<void> {
	const files = items
		.filter((item) => item.compressedBlob)
		.map((item) => ({
			name: getOutputFilename(item.name, item.outputFormat, template),
			blob: item.compressedBlob!,
		}));
	await downloadAllAsZipGeneric(files, `optimized-images-${Date.now()}.zip`, onProgress);
}

export function isLargeBatch(items: ImageItem[]): boolean {
	const totalSize = items.reduce((acc, i) => acc + (i.compressedSize || 0), 0);
	return items.length > LARGE_BATCH_COUNT || totalSize / (1024 * 1024) > LARGE_BATCH_SIZE_MB;
}

export async function downloadWithFileSystemAPI(
	items: ImageItem[],
	template?: string
): Promise<void> {
	const files = items
		.filter((item) => item.compressedBlob)
		.map((item) => ({
			name: getOutputFilename(item.name, item.outputFormat, template),
			blob: item.compressedBlob!,
		}));
	await saveFilesToDirectory(files);
}

export async function downloadAllSmart(
	items: ImageItem[],
	options?: {
		forceZip?: boolean;
		forceFSAPI?: boolean;
		onMethodChosen?: (method: 'zip' | 'fsapi') => void;
		onProgress?: ZipProgressCallback;
		template?: string;
	}
): Promise<void> {
	const validItems = items.filter((i) => i.compressedBlob);
	if (validItems.length === 0) return;

	if (options?.forceZip) {
		options.onMethodChosen?.('zip');
		return downloadAllAsZip(validItems, options.onProgress, options.template);
	}

	if (options?.forceFSAPI && isFileSystemAccessSupported()) {
		options.onMethodChosen?.('fsapi');
		return downloadWithFileSystemAPI(validItems, options.template);
	}

	if (isLargeBatch(validItems) && isFileSystemAccessSupported()) {
		options?.onMethodChosen?.('fsapi');
		return downloadWithFileSystemAPI(validItems, options?.template);
	}

	options?.onMethodChosen?.('zip');
	return downloadAllAsZip(validItems, options?.onProgress, options?.template);
}

export function getDownloadInfo(items: ImageItem[]): {
	count: number;
	totalSize: number;
	totalSizeMB: number;
	isLarge: boolean;
	fsapiSupported: boolean;
	recommendedMethod: 'zip' | 'fsapi';
} {
	const validItems = items.filter((i) => i.compressedBlob);
	const totalSize = validItems.reduce((acc, i) => acc + (i.compressedSize || 0), 0);
	const totalSizeMB = totalSize / (1024 * 1024);
	const isLarge = isLargeBatch(validItems);
	const fsapiSupported = isFileSystemAccessSupported();

	return {
		count: validItems.length,
		totalSize,
		totalSizeMB,
		isLarge,
		fsapiSupported,
		recommendedMethod: isLarge && fsapiSupported ? 'fsapi' : 'zip',
	};
}
