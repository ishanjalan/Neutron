import { SvelteSet } from 'svelte/reactivity';
import { toast } from '@neutron/ui';
import { detectSvgEmbeddedRaster } from '$lib/utils/svg-analyze';

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'jxl' | 'svg' | 'heic';
export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'jxl' | 'svg'; // HEIC is input-only
export type ImageStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface ImageItem {
	id: string;
	file: File;
	name: string;
	originalSize: number;
	compressedSize?: number;
	originalUrl: string;
	compressedUrl?: string;
	compressedBlob?: Blob;
	thumbnailUrl?: string;
	format: ImageFormat;
	outputFormat: OutputFormat;
	status: ImageStatus;
	progress: number;
	error?: string;
	width?: number;
	height?: number;
	webpAlternativeSize?: number;
	svgEmbeddedRaster?: boolean;
	svgAnalysisComplete?: boolean;
	targetSizeAttempt?: number;
	targetSizeMaxAttempts?: number;
	achievedQuality?: number;
	targetSizeWarning?: string;
	resizedWidth?: number;
	resizedHeight?: number;
}

export type ResizeMode = 'percentage' | 'dimensions' | 'fit';

export interface CompressionSettings {
	quality: number;
	outputFormat: 'same' | OutputFormat;
	stripMetadata: boolean;
	lossless: boolean;
	// Target file size mode
	targetSizeMode: boolean;
	targetSizeKB: number;
	// Resize settings
	resizeEnabled: boolean;
	resizeMode: ResizeMode;
	resizePercentage: number;
	resizeMaxWidth: number;
	resizeMaxHeight: number;
	maintainAspectRatio: boolean;
	// Filename template
	filenameTemplate: string;
}

export interface BatchStats {
	startTime: number | null;
	endTime: number | null;
	totalImages: number;
}

const SETTINGS_KEY = 'squish-settings';

function loadSettings(): CompressionSettings {
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

function saveSettings(settings: CompressionSettings) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
	} catch (e) {
		console.warn('Failed to save settings to localStorage:', e);
	}
}

function getDefaultSettings(): CompressionSettings {
	return {
		quality: 80, // "Balanced" preset - best of both worlds
		outputFormat: 'webp', // Best compression + universal support (web, Android, iOS 14+)
		stripMetadata: true,
		lossless: false,
		targetSizeMode: false, // Quality mode by default
		targetSizeKB: 500, // Default target: 500KB
		// Resize defaults
		resizeEnabled: false,
		resizeMode: 'percentage',
		resizePercentage: 50,
		resizeMaxWidth: 1920,
		resizeMaxHeight: 1080,
		maintainAspectRatio: true,
		// Filename template
		filenameTemplate: '{name}-optimized.{ext}',
	};
}

const THUMB_MAX = 400;

async function generateThumbnail(file: File): Promise<string | undefined> {
	if (file.type === 'image/heic' || file.type === 'image/heif') return undefined;
	if (file.type === 'image/svg+xml') return undefined;

	return new Promise((resolve) => {
		const img = new Image();
		const url = URL.createObjectURL(file);
		img.onload = () => {
			URL.revokeObjectURL(url);
			const scale = Math.min(1, THUMB_MAX / Math.max(img.naturalWidth, img.naturalHeight));
			const w = Math.round(img.naturalWidth * scale);
			const h = Math.round(img.naturalHeight * scale);
			const canvas = document.createElement('canvas');
			canvas.width = w;
			canvas.height = h;
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(img, 0, 0, w, h);
			canvas.toBlob(
				(blob) => {
					canvas.width = 0;
					canvas.height = 0;
					if (blob) {
						resolve(URL.createObjectURL(blob));
					} else {
						resolve(undefined);
					}
				},
				'image/jpeg',
				0.7
			);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			resolve(undefined);
		};
		img.src = url;
	});
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
	// HEIC can't be loaded directly in most browsers
	if (file.type === 'image/heic' || file.type === 'image/heif') {
		return null; // Dimensions will be set after conversion
	}

	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve({ width: img.naturalWidth, height: img.naturalHeight });
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load image dimensions'));
		};
		img.src = url;
	});
}

