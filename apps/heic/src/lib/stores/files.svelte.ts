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

const SETTINGS_KEY = 'heic-converter-settings';

function loadSettings(): ConversionSettings {
	if (typeof localStorage === 'undefined') {
		return getDefaultSettings();
	}
	try {
		const saved = localStorage.getItem(SETTINGS_KEY);
		if (saved) {
			return { ...getDefaultSettings(), ...JSON.parse(saved) };
		}
	} catch (e) {
		console.warn('Failed to load settings from localStorage:', e);
	}
	return getDefaultSettings();
}

function saveSettings(settings: ConversionSettings) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
	} catch (e) {
		console.warn('Failed to save settings to localStorage:', e);
	}
}

function getDefaultSettings(): ConversionSettings {
	return {
		outputFormat: 'jpeg', // Most common use case: HEIC → JPEG
		quality: 90, // High quality for photos
	};
}

function createFilesStore() {
	let items = $state<FileItem[]>([]);
	let settings = $state<ConversionSettings>(loadSettings());
	let batchStats = $state<BatchStats>({ startTime: null, endTime: null, totalFiles: 0 });

	function generateId(): string {
		return `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	}

	return {
		get items() {
			return items;
		},
		get settings() {
			return settings;
		},
		get batchStats() {
			return batchStats;
		},

		// Computed properties
		get totalFiles() {
			return items.length;
		},
		get completedFiles() {
			return items.filter((item) => item.status === 'completed').length;
		},
		get processingFiles() {
			return items.filter((item) => item.status === 'processing').length;
		},
		get errorFiles() {
			return items.filter((item) => item.status === 'error').length;
		},
		get totalOriginalSize() {
			return items.reduce((sum, item) => sum + item.originalSize, 0);
		},
		get totalConvertedSize() {
			return items.reduce((sum, item) => sum + (item.convertedSize || 0), 0);
		},
		get averageProgress() {
			if (items.length === 0) return 0;
			return items.reduce((sum, item) => sum + item.progress, 0) / items.length;
		},
		get allCompleted() {
			return items.length > 0 && items.every((item) => item.status === 'completed');
		},
		get hasErrors() {
			return items.some((item) => item.status === 'error');
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

			for (const file of files) {
				// Only accept HEIC/HEIF files
				if (!validTypes.includes(file.type)) {
					console.warn(`Skipping non-HEIC file: ${file.name} (${file.type})`);
					continue;
				}

				const id = generateId();
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

			items = [...items, ...newItems];
			return newItems.map((item) => item.id);
		},

		removeFile(id: string) {
			const item = items.find((i) => i.id === id);
			if (item) {
				// Revoke object URLs to prevent memory leaks
				URL.revokeObjectURL(item.originalUrl);
				if (item.convertedUrl) {
					URL.revokeObjectURL(item.convertedUrl);
				}
			}
			items = items.filter((i) => i.id !== id);
		},

		clearAll() {
			// Revoke all object URLs
			items.forEach((item) => {
				URL.revokeObjectURL(item.originalUrl);
				if (item.convertedUrl) {
					URL.revokeObjectURL(item.convertedUrl);
				}
			});
			items = [];
			this.resetBatchStats();
		},

		updateFile(id: string, updates: Partial<FileItem>) {
			const index = items.findIndex((i) => i.id === id);
			if (index !== -1) {
				items[index] = { ...items[index], ...updates };
			}
		},

		setFileProgress(id: string, progress: number) {
			this.updateFile(id, { progress });
		},

		setFileStatus(id: string, status: FileStatus, error?: string) {
			this.updateFile(id, { status, error });
		},

		setFileConverted(id: string, blob: Blob, width?: number, height?: number) {
			const url = URL.createObjectURL(blob);
			this.updateFile(id, {
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
			settings = { ...settings, ...newSettings };
			saveSettings(settings);

			// Update output format for all pending files
			items = items.map((item) => {
				if (item.status === 'pending' && newSettings.outputFormat) {
					return { ...item, outputFormat: newSettings.outputFormat };
				}
				return item;
			});
		},

		getFile(id: string): FileItem | undefined {
			return items.find((item) => item.id === id);
		},

		// Get files by status
		getFilesByStatus(status: FileStatus): FileItem[] {
			return items.filter((item) => item.status === status);
		},
	};
}

export const filesStore = createFilesStore();
