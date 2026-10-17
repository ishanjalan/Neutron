import { resolve } from '$app/paths';
import type { RelatedTool } from '@neutron/ui';

export const smashRelated: Record<string, RelatedTool[]> = {
	compress: [
		{
			label: 'Merge PDFs',
			href: resolve(`merge`),
			description: 'Combine multiple PDFs into one',
		},

		{
			label: 'Split PDF',
			href: resolve(`split`),
			description: 'Extract pages into separate files',
		},

		{
			label: 'OCR PDF',
			href: resolve(`ocr`),
			description: 'Extract text from scanned PDFs',
		},
	],
	merge: [
		{
			label: 'Split PDF',
			href: resolve(`split`),
			description: 'Extract pages into separate files',
		},

		{
			label: 'Compress PDF',
			href: resolve(`compress`),
			description: 'Reduce PDF file size',
		},

		{
			label: 'Reorder Pages',
			href: resolve(`reorder`),
			description: 'Drag pages into any order',
		},
	],
	split: [
		{
			label: 'Merge PDFs',
			href: resolve(`merge`),
			description: 'Combine multiple PDFs into one',
		},

		{
			label: 'Compress PDF',
			href: resolve(`compress`),
			description: 'Reduce PDF file size',
		},

		{
			label: 'Delete Pages',
			href: resolve(`delete`),
			description: 'Remove unwanted pages',
		},
	],
	rotate: [
		{
			label: 'Reorder Pages',
			href: resolve(`reorder`),
			description: 'Drag pages into any order',
		},

		{
			label: 'Delete Pages',
			href: resolve(`delete`),
			description: 'Remove unwanted pages',
		},

		{
			label: 'Reverse Pages',
			href: resolve(`reverse-pages`),
			description: 'Flip the page order of a PDF',
		},
	],
	delete: [
		{
			label: 'Reorder Pages',
			href: resolve(`reorder`),
			description: 'Drag pages into any order',
		},

		{
			label: 'Rotate Pages',
			href: resolve(`rotate`),
			description: 'Fix landscape or upside-down pages',
		},
		{
			label: 'Remove Blank Pages',
			href: resolve(`remove-blank-pages`),
			description: 'Auto-detect and remove empties',
		},
	],
	reorder: [
		{
			label: 'Rotate Pages',
			href: resolve(`rotate`),
			description: 'Fix landscape or upside-down pages',
		},

		{
			label: 'Delete Pages',
			href: resolve(`delete`),
			description: 'Remove unwanted pages',
		},

		{
			label: 'Merge PDFs',
			href: resolve(`merge`),
			description: 'Combine multiple PDFs into one',
		},
	],
	'to-images': [
		{
			label: 'Images to PDF',
			href: resolve(`from-images`),
			description: 'Build a PDF from images',
		},

		{
			label: 'Compress PDF',
			href: resolve(`compress`),
			description: 'Reduce PDF file size',
		},

		{
			label: 'Split PDF',
			href: resolve(`split`),
			description: 'Extract pages into separate files',
		},
	],
	'from-images': [
		{
			label: 'PDF to Images',
			href: resolve(`to-images`),
			description: 'Export every page as an image',
		},

		{
			label: 'Compress PDF',
			href: resolve(`compress`),
			description: 'Reduce PDF file size',
		},

		{
			label: 'Merge PDFs',
			href: resolve(`merge`),
			description: 'Combine multiple PDFs into one',
		},
	],
	'add-page-numbers': [
		{
			label: 'Watermark PDF',
			href: resolve(`watermark`),
			description: 'Stamp text or image on every page',
		},
		{
			label: 'Edit Metadata',
			href: resolve(`edit-metadata`),
			description: 'Update PDF title and author',
		},

		{
			label: 'Compress PDF',
			href: resolve(`compress`),
			description: 'Reduce PDF file size',
		},
	],
	watermark: [
		{
			label: 'Add Page Numbers',
			href: resolve(`add-page-numbers`),
			description: 'Stamp page numbers on every page',
		},
		{
			label: 'Edit Metadata',
			href: resolve(`edit-metadata`),
			description: 'Update PDF title and author',
		},

		{
			label: 'Protect PDF',
			href: resolve(`protect`),
			description: 'Password-lock a PDF',
		},
	],
	protect: [
		{
			label: 'Unlock PDF',
			href: resolve(`unlock`),
			description: 'Remove a known PDF password',
		},

		{
			label: 'Watermark PDF',
			href: resolve(`watermark`),
			description: 'Stamp text or image on every page',
		},

		{
			label: 'Compress PDF',
			href: resolve(`compress`),
			description: 'Reduce PDF file size',
		},
	],
	unlock: [
		{
			label: 'Protect PDF',
			href: resolve(`protect`),
			description: 'Password-lock a PDF',
		},

		{
			label: 'Compress PDF',
			href: resolve(`compress`),
			description: 'Reduce PDF file size',
		},

		{
			label: 'Merge PDFs',
			href: resolve(`merge`),
			description: 'Combine multiple PDFs into one',
		},
	],
	ocr: [
		{
			label: 'Compress PDF',
			href: resolve(`compress`),
			description: 'Reduce PDF file size',
		},

		{
			label: 'PDF to Images',
			href: resolve(`to-images`),
			description: 'Export every page as an image',
		},

		{
			label: 'Split PDF',
			href: resolve(`split`),
			description: 'Extract pages into separate files',
		},
	],
	'reverse-pages': [
		{
			label: 'Reorder Pages',
			href: resolve(`reorder`),
			description: 'Drag pages into any order',
		},

		{
			label: 'Rotate Pages',
			href: resolve(`rotate`),
			description: 'Fix landscape or upside-down pages',
		},

		{
			label: 'Delete Pages',
			href: resolve(`delete`),
			description: 'Remove unwanted pages',
		},
	],
	'edit-metadata': [
		{
			label: 'Add Page Numbers',
			href: resolve(`add-page-numbers`),
			description: 'Stamp page numbers on every page',
		},
		{
			label: 'Watermark PDF',
			href: resolve(`watermark`),
			description: 'Stamp text or image on every page',
		},

		{
			label: 'Compress PDF',
			href: resolve(`compress`),
			description: 'Reduce PDF file size',
		},
	],
	'remove-blank-pages': [
		{
			label: 'Compress PDF',
			href: resolve(`compress`),
			description: 'Reduce PDF file size',
		},

		{
			label: 'Delete Pages',
			href: resolve(`delete`),
			description: 'Remove unwanted pages',
		},

		{
			label: 'Split PDF',
			href: resolve(`split`),
			description: 'Extract pages into separate files',
		},
	],
};