function createImagesStore() {
	let items = $state<ImageItem[]>([]);
	let settings = $state<CompressionSettings>(loadSettings());
	let batchStats = $state<BatchStats>({ startTime: null, endTime: null, totalImages: 0 });
	let selectedIds = $state<Set<string>>(new Set());

	function getFormatFromMime(mimeType: string): ImageFormat {
		const map: Record<string, ImageFormat> = {
			'image/jpeg': 'jpeg',
			'image/jpg': 'jpeg',
			'image/png': 'png',
			'image/webp': 'webp',
			'image/avif': 'avif',
			'image/jxl': 'jxl',
			'image/svg+xml': 'svg',
			'image/heic': 'heic',
			'image/heif': 'heic',
		};
		return map[mimeType] || 'jpeg';
	}

	function generateId(): string {
		return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
		get selectedIds() {
			return selectedIds;
		},

		startBatch(count: number) {
			batchStats = { startTime: Date.now(), endTime: null, totalImages: count };
		},

		endBatch() {
			batchStats = { ...batchStats, endTime: Date.now() };
		},

		resetBatchStats() {
			batchStats = { startTime: null, endTime: null, totalImages: 0 };
		},

		suggestSettings(
			newItems: ImageItem[]
		): { suggested: Partial<CompressionSettings>; reasons: string[] } | null {
			if (newItems.length === 0) return null;

			const suggested: Partial<CompressionSettings> = {};
			const reasons: string[] = [];

			// Quality based on median file size
			const sizes = newItems.map((i) => i.originalSize).sort((a, b) => a - b);
			const medianSize = sizes[Math.floor(sizes.length / 2)];

			if (medianSize > 10 * 1024 * 1024) {
				suggested.quality = 60;
				reasons.push('quality 60 (large files)');
			} else if (medianSize > 2 * 1024 * 1024) {
				suggested.quality = 70;
				reasons.push('quality 70');
			} else if (medianSize < 100 * 1024) {
				suggested.quality = 95;
				reasons.push('quality 95 (already small)');
			}
			// 100KB–2MB stays at default 80

			// Format based on input content
			const formats = newItems.map((i) => i.format);
			const uniqueFormats = new Set(formats);
			const allSvg = uniqueFormats.size === 1 && uniqueFormats.has('svg');
			const allJpeg = uniqueFormats.size === 1 && uniqueFormats.has('jpeg');
			const allPng = uniqueFormats.size === 1 && uniqueFormats.has('png');
			const hasHeic = uniqueFormats.has('heic');
			const hasSvgEmbeddedRaster = newItems.some((i) => i.svgEmbeddedRaster);

			if (allSvg && hasSvgEmbeddedRaster) {
				suggested.outputFormat = 'webp';
				reasons.push('WebP — SVG contains embedded bitmap images');
			} else if (allSvg) {
				suggested.outputFormat = 'same';
				reasons.push('keeping SVG');
			} else if (allJpeg) {
				suggested.outputFormat = 'same';
				reasons.push('keeping JPEG');
			} else if (allPng) {
				suggested.outputFormat = 'webp';
				reasons.push('WebP for PNG inputs');
			} else if (hasHeic) {
				suggested.outputFormat = 'webp';
				reasons.push('WebP for HEIC');
			}

			// Auto-resize for oversized images
			const maxDim = Math.max(
				...newItems.filter((i) => i.width && i.height).flatMap((i) => [i.width!, i.height!]),
				0
			);

			if (maxDim > 8000) {
				suggested.resizeEnabled = true;
				suggested.resizeMode = 'fit';
				suggested.resizeMaxWidth = 4096;
				suggested.resizeMaxHeight = 4096;
				reasons.push('resize to 4096px (very large images)');
			} else if (maxDim > 4096) {
				suggested.resizeEnabled = true;
				suggested.resizeMode = 'fit';
				suggested.resizeMaxWidth = 2048;
				suggested.resizeMaxHeight = 2048;
				reasons.push('resize to 2048px');
			}

			if (reasons.length === 0) return null;
			return { suggested, reasons };
		},

		async addFiles(files: FileList | File[]) {
			const wasEmpty = items.length === 0;

			const validTypes = [
				'image/jpeg',
				'image/jpg',
				'image/png',
				'image/webp',
				'image/avif',
				'image/jxl',
				'image/svg+xml',
				'image/heic',
				'image/heif',
			];

			const newItems: ImageItem[] = [];

			for (const file of files) {
				if (!validTypes.includes(file.type)) continue;

				const format = getFormatFromMime(file.type);

				let outputFormat: OutputFormat;
				if (format === 'svg') {
					outputFormat = settings.outputFormat === 'same' ? 'svg' : settings.outputFormat;
				} else if (format === 'heic') {
					outputFormat = settings.outputFormat === 'same' ? 'webp' : settings.outputFormat;
				} else {
					outputFormat =
						settings.outputFormat === 'same' ? (format as OutputFormat) : settings.outputFormat;
				}

			let width: number | undefined;
			let height: number | undefined;
			try {
				const dims = await getImageDimensions(file);
				if (dims) {
					width = dims.width;
					height = dims.height;
				}
			} catch {
				console.warn('Failed to get dimensions for', file.name);
			}

			const thumbnailUrl = await generateThumbnail(file);

			// Detect embedded bitmaps in SVG files (e.g. Figma exports that wrap rasters in SVG)
			let svgEmbeddedRaster: boolean | undefined;
			if (format === 'svg') {
				svgEmbeddedRaster = await detectSvgEmbeddedRaster(file);
				// Override output format: embedded-raster SVGs should default to WebP
				if (svgEmbeddedRaster && settings.outputFormat === 'same') {
					outputFormat = 'webp';
				}
			}

			newItems.push({
				id: generateId(),
				file,
				name: file.name,
				originalSize: file.size,
				originalUrl: URL.createObjectURL(file),
				thumbnailUrl,
				format,
				outputFormat,
				status: 'pending',
				progress: 0,
				width,
				height,
				svgEmbeddedRaster,
			});
			}

			items = [...items, ...newItems];

			// Suggest smart defaults on first batch only
			if (wasEmpty && newItems.length > 0) {
				const result = this.suggestSettings(newItems);
				if (result) {
					this.updateSettings(result.suggested);

				// Re-apply output format to the just-added items
				if (result.suggested.outputFormat !== undefined) {
					items = items.map((item) => {
						if (item.status !== 'pending') return item;
						const fmt = result.suggested.outputFormat!;
						// Embedded-raster SVGs always get WebP regardless of suggested format
						if (item.format === 'svg' && item.svgEmbeddedRaster) {
							return { ...item, outputFormat: 'webp' as OutputFormat };
						}
						if (item.format === 'svg' && fmt === 'same') {
							return { ...item, outputFormat: 'svg' as OutputFormat };
						}
						if (item.format === 'heic' && fmt === 'same') {
							return { ...item, outputFormat: 'webp' as OutputFormat };
						}
						return {
							...item,
							outputFormat: fmt === 'same' ? (item.format as OutputFormat) : fmt,
						};
					});
				}

				toast.info(`Settings adjusted: ${result.reasons.join(', ')}`);
				}
			}

			return newItems;
		},

		updateItem(id: string, updates: Partial<ImageItem>) {
			items = items.map((item) => (item.id === id ? { ...item, ...updates } : item));
		},

		removeItem(id: string) {
			const item = items.find((i) => i.id === id);
			if (item) {
				URL.revokeObjectURL(item.originalUrl);
				if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
				if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
			}
			items = items.filter((i) => i.id !== id);
			// Remove from selection if selected
			if (selectedIds.has(id)) {
				const newSet = new SvelteSet(selectedIds);
				newSet.delete(id);
				selectedIds = newSet;
			}
		},

		clearAll() {
			items.forEach((item) => {
				URL.revokeObjectURL(item.originalUrl);
				if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
				if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
			});
			items = [];
			selectedIds = new Set();
			batchStats = { startTime: null, endTime: null, totalImages: 0 };
		},

		// Clear all without revoking URLs (for undo support)
		clearAllForUndo(): ImageItem[] {
			const clearedItems = [...items];
			items = [];
			selectedIds = new Set();
			batchStats = { startTime: null, endTime: null, totalImages: 0 };
			return clearedItems;
		},

		// Restore items (for undo)
		restoreItems(restoredItems: ImageItem[]) {
			items = restoredItems;
		},

		updateSettings(newSettings: Partial<CompressionSettings>) {
			settings = { ...settings, ...newSettings };
			saveSettings(settings);

			// Update output format for pending items
			if (newSettings.outputFormat !== undefined) {
				items = items.map((item) => {
					if (item.status === 'pending') {
						// HEIC can't use 'same' - default to WebP
						if (item.format === 'heic' && newSettings.outputFormat === 'same') {
							return { ...item, outputFormat: 'webp' as OutputFormat };
						}
						// Embedded-raster SVGs stay as WebP regardless of global setting
						if (item.format === 'svg' && item.svgEmbeddedRaster) {
							return { ...item, outputFormat: 'webp' as OutputFormat };
						}
						// SVG: use 'svg' if 'same', otherwise convert
						if (item.format === 'svg' && newSettings.outputFormat === 'same') {
							return { ...item, outputFormat: 'svg' as OutputFormat };
						}
						return {
							...item,
							outputFormat:
								newSettings.outputFormat === 'same'
									? (item.format as OutputFormat)
									: newSettings.outputFormat!,
						};
					}
					return item;
				});
			}
		},

		getItemById(id: string) {
			return items.find((i) => i.id === id);
		},

		reorderItems(draggedId: string, targetId: string) {
			const draggedIndex = items.findIndex((i) => i.id === draggedId);
			const targetIndex = items.findIndex((i) => i.id === targetId);

			if (draggedIndex === -1 || targetIndex === -1) return;

			const newItems = [...items];
			const [draggedItem] = newItems.splice(draggedIndex, 1);
			newItems.splice(targetIndex, 0, draggedItem);
			items = newItems;
		},

		// Selection methods
		toggleSelection(id: string) {
			const newSet = new SvelteSet(selectedIds);
			if (newSet.has(id)) {
				newSet.delete(id);
			} else {
				newSet.add(id);
			}
			selectedIds = newSet;
		},

		selectAll() {
			selectedIds = new Set(items.map((i) => i.id));
		},

		selectNone() {
			selectedIds = new Set();
		},

		isSelected(id: string) {
			return selectedIds.has(id);
		},

		getSelectedItems() {
			return items.filter((i) => selectedIds.has(i.id));
		},

		removeSelected() {
			const toRemove = items.filter((i) => selectedIds.has(i.id));
			toRemove.forEach((item) => {
				URL.revokeObjectURL(item.originalUrl);
				if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
				if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
			});
			items = items.filter((i) => !selectedIds.has(i.id));
			selectedIds = new Set();
		},
	};
}

export const images = createImagesStore();
