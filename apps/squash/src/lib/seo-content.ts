import type { SEOFaq } from '@neutron/ui';

interface PageSEO {
	intro: string;
	faqs: SEOFaq[];
}

export const squashSEO: PageSEO = {
	intro:
		'Reduce video file size instantly — no uploads, no account, no FFmpeg. Squash compresses MP4, WebM, MOV, AVI, and MKV videos entirely in your browser using hardware-accelerated WebCodecs. Your video never leaves your device.',
	faqs: [
		{
			q: 'How do I make a video file smaller without losing quality?',
			a: 'Drop your video into Squash and choose a quality preset. The "Web" preset reduces most videos by 60–70% with no noticeable quality difference. For the best result, lower the resolution (e.g. 1080p → 720p) alongside the quality setting.',
		},
		{
			q: 'What is the best free video compressor online?',
			a: 'Squash compresses video entirely in your browser using hardware acceleration — no uploads, no watermarks, no file size limits, and no account required. It supports MP4, WebM, MOV, AVI, and MKV, and is completely free and open source.',
		},
		{
			q: 'How much can Squash reduce video file size?',
			a: 'Typically 50–80%. A 200 MB screen recording often compresses to under 30 MB with the "Web" preset. Results vary by content — high-motion video compresses less than static presentations.',
		},
		{
			q: 'Is my video private when I compress it?',
			a: 'Yes, completely. Squash processes everything locally on your device using the WebCodecs API. No video data is ever sent to a server — not even for a moment.',
		},
		{
			q: 'Which video formats does Squash support?',
			a: 'Input: MP4, WebM, MOV, AVI, and MKV. Output: MP4 (H.264), WebM (VP9), HEVC (H.265), and AV1 — choose based on your target device or platform.',
		},
		{
			q: 'Does Squash work without an internet connection?',
			a: 'After the initial page load, yes. All processing runs locally in your browser. You can even add it to your home screen as a PWA for offline access.',
		},
	],
};
