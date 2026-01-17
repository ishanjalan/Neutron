// Gifsicle WASM wrapper for main thread
// gifsicle-wasm-browser handles its own internal workers

export interface GifProcessingOptions {
	// Optimize options
	targetSizeKB?: number;
	colors?: number;
	lossy?: number;
	
	// Resize options
	width?: number;
	height?: number;
	fit?: 'contain' | 'cover' | 'fill';
	
	// Speed options
	speedMultiplier?: number;
	reverse?: boolean;
	boomerang?: boolean;
	
	// Merge options
	mode?: 'sequential' | 'horizontal' | 'vertical';
	normalizeSize?: boolean;
	outputWidth?: number;
	
	// Crop options
	cropX1?: number;
	cropY1?: number;
	cropX2?: number;
	cropY2?: number;
}

export interface ProcessingStats {
	originalSize: number;
	outputSize: number;
	framesProcessed: number;
	processingTimeMs: number;
}

interface GifsicleModule {
	run: (options: {
		input: Array<{ file: Blob | File; name: string }>;
		command: string[];
	}) => Promise<File[]>;
}

let gifsicle: GifsicleModule | null = null;
let initialized = false;

// Initialize gifsicle (lazy load)
async function init(): Promise<GifsicleModule> {
	if (initialized && gifsicle) return gifsicle;

	const module = await import('gifsicle-wasm-browser');
	gifsicle = module.default || module;
	initialized = true;

	if (!gifsicle?.run) {
		throw new Error('Failed to initialize gifsicle');
	}

	return gifsicle;
}

// Run gifsicle with a command string
async function runGifsicle(
	inputs: Array<{ data: Uint8Array; name: string }>,
	commandString: string
): Promise<Uint8Array> {
	const gs = await init();

	// Convert Uint8Arrays to Blobs
	const inputFiles = inputs.map(({ data, name }) => ({
		file: new Blob([data], { type: 'image/gif' }),
		name
	}));

	// Command is an array of command strings
	const result = await gs.run({
		input: inputFiles,
		command: [commandString]
	});

	if (!result || result.length === 0) {
		throw new Error('Gifsicle produced no output');
	}

	const outputBuffer = await result[0].arrayBuffer();
	return new Uint8Array(outputBuffer);
}

// Optimize GIF
export async function optimizeGif(
	gifData: ArrayBuffer,
	options: GifProcessingOptions,
	onProgress?: (progress: number) => void
): Promise<{ result: ArrayBuffer; stats: ProcessingStats }> {
	const startTime = performance.now();
	onProgress?.(10);

	// Build command string
	let cmd = '-O3';

	if (options.colors && options.colors < 256) {
		cmd += ` --colors=${options.colors}`;
	}

	if (options.lossy && options.lossy > 0) {
		cmd += ` --lossy=${options.lossy}`;
	}

	cmd += ' input.gif -o /out/output.gif';

	onProgress?.(30);

	const result = await runGifsicle(
		[{ data: new Uint8Array(gifData), name: 'input.gif' }],
		cmd
	);

	onProgress?.(90);

	const stats: ProcessingStats = {
		originalSize: gifData.byteLength,
		outputSize: result.byteLength,
		framesProcessed: 0,
		processingTimeMs: performance.now() - startTime
	};

	onProgress?.(100);

	return { result: result.buffer as ArrayBuffer, stats };
}

// Resize GIF
export async function resizeGif(
	gifData: ArrayBuffer,
	options: GifProcessingOptions,
	onProgress?: (progress: number) => void
): Promise<{ result: ArrayBuffer; stats: ProcessingStats }> {
	const startTime = performance.now();
	onProgress?.(10);

	let cmd = '-O2';

	if (options.width && options.height) {
		cmd += ` --resize=${options.width}x${options.height}`;
	} else if (options.width) {
		cmd += ` --resize-width=${options.width}`;
	} else if (options.height) {
		cmd += ` --resize-height=${options.height}`;
	}

	if (options.colors) {
		cmd += ` --colors=${options.colors}`;
	}

	cmd += ' input.gif -o /out/output.gif';

	onProgress?.(50);

	const result = await runGifsicle(
		[{ data: new Uint8Array(gifData), name: 'input.gif' }],
		cmd
	);

	onProgress?.(90);

	const stats: ProcessingStats = {
		originalSize: gifData.byteLength,
		outputSize: result.byteLength,
		framesProcessed: 0,
		processingTimeMs: performance.now() - startTime
	};

	onProgress?.(100);

	return { result: result.buffer as ArrayBuffer, stats };
}

