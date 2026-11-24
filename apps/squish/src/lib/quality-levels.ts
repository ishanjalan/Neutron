import type { CompressionSettings } from '#lib/stores/images.svelte.ts';

export interface QualityLevel {
	key: 'small' | 'balanced' | 'high' | 'lossless';
	label: string;
	hint: string;
	quality: number;
	lossless: boolean;
}

/** Smallest file to best picture. Same vocabulary as Squash, with Squish's own descriptions. */
export const QUALITY_LEVELS: QualityLevel[] = [
	{
		key: 'small',
		label: 'Small',
		hint: 'Smaller files — messaging, email',
		quality: 60,
		lossless: false,
	},
	{ key: 'balanced', label: 'Balanced', hint: 'Best of both worlds', quality: 80, lossless: false },
	{
		key: 'high',
		label: 'High',
		hint: 'Close to the original — archive, print',
		quality: 95,
		lossless: false,
	},
	{
		key: 'lossless',
		label: 'Lossless',
		hint: 'No quality loss, larger files. Best for WebP, AVIF, JXL',
		quality: 95,
		lossless: true,
	},
];

/** The level a saved setting corresponds to (an unusual saved quality snaps to the nearest). */
export function levelFor(
	settings: Pick<CompressionSettings, 'quality' | 'lossless'>
): QualityLevel {
	if (settings.lossless) return QUALITY_LEVELS[3];
	const lossy = QUALITY_LEVELS.slice(0, 3);
	return lossy.reduce((best, l) =>
		Math.abs(l.quality - settings.quality) < Math.abs(best.quality - settings.quality) ? l : best
	);
}
