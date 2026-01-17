export type VideoFormat = 'mp4' | 'webm' | 'mov' | 'avi' | 'mkv';
export type OutputFormat = 'mp4' | 'webm' | 'av1' | 'hevc';
export type VideoStatus = 'pending' | 'processing' | 'completed' | 'error';
export type Resolution = 'original' | '2160p' | '1440p' | '1080p' | '720p' | '480p' | '360p';
export type AudioCodec = 'aac' | 'opus' | 'mp3' | 'copy' | 'none';

export interface VideoItem {
	id: string;
	file: File;
	name: string;
	originalSize: number;
	compressedSize?: number;
	originalUrl: string;
	compressedUrl?: string;
	compressedBlob?: Blob;
	format: VideoFormat;
	outputFormat: OutputFormat;
	status: VideoStatus;
	progress: number;
	progressStage?: string;
	eta?: number; // Estimated time remaining in seconds
	error?: string;
	width?: number;
	height?: number;
	duration?: number; // in seconds
	bitrate?: number; // bits per second
	previewUrl?: string;
	compressionDuration?: number; // How long compression took in ms
	// Trim settings
	trimStart?: number; // Start time in seconds
	trimEnd?: number; // End time in seconds
}

export interface CompressionSettings {
	quality: 'tiny' | 'web' | 'social' | 'high' | 'lossless';
	outputFormat: OutputFormat;
	resolution: Resolution;
	audioBitrate: '64k' | '128k' | '192k' | '256k' | '320k';
	audioCodec: AudioCodec;
	stripMetadata: boolean;
	twoPass: boolean;
	preset: 'ultrafast' | 'veryfast' | 'fast' | 'medium' | 'slow' | 'veryslow';
	targetSizeMB?: number; // Target file size in MB (mutually exclusive with quality presets)
}

// Common file size targets
export const SIZE_PRESETS = {
	whatsapp: { label: 'WhatsApp', sizeMB: 16, icon: '📱' },
	email: { label: 'Email', sizeMB: 25, icon: '📧' },
	discord: { label: 'Discord', sizeMB: 50, icon: '💬' },
	telegram: { label: 'Telegram', sizeMB: 100, icon: '✈️' }
} as const;

// Quality presets - CRF values (lower = better quality, larger file)
export const QUALITY_PRESETS = {
	tiny: {
		crf: 35,
		label: 'Tiny',
		desc: 'Max compression',
		targetBitrate: '500k',
		preset: 'fast'
	},
	web: {
		crf: 28,
		label: 'Web',
		desc: 'Balanced',
		targetBitrate: '1000k',
		preset: 'medium'
	},
	social: {
		crf: 23,
		label: 'Social',
		desc: 'Social media',
		targetBitrate: '2000k',
		preset: 'medium'
	},
	high: {
		crf: 18,
		label: 'High',
		desc: 'High quality',
		targetBitrate: '4000k',
		preset: 'slow'
	},
	lossless: {
		crf: 0,
		label: 'Max Quality',
		desc: 'Visually lossless',
		targetBitrate: '0',
		preset: 'veryslow'
	}
} as const;

export const RESOLUTION_OPTIONS: { value: Resolution; label: string; pixels: string }[] = [
	{ value: 'original', label: 'Original', pixels: '' },
	{ value: '2160p', label: '4K', pixels: '3840×2160' },
	{ value: '1440p', label: '2K', pixels: '2560×1440' },
	{ value: '1080p', label: 'Full HD', pixels: '1920×1080' },
	{ value: '720p', label: 'HD', pixels: '1280×720' },
	{ value: '480p', label: 'SD', pixels: '854×480' },
	{ value: '360p', label: 'Low', pixels: '640×360' }
];

export const AUDIO_BITRATE_OPTIONS = [
	{ value: '64k', label: '64 kbps', desc: 'Low' },
	{ value: '128k', label: '128 kbps', desc: 'Standard' },
	{ value: '192k', label: '192 kbps', desc: 'Good' },
	{ value: '256k', label: '256 kbps', desc: 'High' },
	{ value: '320k', label: '320 kbps', desc: 'Best' }
] as const;

const SETTINGS_KEY = 'squash-settings-v2';

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
		quality: 'web',
		outputFormat: 'mp4',
		resolution: 'original',
		audioBitrate: '128k',
		audioCodec: 'aac',
		stripMetadata: false,
		twoPass: false,
		preset: 'medium',
		targetSizeMB: undefined
	};
}

// Parse bitrate string to number (e.g., '1000k' -> 1000000)
function parseBitrate(bitrate: string): number {
	const match = bitrate.match(/^(\d+)([kmg])?$/i);
	if (!match) return 1000000;
	
	const value = parseInt(match[1], 10);
	const unit = match[2]?.toLowerCase();
	
	switch (unit) {
		case 'k': return value * 1000;
		case 'm': return value * 1000000;
		case 'g': return value * 1000000000;
		default: return value;
	}
}

