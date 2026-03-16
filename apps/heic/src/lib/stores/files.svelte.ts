import { createFileStore } from '@neutron/ui';

export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif';
export type FileStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface FileItem {
	id: string;
	file: File;
	name: string;
	originalSize: number;
	convertedSize?: number;
	originalUrl: string;
	convertedUrl?: string;
	convertedBlob?: Blob;
	outputFormat: OutputFormat;
	status: FileStatus;
	progress: number;
	error?: string;
	width?: number;
	height?: number;
}

export interface ConversionSettings {
	outputFormat: OutputFormat;
	quality: number; // 0-100 for lossy formats (JPEG, WebP, AVIF)
}

export interface BatchStats {
	startTime: number | null;
	endTime: number | null;
	totalFiles: number;
}

const base = createFileStore<FileItem, ConversionSettings>({
	settingsKey: 'heic-converter-settings',
	defaultSettings: { outputFormat: 'jpeg', quality: 90 },
	urlFields: ['originalUrl', 'convertedUrl'],
	idPrefix: 'file_',
});

let batchStats = $state<BatchStats>({ startTime: null, endTime: null, totalFiles: 0 });

export const filesStore = {
	get items() {
		return base.items;
	},
	get settings() {
		return base.settings;
	},
	get batchStats() {
		return batchStats;
	},

	// Computed properties
	get totalFiles() {
		return base.items.length;
	},
	get completedFiles() {
		return base.items.filter((item) => item.status === 'completed').length;
	},
	get processingFiles() {
		return base.items.filter((item) => item.status === 'processing').length;
	},
	get errorFiles() {
		return base.items.filter((item) => item.status === 'error').length;
	},
	get totalOriginalSize() {
		return base.items.reduce((sum, item) => sum + item.originalSize, 0);
	},
	get totalConvertedSize() {
		return base.items.reduce((sum, item) => sum + (item.convertedSize || 0), 0);
	},
	get averageProgress() {
		if (base.items.length === 0) return 0;
		return base.items.reduce((sum, item) => sum + item.progress, 0) / base.items.length;
	},
	get allCompleted() {
		return base.items.length > 0 && base.items.every((item) => item.status === 'completed');
	},
	get hasErrors() {
		return base.items.some((item) => item.status === 'error');
	},

	startBatch(count: number) {
		batchStats = { startTime: Date.now(), endTime: null, totalFiles: count };
	},

	endBatch() {
		batchStats = { ...batchStats, endTime: Date.now() };
	},

	resetBatchStats() {
		batchStats = { startTime: null, endTime: null, totalFiles: 0 };
	},

	async addFiles(files: FileList | File[]) {
		const validTypes = ['image/heic', 'image/heif'];
		const newItems: FileItem[] = [];
		const settings = base._getSettings();

		for (const file of files) {
			if (!validTypes.includes(file.type)) {
				console.warn(`Skipping non-HEIC file: ${file.name} (${file.type})`);
				continue;
			}

			const id = base._generateId();
			const originalUrl = URL.createObjectURL(file);

			newItems.push({
				id,
				file,
				name: file.name,
				originalSize: file.size,
				originalUrl,
				outputFormat: settings.outputFormat,
				status: 'pending',
				progress: 0,
			});
		}

		base._setItems([...base._getItems(), ...newItems]);
		return newItems.map((item) => item.id);
	},

	removeFile(id: string) {
		base.removeItem(id);
	},

	clearAll() {
		base.clearAll();
		this.resetBatchStats();
	},

	updateFile(id: string, updates: Partial<FileItem>) {
		base.updateItem(id, updates);
	},

	setFileProgress(id: string, progress: number) {
		base.updateItem(id, { progress });
	},

	setFileStatus(id: string, status: FileStatus, error?: string) {
		base.updateItem(id, { status, error });
	},

	setFileConverted(id: string, blob: Blob, width?: number, height?: number) {
		const url = URL.createObjectURL(blob);
		base.updateItem(id, {
			convertedBlob: blob,
			convertedUrl: url,
			convertedSize: blob.size,
			status: 'completed',
			progress: 100,
			width,
			height,
		});
	},

	updateSettings(newSettings: Partial<ConversionSettings>) {
		base.updateSettings(newSettings);

		// Update output format for all pending files
		const items = base._getItems();
		base._setItems(
			items.map((item) => {
				if (item.status === 'pending' && newSettings.outputFormat) {
					return { ...item, outputFormat: newSettings.outputFormat };
				}
				return item;
			})
		);
	},

	getFile(id: string): FileItem | undefined {
		return base.getItemById(id);
	},

	getFilesByStatus(status: FileStatus): FileItem[] {
		return base.items.filter((item) => item.status === status);
	},
};
