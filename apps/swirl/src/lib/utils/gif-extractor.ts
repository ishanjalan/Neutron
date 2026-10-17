/**
 * GIF Frame Extractor
 * Extracts individual frames from GIF files as PNG images
 */

export interface ExtractedFrame {
	index: number;
	delay: number; // in ms
	blob: Blob;
	url: string;
	width: number;
	height: number;
}

export interface ExtractionProgress {
	current: number;
	total: number;
	percentage: number;
}

/**
 * Extract frames from a GIF file using the ImageDecoder API.
 * There is no reliable fallback (a canvas can only show a GIF's first frame), so browsers
 * without ImageDecoder get a clear error instead of a silently frozen result.
 */
export async function extractGifFrames(
	file: File,
	onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractedFrame[]> {
	if (!('ImageDecoder' in window)) {
		throw new Error(
			'This tool needs a browser that supports ImageDecoder (Chrome, Edge, or Safari 17+). Firefox is not supported yet.'
		);
	}
	try {
		return await extractWithImageDecoder(file, onProgress);
	} catch (error) {
		console.error('GIF frame extraction failed:', error);
		throw new Error("Couldn't decode this GIF. The file may be damaged.", { cause: error });
	}
}

/**
 * Extract frames using the modern ImageDecoder API
 */
async function extractWithImageDecoder(
	file: File,
	onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractedFrame[]> {
	const buffer = await file.arrayBuffer();

	const decoder = new ImageDecoder({
		data: buffer,
		type: 'image/gif',
	});

	await decoder.decode({ frameIndex: 0 }); // Wait for metadata

	const frameCount = decoder.tracks.selectedTrack?.frameCount || 0;
	const frames: ExtractedFrame[] = [];

	for (let i = 0; i < frameCount; i++) {
		const result = await decoder.decode({ frameIndex: i });
		const frame = result.image;

		// Create canvas and draw frame
		const canvas = document.createElement('canvas');
		canvas.width = frame.displayWidth;
		canvas.height = frame.displayHeight;
		const ctx = canvas.getContext('2d')!;
		ctx.drawImage(frame, 0, 0);

		// Convert to blob
		const blob = await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob((b) => {
				if (b) {
					canvas.width = 0;
					canvas.height = 0;
					resolve(b);
				} else reject(new Error('Failed to create blob'));
			}, 'image/png');
		});

		// Get delay from track info (in microseconds, convert to ms)
		const duration = result.image.duration || 100000; // default 100ms
		const delay = Math.round(duration / 1000);

		frames.push({
			index: i,
			delay: delay || 100,
			blob,
			url: URL.createObjectURL(blob),
			width: frame.displayWidth,
			height: frame.displayHeight,
		});

		frame.close();

		onProgress?.({
			current: i + 1,
			total: frameCount,
			percentage: Math.round(((i + 1) / frameCount) * 100),
		});
	}

	decoder.close();
	return frames;
}
