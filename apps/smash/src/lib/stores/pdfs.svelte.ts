export type PDFStatus = 'pending' | 'processing' | 'completed' | 'error';
export type PDFTool = 
	| 'compress' 
	| 'merge' 
	| 'split' 
	| 'rotate'
	| 'delete-pages'
	| 'reorder'
	| 'pdf-to-images' 
	| 'images-to-pdf'
	| 'add-page-numbers'
	| 'watermark'
	| 'protect'
	| 'unlock';
export type ImageFormat = 'png' | 'jpg' | 'webp';
export type CompressionPreset = 'screen' | 'ebook' | 'printer' | 'prepress';

export interface PDFItem {
	id: string;
	file: File;
	name: string;
	originalSize: number;
	processedSize?: number;
	originalUrl: string;
	processedUrl?: string;
	processedBlob?: Blob;
	processedBlobs?: Blob[]; // For split or PDF-to-images (multiple outputs)
	status: PDFStatus;
	progress: number;
	progressStage?: string;
	error?: string;
	pageCount?: number;
	// For split operations
	selectedPages?: number[];
	pageRange?: { start: number; end: number };
	// For merge operations
	order?: number;
	// Thumbnails (first page preview)
	thumbnail?: string;
	// Type indicator
	isImage?: boolean; // true if this is an image file (for images-to-pdf)
	// Desktop (Tauri) mode - native file paths
	filePath?: string; // Native file path (for Tauri desktop app)
	outputPath?: string; // Output file path after processing
	outputPaths?: string[]; // Multiple output paths (for split)
}

export interface PDFSettings {
	tool: PDFTool;
	// Compression settings (Ghostscript presets)
	compressionPreset: CompressionPreset;
	// Image export settings
	imageFormat: ImageFormat;
	imageQuality: number; // 0-100
	imageDPI: 72 | 150 | 300;
	// Split settings
	splitMode: 'range' | 'extract' | 'every-n';
	splitEveryN: number;
	splitRange: string; // e.g., "1-5, 8, 10-12"
	// Rotate settings
	rotationAngle: 90 | 180 | 270;
	// Protection settings
	userPassword: string;
	ownerPassword: string;
	// Watermark settings
	watermarkText: string;
	watermarkOpacity: number; // 0-100
	// Page numbers settings
	pageNumberPosition: 'bottom-center' | 'bottom-right' | 'top-center' | 'top-right';
}

// Ghostscript compression presets (real PDF compression, preserves text)
// User-friendly labels with clear recommendations
export const COMPRESSION_PRESETS = {
	screen: { 
		label: 'Email/Web', 
		desc: 'Smallest (~70% reduction)', 
		icon: 'Monitor',
		dpi: 72,
		gsFlag: '/screen',
		recommended: false
	},
	ebook: { 
		label: 'Reading', 
		desc: 'Balanced (~50% reduction)', 
		icon: 'BookOpen',
		dpi: 150,
		gsFlag: '/ebook',
		recommended: true
	},
	printer: { 
		label: 'Print-Ready', 
		desc: 'High quality (~30% reduction)', 
		icon: 'Printer',
		dpi: 300,
		gsFlag: '/printer',
		recommended: false
	},
	prepress: { 
		label: 'Professional', 
		desc: 'Maximum quality', 
		icon: 'FileCheck',
		dpi: 300,
		gsFlag: '/prepress',
		recommended: false
	}
} as const;

// DPI options for image export
export const DPI_OPTIONS = [
	{ value: 72 as const, label: 'Screen (72)', desc: 'Web/preview' },
	{ value: 150 as const, label: 'Medium (150)', desc: 'General use' },
	{ value: 300 as const, label: 'Print (300)', desc: 'High quality' }
];

// Image format options
export const IMAGE_FORMAT_OPTIONS = [
	{ value: 'png' as const, label: 'PNG', desc: 'Lossless' },
	{ value: 'jpg' as const, label: 'JPG', desc: 'Smaller files' },
	{ value: 'webp' as const, label: 'WebP', desc: 'Modern format' }
];

