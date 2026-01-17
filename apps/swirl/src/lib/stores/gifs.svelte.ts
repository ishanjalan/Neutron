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

// Create reactive state
let items = $state<GifItem[]>([]);
let settings = $state<GifSettings>({ ...defaultSettings });

// Generate unique ID
function generateId(): string {
	return `gif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Add GIF files
function addFiles(files: File[]): string[] {
	const ids: string[] = [];

	for (const file of files) {
		const id = generateId();
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

		items = [...items, item];
		ids.push(id);
	}

	return ids;
}

// Get item by ID
function getItemById(id: string): GifItem | undefined {
	return items.find((item) => item.id === id);
}

// Update item
function updateItem(id: string, updates: Partial<GifItem>) {
	items = items.map((item) => (item.id === id ? { ...item, ...updates } : item));
}

// Remove item
function removeItem(id: string) {
	const item = items.find((i) => i.id === id);
	if (item) {
		URL.revokeObjectURL(item.originalUrl);
		if (item.compressedUrl) {
			URL.revokeObjectURL(item.compressedUrl);
		}
	}
	items = items.filter((item) => item.id !== id);
}

// Clear all items
function clearAll() {
	items.forEach((item) => {
		URL.revokeObjectURL(item.originalUrl);
		if (item.compressedUrl) {
			URL.revokeObjectURL(item.compressedUrl);
		}
	});
	items = [];
}

// Reset settings to defaults
function resetSettings() {
	settings = { ...defaultSettings };
}

// Update settings
function updateSettings(updates: Partial<GifSettings>) {
	settings = { ...settings, ...updates };
}

// Get pending items
function getPendingItems(): GifItem[] {
	return items.filter((item) => item.status === 'pending');
}

// Get completed items
function getCompletedItems(): GifItem[] {
	return items.filter((item) => item.status === 'completed');
}

// Calculate total savings
function getTotalSavings(): { original: number; compressed: number; percentage: number } {
	const completed = getCompletedItems();
	const original = completed.reduce((sum, item) => sum + item.originalSize, 0);
	const compressed = completed.reduce((sum, item) => sum + (item.compressedSize || 0), 0);
	const percentage = original > 0 ? Math.round((1 - compressed / original) * 100) : 0;

	return { original, compressed, percentage };
}

// Export the store
export const gifs = {
	get items() {
		return items;
	},
	get settings() {
		return settings;
	},

	addFiles,
	getItemById,
	updateItem,
	removeItem,
	clearAll,
	resetSettings,
	updateSettings,
	getPendingItems,
	getCompletedItems,
	getTotalSavings,
};
