/**
 * Planning for "compress to X MB".
 *
 * Hardware encoders don't take a file size, only a bitrate, so we derive one from
 * the duration and size budget, pick a resolution the bitrate can actually support,
 * and (in compress.ts) measure the result and re-plan if it came out too big.
 */

export type PlanCodec = 'avc' | 'vp9' | 'hevc' | 'av1';
export type AudioMode = 'encode' | 'copy' | 'none';

/** Bits per pixel per frame needed for acceptable quality, by codec efficiency. */
const MIN_BITS_PER_PIXEL: Record<PlanCodec, number> = {
	avc: 0.07,
	vp9: 0.055,
	hevc: 0.05,
	av1: 0.045,
};

/** Aim a little under the target — muxing overhead and rate-control drift eat into it. */
const SAFETY = 0.95;
export const MIN_VIDEO_BITRATE = 150_000;
const MAX_PLANNED_FPS = 30;
/** Short-side heights we will step down through, largest first. */
const LADDER = [2160, 1440, 1080, 720, 540, 480, 360, 240];
/** Default lowest short side auto mode will pick (unless the source is smaller). */
const AUTO_FLOOR = 360;
/** Lowest short side allowed when an earlier pass overshot and we must shrink harder. */
export const RETRY_FLOOR = 240;

export type Feasibility = 'ok' | 'tight' | 'poor';

export interface PlanInput {
	width: number;
	height: number;
	/** Effective (post-trim) duration in seconds. */
	duration: number;
	targetBytes: number;
	codec: PlanCodec;
	audio: AudioMode;
	/** Requested audio bitrate in bits per second (used when audio is encoded). */
	audioBitrate: number;
	/** Short-side height the user picked, or null/undefined for automatic. */
	requestedShortSide?: number | null;
	/** Source overall bitrate in bits per second, if known — we never exceed it. */
	sourceBitrate?: number;
	/** Source frame rate, if known. */
	sourceFps?: number;
	/** Frame-rate ceiling chosen by the user (fps). Defaults to 30 while fitting to a size. */
	maxFrameRate?: number;
	/** Lowest short side automatic mode may choose. Defaults to 360. */
	minShortSide?: number;
}

export interface TargetPlan {
	width: number;
	height: number;
	videoBitrate: number;
	audioBitrate: number;
	scaledDown: boolean;
	feasibility: Feasibility;
}

function even(n: number): number {
	return Math.max(2, Math.round(n / 2) * 2);
}

/** Scale so the *shorter* side becomes `shortSide`, keeping aspect. Never upscales. */
export function fitDimensions(
	width: number,
	height: number,
	shortSide: number
): { width: number; height: number } {
	const srcShort = Math.min(width, height);
	if (shortSide >= srcShort) return { width: even(width), height: even(height) };
	const scale = shortSide / srcShort;
	return { width: even(width * scale), height: even(height * scale) };
}

function bitsPerPixel(bitrate: number, width: number, height: number, fps: number): number {
	return bitrate / (width * height * fps);
}

export function planForTarget(input: PlanInput): TargetPlan {
	const { width, height, duration, codec } = input;
	const safeDuration = Math.max(duration, 0.1);
	const budgetBitsPerSec = (input.targetBytes * 8 * SAFETY) / safeDuration;

	// Audio first: don't let it starve the picture when the budget is small.
	let audioBitrate = 0;
	if (input.audio === 'encode') {
		audioBitrate = Math.min(input.audioBitrate, Math.max(48_000, budgetBitsPerSec * 0.15));
	} else if (input.audio === 'copy') {
		audioBitrate = input.audioBitrate;
	}

	let videoBitrate = Math.max(MIN_VIDEO_BITRATE, budgetBitsPerSec - audioBitrate);
	// Never spend more bits than the source had — that only makes the file bigger.
	if (input.sourceBitrate && input.sourceBitrate > 0) {
		videoBitrate = Math.min(videoBitrate, Math.round(input.sourceBitrate * 0.95));
	}
	videoBitrate = Math.round(videoBitrate);

	const fps = Math.min(
		input.sourceFps && input.sourceFps > 0 ? input.sourceFps : 30,
		input.maxFrameRate && input.maxFrameRate > 0 ? input.maxFrameRate : MAX_PLANNED_FPS
	);
	const threshold = MIN_BITS_PER_PIXEL[codec];
	const srcShort = Math.min(width, height);

	let dims: { width: number; height: number };
	if (input.requestedShortSide) {
		dims = fitDimensions(width, height, input.requestedShortSide);
	} else {
		// Automatic: the largest rung the bitrate can support at acceptable quality.
		const rungs = [srcShort, ...LADDER.filter((r) => r < srcShort)];
		const floor = Math.min(input.minShortSide ?? AUTO_FLOOR, srcShort);
		const eligible = rungs.filter((r) => r >= floor);
		let chosen = eligible[eligible.length - 1] ?? srcShort;
		for (const rung of eligible) {
			const d = fitDimensions(width, height, rung);
			if (bitsPerPixel(videoBitrate, d.width, d.height, fps) >= threshold) {
				chosen = rung;
				break;
			}
		}
		dims = fitDimensions(width, height, chosen);
	}

	const bpp = bitsPerPixel(videoBitrate, dims.width, dims.height, fps);
	const feasibility: Feasibility =
		bpp >= threshold ? 'ok' : bpp >= threshold * 0.7 ? 'tight' : 'poor';

	return {
		...dims,
		videoBitrate,
		audioBitrate: Math.round(audioBitrate),
		scaledDown: dims.width < even(width) || dims.height < even(height),
		feasibility,
	};
}

/**
 * Bytes to aim for on the next attempt after an encode landed at `actualBytes`
 * against `targetBytes`. Scales the budget by how far off we were, with a small
 * extra cushion so the retry doesn't just miss again.
 */
export function nextBudget(
	targetBytes: number,
	previousBudget: number,
	actualBytes: number
): number {
	const ratio = targetBytes / actualBytes;
	return Math.max(1, Math.round(previousBudget * ratio * 0.96));
}

/** Share of the target an encode should fill before we stop trying to use more of it. */
export const FILL_GOAL = 0.8;

/**
 * Budget for the next attempt after an encode came in well *under* the target — the
 * encoder under-delivered the requested bitrate, so ask for proportionally more.
 */
export function nextBudgetUp(
	targetBytes: number,
	previousBudget: number,
	actualBytes: number
): number {
	const ratio = Math.min(targetBytes / Math.max(actualBytes, 1), 4);
	return Math.max(1, Math.round(previousBudget * ratio * 0.9));
}

/** "720p" → 720 (short side); 'original' → null (automatic / keep). */
export function shortSideFromResolution(resolution: string): number | null {
	const match = /^(\d+)p$/.exec(resolution);
	return match ? Number(match[1]) : null;
}