// Change GIF speed
export async function changeGifSpeed(
	gifData: ArrayBuffer,
	options: GifProcessingOptions,
	onProgress?: (progress: number) => void
): Promise<{ result: ArrayBuffer; stats: ProcessingStats }> {
	const startTime = performance.now();
	onProgress?.(10);

	let cmd = '';
	const speedMultiplier = options.speedMultiplier || 1;

	if (speedMultiplier !== 1) {
		const delayFactor = Math.round(100 / speedMultiplier) / 100;
		cmd += `-d${Math.max(1, Math.round(10 * delayFactor))} `;
	}

	cmd += '-O2 input.gif -o /out/output.gif';

	onProgress?.(50);

	const result = await runGifsicle(
		[{ data: new Uint8Array(gifData), name: 'input.gif' }],
		cmd
	);

	onProgress?.(90);

	const stats: ProcessingStats = {
		originalSize: gifData.byteLength,
		outputSize: result.byteLength,
		framesProcessed: 0,
		processingTimeMs: performance.now() - startTime
	};

	onProgress?.(100);

	return { result: result.buffer as ArrayBuffer, stats };
}

// Reverse GIF
export async function reverseGif(
	gifData: ArrayBuffer,
	options: GifProcessingOptions,
	onProgress?: (progress: number) => void
): Promise<{ result: ArrayBuffer; stats: ProcessingStats }> {
	const startTime = performance.now();
	onProgress?.(10);

	const cmd = '-O2 --reverse input.gif -o /out/output.gif';

	onProgress?.(50);

	const result = await runGifsicle(
		[{ data: new Uint8Array(gifData), name: 'input.gif' }],
		cmd
	);

	onProgress?.(90);

	const stats: ProcessingStats = {
		originalSize: gifData.byteLength,
		outputSize: result.byteLength,
		framesProcessed: 0,
		processingTimeMs: performance.now() - startTime
	};

	onProgress?.(100);

	return { result: result.buffer as ArrayBuffer, stats };
}

// Crop GIF
export async function cropGif(
	gifData: ArrayBuffer,
	options: GifProcessingOptions,
	onProgress?: (progress: number) => void
): Promise<{ result: ArrayBuffer; stats: ProcessingStats }> {
	const startTime = performance.now();
	onProgress?.(10);

	if (
		options.cropX1 === undefined ||
		options.cropY1 === undefined ||
		options.cropX2 === undefined ||
		options.cropY2 === undefined
	) {
		throw new Error('Crop coordinates are required');
	}

	const cmd = `-O2 --crop=${options.cropX1},${options.cropY1}-${options.cropX2},${options.cropY2} input.gif -o /out/output.gif`;

	onProgress?.(50);

	const result = await runGifsicle(
		[{ data: new Uint8Array(gifData), name: 'input.gif' }],
		cmd
	);

	onProgress?.(90);

	const stats: ProcessingStats = {
		originalSize: gifData.byteLength,
		outputSize: result.byteLength,
		framesProcessed: 0,
		processingTimeMs: performance.now() - startTime
	};

	onProgress?.(100);

	return { result: result.buffer as ArrayBuffer, stats };
}

// Merge GIFs
export async function mergeGifs(
	gifData1: ArrayBuffer,
	gifData2: ArrayBuffer,
	options: GifProcessingOptions,
	onProgress?: (progress: number) => void
): Promise<{ result: ArrayBuffer; stats: ProcessingStats }> {
	const startTime = performance.now();
	onProgress?.(10);

	let cmd = '-O2';
	const mode = options.mode || 'sequential';

	if (options.normalizeSize && options.outputWidth) {
		cmd += ` --resize-width=${options.outputWidth}`;
	}

	switch (mode) {
		case 'sequential':
			cmd += ' input1.gif --append input2.gif -o /out/output.gif';
			break;
		case 'horizontal':
		case 'vertical':
			cmd += ' --merge input1.gif input2.gif -o /out/output.gif';
			break;
	}

	onProgress?.(50);

	const result = await runGifsicle(
		[
			{ data: new Uint8Array(gifData1), name: 'input1.gif' },
			{ data: new Uint8Array(gifData2), name: 'input2.gif' }
		],
		cmd
	);

	onProgress?.(90);

	const stats: ProcessingStats = {
		originalSize: gifData1.byteLength + gifData2.byteLength,
		outputSize: result.byteLength,
		framesProcessed: 0,
		processingTimeMs: performance.now() - startTime
	};

	onProgress?.(100);

	return { result: result.buffer as ArrayBuffer, stats };
}
