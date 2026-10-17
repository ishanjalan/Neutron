import type { SEOFaq } from '@neutron/ui';

interface PageSEO {
	intro: string;
	faqs: SEOFaq[];
}

export const squashSEO: PageSEO = {
	intro:
		'Reduce video file size instantly — no uploads, no account, no FFmpeg. Squash compresses MP4, WebM, MOV, and MKV videos entirely in your browser using hardware-accelerated WebCodecs. Your video never leaves your device.',
	faqs: [
		{
			q: 'How do I make a video file smaller without losing quality?',
			a: 'Drop your video into Squash and choose a quality preset. The "Web" preset reduces most videos by 60–70% with no noticeable quality difference. For the best result, lower the resolution (e.g. 1080p → 720p) alongside the quality setting.',
		},
		{
			q: 'What is the best free video compressor online?',
			a: 'Squash compresses video entirely in your browser using hardware acceleration — no uploads, no watermarks, no file size limits, and no account required. It supports MP4, WebM, MOV, and MKV as input, and outputs MP4, WebM, HEVC, or AV1. Completely free and open source.',
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
			a: 'Input: MP4, WebM, MOV, and MKV. Output: MP4 (H.264), WebM (VP9), HEVC (H.265), or AV1 — HEVC and AV1 require hardware encoder support and are shown automatically when your device supports them.',
		},
		{
			q: 'Does Squash work without an internet connection?',
			a: 'After the initial page load, yes. All processing runs locally in your browser. You can even add it to your home screen as a PWA for offline access.',
		},
	],
};

export const audioSEO: PageSEO = {
	intro:
		'Pull the audio out of any video as MP3, M4A, Opus or WAV — right in your browser. Nothing is uploaded, there is no account and no watermark, and it usually takes seconds because audio is far lighter than video.',
	faqs: [
		{
			q: 'How do I extract audio from a video?',
			a: 'Drop your MP4, WebM, MOV or MKV file onto the page, pick a format and quality, and click Extract audio. You can download each file or all of them as a ZIP.',
		},
		{
			q: 'Which audio format should I choose?',
			a: 'MP3 works on virtually every device and app. M4A (AAC) is a good choice for Apple devices. Opus gives the smallest files at a given quality and is excellent for speech. WAV is uncompressed, so it is large — and it cannot add quality that the video’s original audio did not have.',
		},
		{
			q: 'How big will the audio file be?',
			a: 'For MP3, M4A and Opus the size is about bitrate × length. At 192 kbps that is roughly 1.4 MB per minute; at 64 kbps, about 0.5 MB per minute. Speech sounds fine at 64–128 kbps, which makes small files for transcription or sharing.',
		},
		{
			q: 'Is my video uploaded anywhere?',
			a: 'No. Squash reads the file and encodes the audio locally in your browser. The video never leaves your device.',
		},
		{
			q: 'Why is there no FLAC option?',
			a: 'Browsers cannot currently encode FLAC, so Squash only offers formats it can genuinely produce: MP3, M4A, Opus and WAV.',
		},
		{
			q: 'What if my video has no sound?',
			a: 'Squash tells you the file has no audio track. If it plays with sound elsewhere, the audio may use a codec your browser can’t read — try converting the video to MP4 first.',
		},
	],
};
