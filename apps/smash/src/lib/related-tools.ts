import { base } from '$app/paths';
import type { RelatedTool } from '@neutron/ui';

export const smashRelated: Record<string, RelatedTool[]> = {
	compress: [
		{ label: 'Merge PDFs', href: `${base}/merge`, description: 'Combine multiple PDFs into one' },
		{ label: 'Split PDF', href: `${base}/split`, description: 'Extract pages into separate files' },
		{ label: 'OCR PDF', href: `${base}/ocr`, description: 'Extract text from scanned PDFs' },
	],
	merge: [
		{ label: 'Split PDF', href: `${base}/split`, description: 'Extract pages into separate files' },
		{ label: 'Compress PDF', href: `${base}/compress`, description: 'Reduce PDF file size' },
		{ label: 'Reorder Pages', href: `${base}/reorder`, description: 'Drag pages into any order' },
	],
	split: [
		{ label: 'Merge PDFs', href: `${base}/merge`, description: 'Combine multiple PDFs into one' },
		{ label: 'Compress PDF', href: `${base}/compress`, description: 'Reduce PDF file size' },
		{ label: 'Delete Pages', href: `${base}/delete`, description: 'Remove unwanted pages' },
	],
	rotate: [
		{ label: 'Reorder Pages', href: `${base}/reorder`, description: 'Drag pages into any order' },
		{ label: 'Delete Pages', href: `${base}/delete`, description: 'Remove unwanted pages' },
		{
			label: 'Reverse Pages',
			href: `${base}/reverse-pages`,
			description: 'Flip the page order of a PDF',
		},
	],
	delete: [
		{ label: 'Reorder Pages', href: `${base}/reorder`, description: 'Drag pages into any order' },
		{
			label: 'Rotate Pages',
			href: `${base}/rotate`,
			description: 'Fix landscape or upside-down pages',
		},
		{
			label: 'Remove Blank Pages',
			href: `${base}/remove-blank-pages`,
			description: 'Auto-detect and remove empties',
		},
	],
	reorder: [
		{
			label: 'Rotate Pages',
			href: `${base}/rotate`,
			description: 'Fix landscape or upside-down pages',
		},
		{ label: 'Delete Pages', href: `${base}/delete`, description: 'Remove unwanted pages' },
		{ label: 'Merge PDFs', href: `${base}/merge`, description: 'Combine multiple PDFs into one' },
	],
	'to-images': [
		{ label: 'Images to PDF', href: `${base}/from-images`, description: 'Build a PDF from images' },
		{ label: 'Compress PDF', href: `${base}/compress`, description: 'Reduce PDF file size' },
		{ label: 'Split PDF', href: `${base}/split`, description: 'Extract pages into separate files' },
	],
	'from-images': [
		{
			label: 'PDF to Images',
			href: `${base}/to-images`,
			description: 'Export every page as an image',
		},
		{ label: 'Compress PDF', href: `${base}/compress`, description: 'Reduce PDF file size' },
		{ label: 'Merge PDFs', href: `${base}/merge`, description: 'Combine multiple PDFs into one' },
	],
	'add-page-numbers': [
		{
			label: 'Watermark PDF',
			href: `${base}/watermark`,
			description: 'Stamp text or image on every page',
		},
		{
			label: 'Edit Metadata',
			href: `${base}/edit-metadata`,
			description: 'Update PDF title and author',
		},
		{ label: 'Compress PDF', href: `${base}/compress`, description: 'Reduce PDF file size' },
	],
	watermark: [
		{
			label: 'Add Page Numbers',
			href: `${base}/add-page-numbers`,
			description: 'Stamp page numbers on every page',
		},
		{
			label: 'Edit Metadata',
			href: `${base}/edit-metadata`,
			description: 'Update PDF title and author',
		},
		{ label: 'Protect PDF', href: `${base}/protect`, description: 'Password-lock a PDF' },
	],
	protect: [
		{ label: 'Unlock PDF', href: `${base}/unlock`, description: 'Remove a known PDF password' },
		{
			label: 'Watermark PDF',
			href: `${base}/watermark`,
			description: 'Stamp text or image on every page',
		},
		{ label: 'Compress PDF', href: `${base}/compress`, description: 'Reduce PDF file size' },
	],
	unlock: [
		{ label: 'Protect PDF', href: `${base}/protect`, description: 'Password-lock a PDF' },
		{ label: 'Compress PDF', href: `${base}/compress`, description: 'Reduce PDF file size' },
		{ label: 'Merge PDFs', href: `${base}/merge`, description: 'Combine multiple PDFs into one' },
	],
	ocr: [
		{ label: 'Compress PDF', href: `${base}/compress`, description: 'Reduce PDF file size' },
		{
			label: 'PDF to Images',
			href: `${base}/to-images`,
			description: 'Export every page as an image',
		},
		{ label: 'Split PDF', href: `${base}/split`, description: 'Extract pages into separate files' },
	],
	'reverse-pages': [
		{ label: 'Reorder Pages', href: `${base}/reorder`, description: 'Drag pages into any order' },
		{
			label: 'Rotate Pages',
			href: `${base}/rotate`,
			description: 'Fix landscape or upside-down pages',
		},
		{ label: 'Delete Pages', href: `${base}/delete`, description: 'Remove unwanted pages' },
	],
	'edit-metadata': [
		{
			label: 'Add Page Numbers',
			href: `${base}/add-page-numbers`,
			description: 'Stamp page numbers on every page',
		},
		{
			label: 'Watermark PDF',
			href: `${base}/watermark`,
			description: 'Stamp text or image on every page',
		},
		{ label: 'Compress PDF', href: `${base}/compress`, description: 'Reduce PDF file size' },
	],
	'remove-blank-pages': [
		{ label: 'Compress PDF', href: `${base}/compress`, description: 'Reduce PDF file size' },
		{ label: 'Delete Pages', href: `${base}/delete`, description: 'Remove unwanted pages' },
		{ label: 'Split PDF', href: `${base}/split`, description: 'Extract pages into separate files' },
	],
};
