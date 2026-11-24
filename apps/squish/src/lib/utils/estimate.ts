/**
 * Predicting the output size of each quality level for a particular image.
 *
 * Encoder results depend heavily on the picture (a screenshot and a landscape differ many times
 * over), so instead of a formula we encode the first waiting image at every level and scale its
 * result to the whole batch. It is an estimate — the real size is shown once compression finishes.
 */

import { compressAtQuality } from './compress';
import { QUALITY_LEVELS, levelFor, type QualityLevel } from '#lib/quality-levels.ts';
import type { CompressionSettings, ImageItem } from '#lib/stores/images.svelte.ts';

export type LevelKey = QualityLevel['key'];
/** Predicted output bytes for one image per level, filled in as each level finishes. */
export type LevelBytes = Partial<Record<LevelKey, number>>;

/** Sizing only makes sense for plain raster re-encodes with no resize or target size. */
export function canEstimate(item: ImageItem | undefined, settings: CompressionSettings): boolean {
	return (
		!!item &&
		item.format !== 'svg' &&
		!settings.resizeEnabled &&
		!settings.targetSizeMode &&
		(item.status === 'pending' || item.status === 'completed')
	);
}

/** Everything that changes the answer for this image. */
export function estimateKey(item: ImageItem): string {
	return [item.id, item.outputFormat].join('|');
}

export async function estimateLevels(
	item: ImageItem,
	settings: CompressionSettings,
	signal: AbortSignal,
	onLevel: (key: LevelKey, bytes: number) => void
): Promise<void> {
	// The level the user is on first, then outwards from it
	const current = QUALITY_LEVELS.indexOf(levelFor(settings));
	const order = [...QUALITY_LEVELS].sort(
		(a, b) =>
			Math.abs(QUALITY_LEVELS.indexOf(a) - current) - Math.abs(QUALITY_LEVELS.indexOf(b) - current)
	);
	for (const level of order) {
		if (signal.aborted) return;
		const { blob } = await compressAtQuality(item, level.quality, level.lossless);
		if (signal.aborted) return;
		onLevel(level.key, blob.size);
	}
}
