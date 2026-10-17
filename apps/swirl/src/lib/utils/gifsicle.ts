// Gifsicle WASM wrapper for main thread
// gifsicle-wasm-browser handles its own internal workers
// NOTE: its command string is split on spaces with no shell, so never quote arguments.

import { parseGifMetadata } from './gif-parser';

export interface GifProcessingOptions {
	// Optimize options
	targetSizeKB?: number;
	colors?: number;
	lossy?: number;

	// Resize options
	width?: number;
	height?: number;

	// Speed / order options
	speedMultiplier?: number;
	reverse?: boolean;
	boomerang?: boolean;

	// Crop options
	cropX1?: number;
	cropY1?: number;
	cropX2?: number;
	cropY2?: number;
}

export interface ProcessingStats {
	/** False when a target size was requested but could not be reached. */
	targetReached?: boolean;
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

	for (const { data } of inputs) {
		const isGif = data.length > 10 && data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46; // "GIF"
		if (!isGif) throw new Error('This file is not a valid GIF');
	}

	// Convert Uint8Arrays to Blobs
	const inputFiles = inputs.map(({ data, name }) => ({
		file: new Blob([data as unknown as Uint8Array<ArrayBuffer>], { type: 'image/gif' }),
		name,
	}));

	// Command is an array of command strings
	const result = await gs.run({
		input: inputFiles,
		command: [commandString],
	});

	if (!result || result.length === 0) {
		throw new Error('Could not process this GIF (the file may be damaged)');
	}

	const outputBuffer = await result[0].arrayBuffer();
	return new Uint8Array(outputBuffer);
}

// Optimize GIF
//
// With targetSizeKB set, the user's colors/lossy settings are the starting point and are
// tightened step by step until the output fits (or the steps run out).
const TARGET_STEPS = [
	{ lossy: 0, colors: 256 },
	{ lossy: 100, colors: 192 },
	{ lossy: 140, colors: 128 },
	{ lossy: 180, colors: 96 },
	{ lossy: 200, colors: 64 },
	{ lossy: 200, colors: 32 },
];

export async function optimizeGif(
	gifData: ArrayBuffer,
	options: GifProcessingOptions,
	onProgress?: (progress: number) => void
): Promise<{ result: ArrayBuffer; stats: ProcessingStats }> {
	const startTime = performance.now();
	onProgress?.(5);

	const baseLossy = options.lossy ?? 0;
	const baseColors = options.colors ?? 256;
	const targetBytes = options.targetSizeKB ? options.targetSizeKB * 1024 : 0;
	const steps = targetBytes ? TARGET_STEPS : TARGET_STEPS.slice(0, 1);

	let best: Uint8Array | null = null;
	let targetReached = !targetBytes;

	for (let i = 0; i < steps.length; i++) {
		const lossy = Math.max(baseLossy, steps[i].lossy);
		const colors = Math.min(baseColors, steps[i].colors);

		// -O3 is much slower per pass and only worth it for the single-pass (no target) case
		let cmd = targetBytes ? '-O2' : '-O3';
		if (colors < 256) cmd += ` --colors=${colors}`;
		if (lossy > 0) cmd += ` --lossy=${lossy}`;
		cmd += ' input.gif -o /out/output.gif';

		const out = await runGifsicle([{ data: new Uint8Array(gifData), name: 'input.gif' }], cmd);
		if (!best || out.byteLength < best.byteLength) best = out;
		onProgress?.(Math.round(10 + ((i + 1) / steps.length) * 85));

		if (targetBytes && best.byteLength <= targetBytes) {
			targetReached = true;
			break;
		}
	}

	const result = best!;
	onProgress?.(100);

	return {
		result: result.buffer as ArrayBuffer,
		stats: {
			targetReached,
			originalSize: gifData.byteLength,
			outputSize: result.byteLength,
			framesProcessed: 0,
			processingTimeMs: performance.now() - startTime,
		},
	};
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

	const result = await runGifsicle([{ data: new Uint8Array(gifData), name: 'input.gif' }], cmd);

	onProgress?.(90);

	const stats: ProcessingStats = {
		originalSize: gifData.byteLength,
		outputSize: result.byteLength,
		framesProcessed: 0,
		processingTimeMs: performance.now() - startTime,
	};

	onProgress?.(100);

	return { result: result.buffer as ArrayBuffer, stats };
}

