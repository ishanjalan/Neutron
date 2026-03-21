import type { PageLoad } from './$types';
import type { PDFTool } from '$lib/stores/pdfs.svelte';

const VALID_TOOLS: PDFTool[] = [
	'compress',
	'merge',
	'split',
	'rotate',
	'delete-pages',
	'reorder',
	'pdf-to-images',
	'images-to-pdf',
	'protect',
	'unlock',
	'ocr',
	'add-page-numbers',
	'watermark',
	'edit-metadata',
	'reverse-pages',
	'remove-blank-pages',
	'sign',
];

export const load: PageLoad = ({ url }) => {
	const tool = url.searchParams.get('tool') as PDFTool | null;
	return {
		initialTool: tool && VALID_TOOLS.includes(tool) ? tool : null,
	};
};