// Estimate output file size based on settings
export function estimateFileSize(
	video: VideoItem,
	settings: CompressionSettings
): number {
	// If target size is set, return that
	if (settings.targetSizeMB) {
		return settings.targetSizeMB * 1024 * 1024;
	}

	const duration = getEffectiveDuration(video);
	if (!duration || duration <= 0) return 0;

	// Get video bitrate from quality preset
	const preset = QUALITY_PRESETS[settings.quality];
	const videoBitrate = parseBitrate(preset.targetBitrate);
	
	// Lossless mode uses original bitrate as estimate
	if (settings.quality === 'lossless') {
		return video.originalSize * 0.9; // Slightly smaller due to better codec
	}

	// Get audio bitrate
	let audioBitrate = 0;
	if (settings.audioCodec !== 'none') {
		const audioBitrateMap: Record<string, number> = {
			'64k': 64000,
			'128k': 128000,
			'192k': 192000,
			'256k': 256000,
			'320k': 320000
		};
		audioBitrate = audioBitrateMap[settings.audioBitrate] || 128000;
	}

	// Calculate: (video_bitrate + audio_bitrate) * duration / 8
	const totalBitrate = videoBitrate + audioBitrate;
	const estimatedBytes = (totalBitrate * duration) / 8;

	return Math.round(estimatedBytes);
}

// Calculate required bitrate for a target file size
export function calculateBitrateForSize(
	video: VideoItem,
	targetSizeMB: number,
	settings: CompressionSettings
): number {
	const duration = getEffectiveDuration(video);
	if (!duration || duration <= 0) return 2000000; // Default 2Mbps

	const targetBytes = targetSizeMB * 1024 * 1024;
	
	// Reserve some bytes for audio
	let audioBitrate = 0;
	if (settings.audioCodec !== 'none') {
		const audioBitrateMap: Record<string, number> = {
			'64k': 64000,
			'128k': 128000,
			'192k': 192000,
			'256k': 256000,
			'320k': 320000
		};
		audioBitrate = audioBitrateMap[settings.audioBitrate] || 128000;
	}
	
	const audioBytes = (audioBitrate * duration) / 8;
	const availableBytesForVideo = targetBytes - audioBytes;
	
	if (availableBytesForVideo <= 0) {
		return 100000; // Minimum bitrate
	}

	// Calculate video bitrate: (bytes * 8) / duration
	const videoBitrate = (availableBytesForVideo * 8) / duration;
	
	// Clamp to reasonable range
	return Math.max(100000, Math.min(20000000, Math.round(videoBitrate)));
}

// Get effective duration considering trim settings
export function getEffectiveDuration(video: VideoItem): number {
	const fullDuration = video.duration || 0;
	
	if (video.trimStart !== undefined || video.trimEnd !== undefined) {
		const start = video.trimStart || 0;
		const end = video.trimEnd ?? fullDuration;
		return Math.max(0, end - start);
	}
	
	return fullDuration;
}

// Extract video metadata
async function getVideoMetadata(
	file: File
): Promise<{ width: number; height: number; duration: number; bitrate: number }> {
	return new Promise((resolve, reject) => {
		const video = document.createElement('video');
		video.preload = 'metadata';
		const url = URL.createObjectURL(file);

		video.onloadedmetadata = () => {
			URL.revokeObjectURL(url);
			const bitrate = (file.size * 8) / video.duration; // bits per second
			resolve({
				width: video.videoWidth,
				height: video.videoHeight,
				duration: video.duration,
				bitrate
			});
		};

		video.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load video metadata'));
		};

		video.src = url;
	});
}

// Smart quality suggestion based on source video
export function suggestOptimalSettings(video: VideoItem): {
	preset: keyof typeof QUALITY_PRESETS;
	format: OutputFormat;
	resolution: Resolution;
	note: string;
} {
	const { width, height, bitrate, duration } = video;

	// Very high bitrate source - good compression potential
	if (bitrate && bitrate > 20_000_000) {
		return {
			preset: 'web',
			format: 'mp4',
			resolution: 'original',
			note: 'High bitrate source detected - excellent compression potential'
		};
	}

	// 4K content
	if (width && width >= 3840) {
		return {
			preset: 'social',
			format: 'mp4',
			resolution: '1080p',
			note: '4K source - consider downscaling for web use'
		};
	}

	// Long video
	if (duration && duration > 600) {
		return {
			preset: 'tiny',
			format: 'mp4',
			resolution: 'original',
			note: 'Long video - maximum compression recommended'
		};
	}

	// Short clip (under 30 seconds)
	if (duration && duration < 30) {
		return {
			preset: 'high',
			format: 'mp4',
			resolution: 'original',
			note: 'Short clip - quality preservation recommended'
		};
	}

	// Already low bitrate
	if (bitrate && bitrate < 2_000_000) {
		return {
			preset: 'high',
			format: 'mp4',
			resolution: 'original',
			note: 'Low bitrate source - minimal compression advised'
		};
	}

	return {
		preset: 'web',
		format: 'mp4',
		resolution: 'original',
		note: 'Balanced settings for general use'
	};
}