/**
 * Re-time and/or re-order frames. Delays are scaled per frame (so GIFs with variable timing
 * keep their rhythm), and frames are unoptimized first so reordering is safe.
 */
async function remixGif(
	gifData: ArrayBuffer,
	options: GifProcessingOptions,
	onProgress?: (progress: number) => void
): Promise<{ result: ArrayBuffer; stats: ProcessingStats }> {
	const startTime = performance.now();
	onProgress?.(10);

	const meta = await parseGifMetadata(gifData);
	const n = meta.frameCount;
	if (n === 0) throw new Error('This GIF has no frames');

	const speed =
		options.speedMultiplier && options.speedMultiplier > 0 ? options.speedMultiplier : 1;
	const forward = Array.from({ length: n }, (_, i) => i);
	let order = forward;
	if (options.boomerang) {
		order = n > 2 ? [...forward, ...forward.slice(1, -1).reverse()] : forward;
	} else if (options.reverse) {
		order = [...forward].reverse();
	}

	// Group consecutive frames that share a delay into one selector ("#a-b").
	const delayCs = (i: number) =>
		speed === 1 ? 0 : Math.min(65535, Math.max(2, Math.round(meta.delays[i] / 10 / speed)));
	const parts: string[] = [];
	let runStart = 0;
	let dir = 0;
	for (let k = 1; k <= order.length; k++) {
		const step = k < order.length ? order[k] - order[k - 1] : 0;
		const extendsRun =
			k < order.length &&
			Math.abs(step) === 1 &&
			(dir === 0 || step === dir) &&
			delayCs(order[k]) === delayCs(order[runStart]);
		if (extendsRun) {
			dir = step;
			continue;
		}
		const first = order[runStart];
		const last = order[k - 1];
		parts.push(
			(speed === 1 ? '' : `-d${delayCs(first)} `) +
				(first === last ? `#${first}` : `#${first}-${last}`)
		);
		runStart = k;
		dir = 0;
	}

	const cmd = `-U input.gif ${parts.join(' ')} -O2 -o /out/output.gif`;
	onProgress?.(40);

	const result = await runGifsicle([{ data: new Uint8Array(gifData), name: 'input.gif' }], cmd);
	onProgress?.(100);

	return {
		result: result.buffer as ArrayBuffer,
		stats: {
			originalSize: gifData.byteLength,
			outputSize: result.byteLength,
			framesProcessed: order.length,
			processingTimeMs: performance.now() - startTime,
		},
	};
}

// Change GIF speed (optionally combined with reverse / boomerang)
export function changeGifSpeed(
	gifData: ArrayBuffer,
	options: GifProcessingOptions,
	onProgress?: (progress: number) => void
) {
	return remixGif(gifData, options, onProgress);
}

// Reverse GIF, or play forward then backward when options.boomerang is set
export function reverseGif(
	gifData: ArrayBuffer,
	options: GifProcessingOptions,
	onProgress?: (progress: number) => void
) {
	return remixGif(gifData, { ...options, reverse: !options.boomerang }, onProgress);
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

	const result = await runGifsicle([{ data: new Uint8Array(gifData), name: 'input.gif' }], cmd);

	onProgress?.(90);

	const stats: ProcessingStats = {
		originalSize: gifData.byteLength,
		outputSize: result.byteLength,
		framesProcessed: 0,
		processingTimeMs: performance.now() - startTime,
	};

	onProgress?.(100);

	return { result: result.buffer as ArrayBuffer, stats };
}
