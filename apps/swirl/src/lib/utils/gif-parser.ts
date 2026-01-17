/**
 * GIF Metadata Parser
 * Extracts duration, frame count, FPS, and dimensions from GIF files
 */

export interface GifMetadata {
	width: number;
	height: number;
	frameCount: number;
	duration: number; // in seconds
	fps: number;
	delays: number[]; // individual frame delays in ms
	hasGlobalColorTable: boolean;
	colorTableSize: number;
}

export interface FrameInfo {
	delay: number; // in ms
	disposalMethod: number;
	left: number;
	top: number;
	width: number;
	height: number;
}

/**
 * Parse GIF metadata from an ArrayBuffer
 */
export async function parseGifMetadata(buffer: ArrayBuffer): Promise<GifMetadata> {
	const view = new DataView(buffer);
	const bytes = new Uint8Array(buffer);
	
	// Verify GIF signature
	const signature = String.fromCharCode(bytes[0], bytes[1], bytes[2]);
	const version = String.fromCharCode(bytes[3], bytes[4], bytes[5]);
	
	if (signature !== 'GIF' || (version !== '89a' && version !== '87a')) {
		throw new Error('Invalid GIF file');
	}
	
	// Logical Screen Descriptor
	const width = view.getUint16(6, true);
	const height = view.getUint16(8, true);
	
	const packedField = bytes[10];
	const hasGlobalColorTable = (packedField & 0x80) !== 0;
	const colorTableSize = hasGlobalColorTable ? Math.pow(2, (packedField & 0x07) + 1) : 0;
	
	// Skip global color table if present
	let offset = 13;
	if (hasGlobalColorTable) {
		offset += colorTableSize * 3;
	}
	
	// Parse frames
	const frames: FrameInfo[] = [];
	let currentDelay = 100; // default delay in ms
	
	while (offset < bytes.length) {
		const blockType = bytes[offset];
		offset++;
		
		if (blockType === 0x21) {
			// Extension block
			const extType = bytes[offset];
			offset++;
			
			if (extType === 0xF9) {
				// Graphics Control Extension
				const blockSize = bytes[offset];
				offset++;
				
				if (blockSize >= 4) {
					const packed = bytes[offset];
					const disposalMethod = (packed >> 2) & 0x07;
					
					// Delay time is in centiseconds (1/100 of a second)
					const delayCs = view.getUint16(offset + 1, true);
					currentDelay = delayCs * 10; // Convert to ms
					
					// Minimum delay of 10ms (some GIFs have 0 delay which means use default)
					if (currentDelay === 0) {
						currentDelay = 100;
					}
				}
				
				offset += blockSize;
				
				// Skip block terminator
				while (bytes[offset] !== 0 && offset < bytes.length) {
					offset += bytes[offset] + 1;
				}
				offset++; // Skip terminator
				
			} else if (extType === 0xFF) {
				// Application Extension (like NETSCAPE for looping)
				const blockSize = bytes[offset];
				offset++;
				offset += blockSize;
				
				// Skip sub-blocks
				while (bytes[offset] !== 0 && offset < bytes.length) {
					offset += bytes[offset] + 1;
				}
				offset++; // Skip terminator
				
			} else if (extType === 0xFE) {
				// Comment Extension
				while (bytes[offset] !== 0 && offset < bytes.length) {
					offset += bytes[offset] + 1;
				}
				offset++; // Skip terminator
				
			} else {
				// Unknown extension - skip
				while (bytes[offset] !== 0 && offset < bytes.length) {
					offset += bytes[offset] + 1;
				}
				offset++; // Skip terminator
			}
			
		} else if (blockType === 0x2C) {
			// Image Descriptor - this is a frame
			const frameLeft = view.getUint16(offset, true);
			const frameTop = view.getUint16(offset + 2, true);
			const frameWidth = view.getUint16(offset + 4, true);
			const frameHeight = view.getUint16(offset + 6, true);
			const framePacked = bytes[offset + 8];
			offset += 9;
			
			// Local color table
			const hasLocalColorTable = (framePacked & 0x80) !== 0;
			if (hasLocalColorTable) {
				const localColorTableSize = Math.pow(2, (framePacked & 0x07) + 1);
				offset += localColorTableSize * 3;
			}
			
			frames.push({
				delay: currentDelay,
				disposalMethod: 0, // We don't track this per-frame in this simplified version
				left: frameLeft,
				top: frameTop,
				width: frameWidth,
				height: frameHeight
			});
			
			// Skip LZW minimum code size
			offset++;
			
			// Skip image data sub-blocks
			while (bytes[offset] !== 0 && offset < bytes.length) {
				offset += bytes[offset] + 1;
			}
			offset++; // Skip block terminator
			
			// Reset delay to default for next frame
			currentDelay = 100;
			
		} else if (blockType === 0x3B) {
			// Trailer - end of GIF
			break;
			
		} else {
			// Unknown block - try to skip
			offset++;
		}
	}
	
	// Calculate totals
	const delays = frames.map(f => f.delay);
	const totalDuration = delays.reduce((sum, d) => sum + d, 0);
	const durationSeconds = totalDuration / 1000;
	const fps = frames.length > 0 && durationSeconds > 0 
		? Math.round((frames.length / durationSeconds) * 10) / 10 
		: 10;
	
	return {
		width,
		height,
		frameCount: frames.length,
		duration: durationSeconds,
		fps,
		delays,
		hasGlobalColorTable,
		colorTableSize
	};
}

/**
 * Parse GIF metadata from a File
 */
export async function parseGifFile(file: File): Promise<GifMetadata> {
	const buffer = await file.arrayBuffer();
	return parseGifMetadata(buffer);
}

/**
 * Parse GIF metadata from a URL
 */
export async function parseGifUrl(url: string): Promise<GifMetadata> {
	const response = await fetch(url);
	const buffer = await response.arrayBuffer();
	return parseGifMetadata(buffer);
}

/**
 * Format duration as human-readable string
 */
export function formatDuration(seconds: number): string {
	if (seconds < 1) {
		return `${Math.round(seconds * 1000)}ms`;
	} else if (seconds < 60) {
		return `${seconds.toFixed(2)}s`;
	} else {
		const mins = Math.floor(seconds / 60);
		const secs = (seconds % 60).toFixed(1);
		return `${mins}m ${secs}s`;
	}
}

/**
 * Format file size as human-readable string
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Alias for backwards compatibility
export const formatBytes = formatFileSize;

/**
 * Get a summary string of GIF metadata
 */
export function getMetadataSummary(metadata: GifMetadata): string {
	return `${formatDuration(metadata.duration)} • ${metadata.frameCount} frames • ${metadata.fps} FPS • ${metadata.width}×${metadata.height}`;
}
