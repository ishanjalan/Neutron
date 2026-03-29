import type { SEOFaq } from '@neutron/ui';

interface PageSEO {
	intro: string;
	faqs: SEOFaq[];
}

export const squishSEO: PageSEO = {
	intro:
		'Compress and convert images in your browser without any upload — supports HEIC (iPhone photos), JPEG, PNG, WebP, AVIF, JPEG XL, SVG, and GIF. All processing runs locally on your device.',
	faqs: [
		{
			q: 'What image formats can Squish compress?',
			a: 'HEIC, JPEG, PNG, WebP, AVIF, JPEG XL, SVG, and GIF. It can also convert between most of these formats in a single step.'
		},
		{
			q: 'How much can Squish reduce image file size?',
			a: 'Typically 40–80%. A 5 MB HEIC photo from an iPhone can often be reduced to under 500 KB as a JPEG without visible quality loss.'
		},
		{
			q: "What's the difference between HEIC, JPEG, and WebP?",
			a: 'HEIC is Apple\'s format for iPhone photos — excellent quality but not universally supported. JPEG is the universal standard for photos. WebP is a modern format with better compression than JPEG and is supported by all major browsers.'
		},
		{
			q: 'Is there a file size limit?',
			a: "No server-side limits — all processing runs in your browser. Very large images may take longer on low-powered devices, but there's no cap."
		},
		{
			q: 'Can I compress multiple images at once?',
			a: 'Yes — drop multiple files at once and Squish processes them all in parallel, then lets you download individually or as a ZIP.'
		},
		{
			q: 'Are my images safe?',
			a: 'Completely. Squish uses WebAssembly to process images entirely in your browser. No image is ever sent to a server.'
		}
	]
};
