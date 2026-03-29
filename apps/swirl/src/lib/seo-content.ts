import type { SEOFaq } from '@neutron/ui';

interface PageSEO {
	intro: string;
	faqs: SEOFaq[];
}

export const swirlHomeSEO: PageSEO = {
	intro:
		'A suite of browser-based GIF tools — convert, optimise, resize, crop, reverse, and more. All processing runs locally using WebAssembly. No upload, no account, no file size limit.',
	faqs: [
		{
			q: 'What GIF tools does Swirl include?',
			a: 'Video to GIF, GIF from images, optimise, resize, crop, reverse, adjust speed, and add text — 10 tools in total, all browser-based.'
		},
		{
			q: 'Are there file size limits?',
			a: 'No upload means no server-side limits. Processing runs in your browser using WebAssembly. Very large GIFs may take longer on slower devices.'
		},
		{
			q: 'Can I convert a video to a GIF?',
			a: "Yes — Swirl's Video to GIF tool supports MP4, WebM, and MOV input. Trim the clip, set frame rate and dimensions, then download."
		},
		{
			q: 'Why are GIFs larger than videos?',
			a: 'GIF is a 1987 format limited to 256 colours per frame and no inter-frame compression. Use WebP animations for modern browsers if file size is critical.'
		},
		{
			q: 'Is Swirl free to use?',
			a: 'Yes, completely free with no account required. Open source on GitHub.'
		}
	]
};

export const videoToGifSEO: PageSEO = {
	intro:
		'Convert MP4, WebM, or MOV videos to animated GIF in your browser — trim the clip, set frame rate and output dimensions, no upload needed.',
	faqs: [
		{
			q: 'What video formats can I convert to GIF?',
			a: 'MP4, WebM, and MOV. The video must be a format your browser can natively play.'
		},
		{
			q: 'How do I make a short GIF from a long video?',
			a: 'Use the trim controls to select a start and end time before converting. Keep clips under 10 seconds for manageable file sizes.'
		},
		{
			q: 'Why is my GIF so large?',
			a: 'GIF uses only 256 colours per frame and stores each frame as a full image. Reduce frame rate (10–15 fps is usually enough) or output dimensions to lower file size.'
		},
		{
			q: 'What frame rate should I use?',
			a: '10–15 fps is a good balance for most GIFs — smooth enough to look natural but not bloated. Higher frame rates increase file size significantly.'
		},
		{
			q: 'Will the GIF loop automatically?',
			a: 'Yes — all GIFs created by Swirl loop infinitely by default.'
		}
	]
};

export const makeGifSEO: PageSEO = {
	intro:
		'Create an animated GIF from a sequence of images — drop JPEGs or PNGs, set the frame delay, reorder frames, and download a ready-to-share GIF.',
	faqs: [
		{
			q: 'What image formats can I use as frames?',
			a: 'JPEG and PNG. For best results, all images should be the same dimensions.'
		},
		{
			q: 'How do I control animation speed?',
			a: 'Set the frame delay in milliseconds. 100 ms = 10 fps (standard). 50 ms = 20 fps (fast). 200 ms = 5 fps (slow).'
		},
		{
			q: 'Is there a limit on the number of frames?',
			a: "No hard limit. More frames produce a larger GIF and slower processing. For web use, aim for under 50 frames if possible."
		},
		{
			q: 'Can I reorder frames?',
			a: 'Yes — drag frames to reorder them before creating the GIF.'
		},
		{
			q: 'Why does my GIF look different from the source images?',
			a: 'GIF supports only 256 colours per frame. Images with smooth gradients or photos will show some colour banding — this is a fundamental limitation of the GIF format.'
		}
	]
};

export const optimizeGifSEO: PageSEO = {
	intro:
		'Compress and optimise GIF files using Gifsicle — reduce file size while keeping the animation intact, entirely in your browser using WebAssembly.',
	faqs: [
		{
			q: 'How much can Swirl reduce GIF file size?',
			a: 'Typically 20–60% depending on the GIF content and how it was originally created. GIFs with repetitive areas compress the most.'
		},
		{
			q: 'What method does Swirl use to optimise?',
			a: 'Gifsicle, the standard open-source GIF optimiser, compiled to WebAssembly so it runs entirely in your browser.'
		},
		{
			q: 'Will optimisation affect quality?',
			a: 'At maximum compression, very subtle quality changes may be visible. The default setting balances size and quality well for most GIFs.'
		},
		{
			q: 'Can I optimise an animated GIF without breaking the animation?',
			a: 'Yes — Swirl preserves all frames and timing while removing redundant pixel data between frames.'
		},
		{
			q: 'My GIF is already small — should I still optimise?',
			a: 'If it is under 200 KB, optimising will have minimal benefit. Reducing dimensions or frame count will have more impact at that size.'
		}
	]
};