// Estimate compression time
export function estimateCompressionTime(
	video: VideoItem,
	settings: CompressionSettings
): number {
	const { width = 1920, height = 1080, duration = 60 } = video;
	const pixels = width * height;
	const preset = QUALITY_PRESETS[settings.quality];

	// Base time: roughly 0.5-2 seconds per second of video for average resolution
	let baseMultiplier = 1;

	// Adjust for resolution
	const pixelFactor = pixels / (1920 * 1080);
	baseMultiplier *= Math.sqrt(pixelFactor);

	// Adjust for quality preset (slower = longer)
	const presetMultipliers: Record<string, number> = {
		ultrafast: 0.3,
		veryfast: 0.5,
		fast: 0.7,
		medium: 1,
		slow: 1.5,
		veryslow: 2.5
	};
	baseMultiplier *= presetMultipliers[settings.preset] || 1;

	// Adjust for format
	if (settings.outputFormat === 'webm') {
		baseMultiplier *= 1.5; // VP9 is slower than H.264
	} else if (settings.outputFormat === 'av1') {
		baseMultiplier *= 0.8; // AV1 with hardware is fast
	}

	// Adjust for two-pass
	if (settings.twoPass) {
		baseMultiplier *= 1.8;
	}

	// Adjust for thread count (rough estimate)
	const threads = Math.max(2, navigator.hardwareConcurrency - 2);
	baseMultiplier /= Math.sqrt(threads / 4);

	// Final estimate in seconds
	return Math.round(duration * baseMultiplier);
}

function createVideosStore() {
	let items = $state<VideoItem[]>([]);
	let settings = $state<CompressionSettings>(loadSettings());

	function getFormatFromMime(mimeType: string): VideoFormat {
		const map: Record<string, VideoFormat> = {
			'video/mp4': 'mp4',
			'video/webm': 'webm',
			'video/quicktime': 'mov',
			'video/x-msvideo': 'avi',
			'video/avi': 'avi',
			'video/x-matroska': 'mkv'
		};
		return map[mimeType] || 'mp4';
	}

	function generateId(): string {
		return `vid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	}

	return {
		get items() {
			return items;
		},
		get settings() {
			return settings;
		},

		async addFiles(files: FileList | File[]) {
			const validTypes = [
				'video/mp4',
				'video/webm',
				'video/quicktime',
				'video/x-msvideo',
				'video/avi',
				'video/x-matroska'
			];

			const newItems: VideoItem[] = [];

			for (const file of files) {
				if (!validTypes.includes(file.type)) continue;

				const format = getFormatFromMime(file.type);

				// Get video metadata
				let width: number | undefined;
				let height: number | undefined;
				let duration: number | undefined;
				let bitrate: number | undefined;

				try {
					const metadata = await getVideoMetadata(file);
					width = metadata.width;
					height = metadata.height;
					duration = metadata.duration;
					bitrate = metadata.bitrate;
				} catch (e) {
					console.warn('Failed to get metadata for', file.name);
				}

				newItems.push({
					id: generateId(),
					file,
					name: file.name,
					originalSize: file.size,
					originalUrl: URL.createObjectURL(file),
					format,
					outputFormat: settings.outputFormat,
					status: 'pending',
					progress: 0,
					width,
					height,
					duration,
					bitrate
				});
			}

			items = [...items, ...newItems];
			return newItems;
		},

		updateItem(id: string, updates: Partial<VideoItem>) {
			items = items.map((item) => (item.id === id ? { ...item, ...updates } : item));
		},

		removeItem(id: string) {
			const item = items.find((i) => i.id === id);
			if (item) {
				URL.revokeObjectURL(item.originalUrl);
				if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
				if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
			}
			items = items.filter((i) => i.id !== id);
		},

		clearAll() {
			items.forEach((item) => {
				URL.revokeObjectURL(item.originalUrl);
				if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
				if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
			});
			items = [];
		},

		updateSettings(newSettings: Partial<CompressionSettings>) {
			settings = { ...settings, ...newSettings };
			saveSettings(settings);

			// Update output format for pending items
			if (newSettings.outputFormat !== undefined) {
				items = items.map((item) => {
					if (item.status === 'pending') {
						return {
							...item,
							outputFormat: newSettings.outputFormat!
						};
					}
					return item;
				});
			}
		},

		getItemById(id: string) {
			return items.find((i) => i.id === id);
		},

		// Reorder items (for drag-and-drop)
		reorderItems(fromIndex: number, toIndex: number) {
			const newItems = [...items];
			const [removed] = newItems.splice(fromIndex, 1);
			newItems.splice(toIndex, 0, removed);
			items = newItems;
		},

		// Get pending items for queue processing
		getPendingItems() {
			return items.filter((i) => i.status === 'pending');
		},

		// Get completed items
		getCompletedItems() {
			return items.filter((i) => i.status === 'completed');
		}
	};
}

export const videos = createVideosStore();
