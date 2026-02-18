import type { ImageItem } from '$lib/stores/images.svelte';
import { getOutputFilename } from './compress';

let autoSaveDirHandle: FileSystemDirectoryHandle | null = null;
let autoSaveEnabled = $state(false);
let autoSaveFolderName = $state<string | null>(null);
let autoSavedCount = $state(0);
const autoSaveUsedNames = new Map<string, number>();

function isFileSystemAccessSupported(): boolean {
	return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export function getAutoSaveState() {
	return {
		get enabled() {
			return autoSaveEnabled;
		},
		get folderName() {
			return autoSaveFolderName;
		},
		get savedCount() {
			return autoSavedCount;
		},
	};
}

export async function enableAutoSave(): Promise<boolean> {
	if (!isFileSystemAccessSupported()) return false;

	try {
		// @ts-expect-error - File System Access API types
		autoSaveDirHandle = await window.showDirectoryPicker({
			mode: 'readwrite',
			startIn: 'downloads',
		});
		autoSaveEnabled = true;
		autoSaveFolderName = autoSaveDirHandle!.name;
		autoSavedCount = 0;
		autoSaveUsedNames.clear();
		return true;
	} catch {
		return false;
	}
}

export function disableAutoSave() {
	autoSaveDirHandle = null;
	autoSaveEnabled = false;
	autoSaveFolderName = null;
	autoSavedCount = 0;
	autoSaveUsedNames.clear();
}

export async function autoSaveFile(item: ImageItem, template?: string): Promise<boolean> {
	if (!autoSaveEnabled || !autoSaveDirHandle || !item.compressedBlob) return false;

	try {
		let filename = getOutputFilename(item.name, item.outputFormat, template);

		const count = autoSaveUsedNames.get(filename) || 0;
		if (count > 0) {
			const ext = filename.lastIndexOf('.');
			filename = `${filename.slice(0, ext)}-${count}${filename.slice(ext)}`;
		}
		autoSaveUsedNames.set(filename, count + 1);

		const fileHandle = await autoSaveDirHandle.getFileHandle(filename, { create: true });
		const writable = await fileHandle.createWritable();
		await writable.write(item.compressedBlob);
		await writable.close();
		autoSavedCount++;
		return true;
	} catch (error) {
		console.error('Auto-save failed for', item.name, error);
		return false;
	}
}
