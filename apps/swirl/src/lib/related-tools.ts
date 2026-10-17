import { resolve } from '$app/paths';
import type { RelatedTool } from '@neutron/ui';

export const swirlRelated: Record<string, RelatedTool[]> = {
	'video-to-gif': [
		{
			label: 'GIF Maker',
			href: resolve(`make`),
			description: 'Build a GIF from image frames',
		},

		{
			label: 'Optimize GIF',
			href: resolve(`optimize`),
			description: 'Shrink GIF file size',
		},

		{
			label: 'Resize GIF',
			href: resolve(`resize`),
			description: 'Scale to exact pixel dimensions',
		},
	],
	make: [
		{
			label: 'Video to GIF',
			href: resolve(`video-to-gif`),
			description: 'Convert MP4, WebM, or MOV to GIF',
		},

		{
			label: 'Optimize GIF',
			href: resolve(`optimize`),
			description: 'Shrink GIF file size',
		},

		{
			label: 'Resize GIF',
			href: resolve(`resize`),
			description: 'Scale to exact pixel dimensions',
		},
	],
	optimize: [
		{
			label: 'Resize GIF',
			href: resolve(`resize`),
			description: 'Scale to exact pixel dimensions',
		},

		{
			label: 'Crop GIF',
			href: resolve(`crop`),
			description: 'Remove borders or focus a region',
		},

		{
			label: 'Video to GIF',
			href: resolve(`video-to-gif`),
			description: 'Convert MP4, WebM, or MOV to GIF',
		},
	],
	text: [
		{
			label: 'Resize GIF',
			href: resolve(`resize`),
			description: 'Scale to exact pixel dimensions',
		},

		{
			label: 'Crop GIF',
			href: resolve(`crop`),
			description: 'Remove borders or focus a region',
		},

		{
			label: 'Optimize GIF',
			href: resolve(`optimize`),
			description: 'Shrink GIF file size',
		},
	],
	resize: [
		{
			label: 'Optimize GIF',
			href: resolve(`optimize`),
			description: 'Shrink GIF file size',
		},

		{
			label: 'Crop GIF',
			href: resolve(`crop`),
			description: 'Remove borders or focus a region',
		},

		{
			label: 'Reverse GIF',
			href: resolve(`reverse`),
			description: 'Play the animation backwards',
		},
	],
	crop: [
		{
			label: 'Resize GIF',
			href: resolve(`resize`),
			description: 'Scale to exact pixel dimensions',
		},

		{
			label: 'Optimize GIF',
			href: resolve(`optimize`),
			description: 'Shrink GIF file size',
		},

		{
			label: 'Add Text to GIF',
			href: resolve(`text`),
			description: 'Overlay a caption on every frame',
		},
	],
	reverse: [
		{
			label: 'Change Speed',
			href: resolve(`speed`),
			description: 'Adjust frame delays',
		},

		{
			label: 'Resize GIF',
			href: resolve(`resize`),
			description: 'Scale to exact pixel dimensions',
		},

		{
			label: 'Optimize GIF',
			href: resolve(`optimize`),
			description: 'Shrink GIF file size',
		},
	],
	speed: [
		{
			label: 'Reverse GIF',
			href: resolve(`reverse`),
			description: 'Play the animation backwards',
		},

		{
			label: 'Optimize GIF',
			href: resolve(`optimize`),
			description: 'Shrink GIF file size',
		},

		{
			label: 'Resize GIF',
			href: resolve(`resize`),
			description: 'Scale to exact pixel dimensions',
		},
	],
};
