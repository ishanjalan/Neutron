import type { OutputFormat } from '#lib/stores/images.svelte.ts';
import { getOutputFilename as getOutputFilenameShared } from '@neutron/utils';

export function getOutputExtension(format: OutputFormat): string {
	const map: Record<OutputFormat, string> = {
		jpeg: '.jpg',
		png: '.png',
		webp: '.webp',
		avif: '.avif',
		jxl: '.jxl',
		svg: '.svg',
	};
	return map[format];
}

export function getOutputFilename(
	originalName: string,
	format: OutputFormat,
	template?: string
): string {
	return getOutputFilenameShared(originalName, {
		extension: getOutputExtension(format).slice(1),
		template: template ?? '{name}-optimized.{ext}',
	});
}
