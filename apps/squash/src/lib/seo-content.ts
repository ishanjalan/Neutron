import type { SEOFaq } from '@neutron/ui';

interface PageSEO {
	intro: string;
	faqs: SEOFaq[];
}

export const squashSEO: PageSEO = {
	intro:
		'Compress MP4, WebM, and MOV videos directly in your browser using the WebCodecs API — hardware-accelerated, no FFmpeg, no uploads. Your video never leaves your device.',
	faqs: [
		{
			q: 'How does Squash compress video without FFmpeg?',
			a: "It uses the WebCodecs API, a browser-native video encoding interface that leverages your device's hardware encoder for fast, efficient compression — no server required."
		},
		{
			q: 'Which video formats are supported?',
			a: 'Input: MP4 (H.264/H.265), WebM (VP9/AV1), and MOV. Output is always MP4 for maximum compatibility.'
		},
		{
			q: 'How much can it reduce video file size?',
			a: 'Typically 50–80%. A 100 MB screen recording can often be brought under 20 MB with minimal visible quality loss.'
		},
		{
			q: 'Does Squash require a fast internet connection?',
			a: 'Only for the initial page load. All video processing is done locally on your device — no data is sent anywhere.'
		},
		{
			q: 'Why might compression take longer than online tools?',
			a: "Online tools use dedicated server hardware. Squash uses your device's encoder, which may be slower on older devices — but keeps your video completely private."
		},
		{
			q: 'Is Squash free to use?',
			a: 'Yes, completely free with no account or sign-up required. Open source on GitHub.'
		}
	]
};
