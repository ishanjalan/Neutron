import { base } from '$app/paths';
import type { RelatedTool } from '@neutron/ui';

export const swirlRelated: Record<string, RelatedTool[]> = {
	'video-to-gif': [
		{ label: 'GIF Maker', href: `${base}/make`, description: 'Build a GIF from image frames' },
		{ label: 'Optimize GIF', href: `${base}/optimize`, description: 'Shrink GIF file size' },
		{ label: 'Resize GIF', href: `${base}/resize`, description: 'Scale to exact pixel dimensions' },
	],
	make: [
		{
			label: 'Video to GIF',
			href: `${base}/video-to-gif`,
			description: 'Convert MP4, WebM, or MOV to GIF',
		},
		{ label: 'Optimize GIF', href: `${base}/optimize`, description: 'Shrink GIF file size' },
		{ label: 'Resize GIF', href: `${base}/resize`, description: 'Scale to exact pixel dimensions' },
	],
	optimize: [
		{ label: 'Resize GIF', href: `${base}/resize`, description: 'Scale to exact pixel dimensions' },
		{ label: 'Crop GIF', href: `${base}/crop`, description: 'Remove borders or focus a region' },
		{
			label: 'Video to GIF',
			href: `${base}/video-to-gif`,
			description: 'Convert MP4, WebM, or MOV to GIF',
		},
	],
	text: [
		{ label: 'Resize GIF', href: `${base}/resize`, description: 'Scale to exact pixel dimensions' },
		{ label: 'Crop GIF', href: `${base}/crop`, description: 'Remove borders or focus a region' },
		{ label: 'Optimize GIF', href: `${base}/optimize`, description: 'Shrink GIF file size' },
	],
	resize: [
		{ label: 'Optimize GIF', href: `${base}/optimize`, description: 'Shrink GIF file size' },
		{ label: 'Crop GIF', href: `${base}/crop`, description: 'Remove borders or focus a region' },
		{ label: 'Reverse GIF', href: `${base}/reverse`, description: 'Play the animation backwards' },
	],
	crop: [
		{ label: 'Resize GIF', href: `${base}/resize`, description: 'Scale to exact pixel dimensions' },
		{ label: 'Optimize GIF', href: `${base}/optimize`, description: 'Shrink GIF file size' },
		{ label: 'Add Text to GIF', href: `${base}/text`, description: 'Overlay a caption on every frame' },
	],
	reverse: [
		{ label: 'Change Speed', href: `${base}/speed`, description: 'Adjust frame delays' },
		{ label: 'Resize GIF', href: `${base}/resize`, description: 'Scale to exact pixel dimensions' },
		{ label: 'Optimize GIF', href: `${base}/optimize`, description: 'Shrink GIF file size' },
	],
	speed: [
		{ label: 'Reverse GIF', href: `${base}/reverse`, description: 'Play the animation backwards' },
		{ label: 'Optimize GIF', href: `${base}/optimize`, description: 'Shrink GIF file size' },
		{ label: 'Resize GIF', href: `${base}/resize`, description: 'Scale to exact pixel dimensions' },
	],
};