// Tool definitions - organized by category
export const TOOLS = [
	// Core tools
	{ 
		value: 'compress' as const, 
		label: 'Compress', 
		desc: 'Reduce PDF file size',
		icon: 'Minimize2',
		accepts: '.pdf',
		category: 'core'
	},
	{ 
		value: 'merge' as const, 
		label: 'Merge', 
		desc: 'Combine multiple PDFs',
		icon: 'Layers',
		accepts: '.pdf',
		category: 'core'
	},
	{ 
		value: 'split' as const, 
		label: 'Split', 
		desc: 'Extract pages from PDF',
		icon: 'Scissors',
		accepts: '.pdf',
		category: 'core'
	},
	// Page manipulation
	{ 
		value: 'rotate' as const, 
		label: 'Rotate', 
		desc: 'Rotate PDF pages',
		icon: 'RotateCw',
		accepts: '.pdf',
		category: 'pages'
	},
	{ 
		value: 'delete-pages' as const, 
		label: 'Delete Pages', 
		desc: 'Remove pages from PDF',
		icon: 'Trash2',
		accepts: '.pdf',
		category: 'pages'
	},
	{ 
		value: 'reorder' as const, 
		label: 'Reorder', 
		desc: 'Rearrange PDF pages',
		icon: 'ArrowUpDown',
		accepts: '.pdf',
		category: 'pages'
	},
	// Conversion
	{ 
		value: 'pdf-to-images' as const, 
		label: 'PDF → Images', 
		desc: 'Convert pages to images',
		icon: 'Image',
		accepts: '.pdf',
		category: 'convert'
	},
	{ 
		value: 'images-to-pdf' as const, 
		label: 'Images → PDF', 
		desc: 'Create PDF from images',
		icon: 'FileText',
		accepts: '.jpg,.jpeg,.png,.webp',
		category: 'convert'
	},
	// Editing
	{ 
		value: 'add-page-numbers' as const, 
		label: 'Page Numbers', 
		desc: 'Add page numbers to PDF',
		icon: 'Hash',
		accepts: '.pdf',
		category: 'edit'
	},
	{ 
		value: 'watermark' as const, 
		label: 'Watermark', 
		desc: 'Add text watermark',
		icon: 'Stamp',
		accepts: '.pdf',
		category: 'edit'
	},
	// Security
	{ 
		value: 'protect' as const, 
		label: 'Protect', 
		desc: 'Add password protection',
		icon: 'Lock',
		accepts: '.pdf',
		category: 'security'
	},
	{ 
		value: 'unlock' as const, 
		label: 'Unlock', 
		desc: 'Remove password protection',
		icon: 'Unlock',
		accepts: '.pdf',
		category: 'security'
	}
] as const;

// Tool categories for organized display
export const TOOL_CATEGORIES = [
	{ id: 'core', label: 'Core Tools' },
	{ id: 'pages', label: 'Page Tools' },
	{ id: 'convert', label: 'Convert' },
	{ id: 'edit', label: 'Edit' },
	{ id: 'security', label: 'Security' }
] as const;

// Default settings
const DEFAULT_SETTINGS: PDFSettings = {
	tool: 'compress',
	compressionPreset: 'ebook',
	imageFormat: 'png',
	imageQuality: 85,
	imageDPI: 150,
	splitMode: 'range',
	splitEveryN: 1,
	splitRange: '',
	rotationAngle: 90,
	userPassword: '',
	ownerPassword: '',
	watermarkText: '',
	watermarkOpacity: 30,
	pageNumberPosition: 'bottom-center'
};

// Load settings from localStorage
function loadSettings(): PDFSettings {
	if (typeof window === 'undefined') return DEFAULT_SETTINGS;
	try {
		const saved = localStorage.getItem('smash-settings');
		if (saved) {
			return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
		}
	} catch {
		// Ignore errors
	}
	return DEFAULT_SETTINGS;
}

// Save settings to localStorage
function saveSettings(settings: PDFSettings) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem('smash-settings', JSON.stringify(settings));
	} catch {
		// Ignore errors
	}
}

