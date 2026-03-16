import { createFileStore } from '@neutron/ui';

// GIF State Management Store
// Manages GIF files and processing state across the application

export type GifStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface GifItem {
	id: string;
	file: File;
	name: string;
	originalSize: number;
	originalUrl: string;

	// Processing state
	status: GifStatus;
	progress: number;
	error?: string;

	// Result
	compressedSize?: number;
	compressedUrl?: string;
	compressedBlob?: Blob;

	// Metadata
	width?: number;
	height?: number;
	frameCount?: number;
}

export interface GifSettings {
	// Optimize settings
	targetSizeMB: number;
	colors: number;
	lossy: number;

	// Resize settings
	width: number;
	height: number;
	maintainAspectRatio: boolean;

	// Speed settings
	speedMultiplier: number;
	reverse: boolean;
	boomerang: boolean;
}

const defaultSettings: GifSettings = {
	targetSizeMB: 10,
	colors: 256,
	lossy: 80,
	width: 480,
	height: 0,
	maintainAspectRatio: true,
	speedMultiplier: 1,
	reverse: false,
	boomerang: false,
};

const base = createFileStore<GifItem, GifSettings>({
	defaultSettings: { ...defaultSettings },
	urlFields: ['originalUrl', 'compressedUrl'],
	idPrefix: 'gif-',
});

function addFiles(files: File[]): string[] {
	const ids: string[] = [];

	for (const file of files) {
		const id = base._generateId();
		const url = URL.createObjectURL(file);

		const item: GifItem = {
			id,
			file,
			name: file.name,
			originalSize: file.size,
			originalUrl: url,
			status: 'pending',
			progress: 0,
		};

		base._setItems([...base._getItems(), item]);
		ids.push(id);
	}

	return ids;
}

function resetSettings() {
	base._setSettings({ ...defaultSettings });
}

function getPendingItems(): GifItem[] {
	return base.items.filter((item) => item.status === 'pending');
}

function getCompletedItems(): GifItem[] {
	return base.items.filter((item) => item.status === 'completed');
}

function getTotalSavings(): { original: number; compressed: number; percentage: number } {
	const completed = getCompletedItems();
	const original = completed.reduce((sum, item) => sum + item.originalSize, 0);
	const compressed = completed.reduce((sum, item) => sum + (item.compressedSize || 0), 0);
	const percentage = original > 0 ? Math.round((1 - compressed / original) * 100) : 0;

	return { original, compressed, percentage };
}

export const gifs = {
	get items() {
		return base.items;
	},
	get settings() {
		return base.settings;
	},

	addFiles,
	getItemById: base.getItemById.bind(base),
	updateItem: base.updateItem.bind(base),
	removeItem: base.removeItem.bind(base),
	clearAll: base.clearAll.bind(base),
	resetSettings,
	updateSettings: base.updateSettings.bind(base),
	getPendingItems,
	getCompletedItems,
	getTotalSavings,
};