export const textGifSEO: PageSEO = {
	intro:
		'Add a text caption or label to every frame of a GIF — choose font size, colour, and position. All processing is done locally with no upload.',
	faqs: [
		{
			q: 'Is the text applied to all frames?',
			a: 'Yes — the text overlay is applied to every frame of the animation consistently.'
		},
		{
			q: 'What fonts are available?',
			a: 'System fonts — sans-serif, serif, and monospace. Custom font upload is not yet supported.'
		},
		{
			q: 'Can I position the text anywhere?',
			a: 'Choose from preset positions (top, centre, bottom) and adjust the offset to fine-tune placement.'
		},
		{
			q: 'Does adding text increase file size?',
			a: 'Yes, slightly — each frame has additional pixel data where the text is rendered.'
		},
		{
			q: 'Can I add a background behind the text to improve readability?',
			a: 'Yes — an optional semi-transparent background box makes text legible over any image content.'
		}
	]
};

export const resizeGifSEO: PageSEO = {
	intro:
		'Resize a GIF to specific pixel dimensions while preserving the animation — scale proportionally or enter exact width and height values.',
	faqs: [
		{
			q: 'Can I resize without distorting the aspect ratio?',
			a: 'Yes — lock the aspect ratio to scale proportionally. Enter either width or height and the other is calculated automatically.'
		},
		{
			q: 'Will resizing affect image quality?',
			a: 'Downscaling (making smaller) produces crisp results. Upscaling (making larger) may look blurry as pixels are interpolated.'
		},
		{
			q: 'Does resizing reduce file size?',
			a: 'Significantly. Halving the dimensions reduces file size by approximately 75% since there are four times fewer pixels per frame.'
		},
		{
			q: 'Can I resize and then optimise?',
			a: 'Yes — resize first, then pass the result through the Optimise tool for maximum size reduction.'
		},
		{
			q: 'Is there a maximum output size?',
			a: "No hard limit, but very large GIFs may be slow to process in the browser. For web use, keep dimensions under 800 px wide."
		}
	]
};

export const cropGifSEO: PageSEO = {
	intro:
		'Crop a GIF to remove borders, black bars, or focus on a specific region — the same crop is applied to all frames at once.',
	faqs: [
		{
			q: 'Is the crop applied to all frames?',
			a: 'Yes — the same crop rectangle is applied to every frame of the animation simultaneously.'
		},
		{
			q: 'Can I crop to a specific aspect ratio?',
			a: 'Enter exact pixel values for X offset, Y offset, width, and height to achieve any crop area you need.'
		},
		{
			q: 'Does cropping reduce file size?',
			a: 'Yes — removing parts of each frame reduces the total pixel data and usually noticeably shrinks the file.'
		},
		{
			q: 'Will cropping affect animation timing?',
			a: 'No — frame delays and loop settings are preserved exactly as they were in the original.'
		},
		{
			q: 'Can I crop and resize in the same session?',
			a: 'Crop first to the right area, then pass the result to the Resize tool for the desired dimensions.'
		}
	]
};

export const reverseGifSEO: PageSEO = {
	intro:
		'Reverse a GIF so it plays backwards — a one-click operation that keeps all frame timing intact and produces a perfect loop.',
	faqs: [
		{
			q: 'Does reversing affect the frame timing?',
			a: "No — each frame's delay is preserved exactly. Only the playback order changes."
		},
		{
			q: 'Can I make a boomerang GIF that plays forward and backward?',
			a: 'Export the reversed GIF, then use the Make GIF tool to combine the original and reversed frames into a single looping animation.'
		},
		{
			q: 'Does reversing affect image quality?',
			a: 'No — frames are reordered but never re-encoded. Quality is identical to the original.'
		},
		{
			q: 'When would I need to reverse a GIF?',
			a: "Common uses: creating a boomerang-style loop, fixing an animation captured back-to-front, or producing a 'rewind' effect."
		},
		{
			q: 'Is there a file size limit?',
			a: 'No upload means no server-side limits. Processing happens entirely in your browser.'
		}
	]
};

export const speedGifSEO: PageSEO = {
	intro:
		"Change the playback speed of a GIF by adjusting each frame's delay — make it faster, slower, or apply variable timing to individual frames.",
	faqs: [
		{
			q: 'How do I make a GIF play faster?',
			a: 'Reduce the frame delay. Changing from 100 ms to 50 ms per frame doubles the playback speed.'
		},
		{
			q: 'How do I make a GIF play slower?',
			a: 'Increase the frame delay. 200 ms per frame gives a slow, deliberate animation; 500 ms makes it very slow.'
		},
		{
			q: 'Can I set different speeds for different frames?',
			a: 'Yes — adjust individual frame delays to create variable-speed animation, such as pausing on a key moment.'
		},
		{
			q: 'Does changing speed affect file size?',
			a: 'No — frame delay is stored as a small metadata value. The pixel data and therefore the file size are unchanged.'
		},
		{
			q: "What's the fastest frame delay I can set?",
			a: '10 ms is the minimum (100 fps). In practice, most browsers clamp very short delays to around 20 ms.'
		}
	]
};