function createPDFStore() {
	let items = $state<PDFItem[]>([]);
	let settings = $state<PDFSettings>(loadSettings());

	return {
		get items() {
			return items;
		},
		get settings() {
			return settings;
		},

		// Add files (web mode - File objects)
		async addFiles(files: FileList | File[]) {
			const fileArray = Array.from(files);
			const currentTool = settings.tool;
			
			for (const file of fileArray) {
				const isPDF = file.type === 'application/pdf';
				const isImage = file.type.startsWith('image/');
				
				// Validate file type based on current tool
				if (currentTool === 'images-to-pdf' && !isImage) continue;
				if (currentTool !== 'images-to-pdf' && !isPDF) continue;

				const item: PDFItem = {
					id: crypto.randomUUID(),
					file,
					name: file.name,
					originalSize: file.size,
					originalUrl: URL.createObjectURL(file),
					status: 'pending',
					progress: 0,
					order: items.length,
					isImage
				};

				items = [...items, item];
			}
		},

		// Add files from paths (desktop/Tauri mode)
		async addFilesFromPaths(paths: string[]) {
			const currentTool = settings.tool;
			
			for (const filePath of paths) {
				const fileName = filePath.split(/[/\\]/).pop() || 'file';
				const ext = fileName.split('.').pop()?.toLowerCase() || '';
				const isPDF = ext === 'pdf';
				const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
				
				// Validate file type based on current tool
				if (currentTool === 'images-to-pdf' && !isImage) continue;
				if (currentTool !== 'images-to-pdf' && !isPDF) continue;

				// Create a placeholder File object for compatibility
				// The actual file operations will use filePath in Tauri mode
				const placeholderBlob = new Blob([], { type: isPDF ? 'application/pdf' : `image/${ext}` });
				const placeholderFile = new File([placeholderBlob], fileName, { type: placeholderBlob.type });

				const item: PDFItem = {
					id: crypto.randomUUID(),
					file: placeholderFile,
					filePath, // Store the native path for Tauri
					name: fileName,
					originalSize: 0, // Will be updated when file is read
					originalUrl: '', // Not available for native paths
					status: 'pending',
					progress: 0,
					order: items.length,
					isImage
				};

				items = [...items, item];
			}
		},

		// Update item
		updateItem(id: string, updates: Partial<PDFItem>) {
			items = items.map((item) => (item.id === id ? { ...item, ...updates } : item));
		},

		// Remove item
		removeItem(id: string) {
			const item = items.find((i) => i.id === id);
			if (item) {
				if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
				if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
			}
			items = items.filter((i) => i.id !== id);
		},

		// Clear all items
		clearAll() {
			for (const item of items) {
				if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
				if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
			}
			items = [];
		},

		// Clear all items but return them for undo
		clearAllForUndo(): PDFItem[] {
			const deletedItems = [...items];
			items = [];
			return deletedItems;
		},

		// Restore items (for undo)
		restoreItems(restoredItems: PDFItem[]) {
			items = [...restoredItems, ...items];
		},

		// Reorder items (for merge)
		reorderItems(fromIndex: number, toIndex: number) {
			const newItems = [...items];
			const [moved] = newItems.splice(fromIndex, 1);
			newItems.splice(toIndex, 0, moved);
			// Update order property
			items = newItems.map((item, index) => ({ ...item, order: index }));
		},

		// Update settings
		updateSettings(updates: Partial<PDFSettings>) {
			settings = { ...settings, ...updates };
			saveSettings(settings);
		},

		// Set tool
		setTool(tool: PDFTool) {
			// Clear items when switching tools (different file types)
			const currentAccepts = TOOLS.find(t => t.value === settings.tool)?.accepts;
			const newAccepts = TOOLS.find(t => t.value === tool)?.accepts;
			if (currentAccepts !== newAccepts) {
				this.clearAll();
			}
			settings = { ...settings, tool };
			saveSettings(settings);
		},

		// Get item by ID
		getItemById(id: string) {
			return items.find((i) => i.id === id);
		}
	};
}

export const pdfs = createPDFStore();

// Utility: Format bytes
export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Utility: Parse page range string (e.g., "1-5, 8, 10-12")
export function parsePageRange(rangeStr: string, maxPages: number): number[] {
	const pages = new Set<number>();
	const parts = rangeStr.split(',').map((s) => s.trim());

	for (const part of parts) {
		if (part.includes('-')) {
			const [start, end] = part.split('-').map((s) => parseInt(s.trim(), 10));
			if (!isNaN(start) && !isNaN(end)) {
				for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
					pages.add(i);
				}
			}
		} else {
			const page = parseInt(part, 10);
			if (!isNaN(page) && page >= 1 && page <= maxPages) {
				pages.add(page);
			}
		}
	}

	return Array.from(pages).sort((a, b) => a - b);
}
