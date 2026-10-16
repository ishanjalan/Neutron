import type { SEOFaq } from '@neutron/ui';

/**
 * Per-platform landing pages. Each page preselects a target size and carries
 * copy specific to that platform's limit — keep them genuinely different
 * rather than a template with a swapped name.
 */
export interface SizeTarget {
	slug: string;
	platform: string;
	/** The platform's stated limit, in MB (what we quote to the reader). */
	limitMB: number;
	/** What we actually aim for — below the limit, because encoders overshoot. */
	targetMB: number;
	title: string;
	description: string;
	heading: string;
	intro: string;
	/** Why the target sits below the limit, shown next to the length table. */
	headroomNote: string;
	tips: string[];
	faqs: SEOFaq[];
}

export const SIZE_TARGETS: SizeTarget[] = [
	{
		slug: 'compress-video-for-discord',
		platform: 'Discord',
		limitMB: 20,
		targetMB: 19,
		title: 'Compress Video for Discord — Under 20 MB, Free | Squash',
		description:
			'Get a clip under Discord’s free upload limit so it embeds and plays in chat. Private, in-browser, no upload and no watermark.',
		heading: 'Compress video for Discord',
		intro:
			'Discord caps free uploads per file, and a clip over the cap simply won’t send. Squash shrinks gameplay clips and screen recordings to fit, and outputs MP4 (H.264), the format that plays inline for the most people.',
		headroomNote:
			'Squash aims for 19 MB so the file clears the 20 MB cap. Discord raised the free limit from 10 MB to 20 MB in August 2026, and Nitro subscribers get higher limits. Discord says it is still experimenting with limits, so some accounts may differ.',
		tips: [
			'Keep the output as MP4 (H.264) for the widest inline playback. HEVC and AV1 are smaller but not every viewer can play them.',
			'Fast gameplay needs more bitrate than a talking head. If a 1080p clip looks rough at this size, drop to 720p rather than accepting blocky motion.',
			'Clips over a minute get tight quickly at this size — trim to the moment that matters.',
		],
		faqs: [
			{
				q: 'What is the Discord file size limit?',
				a: 'For accounts without Nitro, the maximum upload is 20 MB per file as of August 2026, up from 10 MB, according to Discord’s File Attachments FAQ. Nitro subscribers can upload larger files. Discord has changed this limit before, so check its help page if an upload is rejected.',
			},
			{
				q: 'Which format should I use for Discord videos?',
				a: 'MP4 with H.264 video and AAC audio is the safest choice and plays inline in the Discord client and on mobile.',
			},
			{
				q: 'Will compressing hurt gameplay clip quality?',
				a: 'Some loss is unavoidable at 20 MB, but dropping resolution to 720p usually looks better than keeping 1080p at a starved bitrate.',
			},
		],
	},
	{
		slug: 'compress-video-for-email',
		platform: 'email',
		limitMB: 25,
		targetMB: 20,
		title: 'Compress Video for Email — Under 25 MB, Free | Squash',
		description:
			'Shrink a video so it fits as an email attachment instead of bouncing. Runs in your browser — nothing is uploaded, no account needed.',
		heading: 'Compress video for email',
		intro:
			'Personal Gmail accounts allow 25 MB of attachments per message, and work or school accounts follow limits set by their administrator. Squash shrinks a video to a size that sends as a normal attachment, without uploading the file to yet another service.',
		headroomNote:
			'Email encodes attachments, which makes them roughly a third bigger in transit, so Squash aims for 20 MB rather than the full 25 MB. The limit also covers all attachments in the message together.',
		tips: [
			'The 25 MB limit is for the whole message, so leave room if you are attaching other files too.',
			'Sending to a work or school address? Its administrator sets the limit, which may be lower than 25 MB. If a message bounces, compress again with a lower target size.',
			'For a long video, a shared link is usually kinder to the recipient than a big attachment — compress for a preview and link the original.',
		],
		faqs: [
			{
				q: 'What is the Gmail attachment size limit?',
				a: 'Personal Gmail accounts have a 25 MB limit. If the attachments exceed it, Gmail removes them and adds a Google Drive link to the email instead. Work or school accounts are set by the administrator, and other providers can be stricter.',
			},
			{
				q: 'Why not target exactly 25 MB?',
				a: 'Attachments are encoded for email, which adds roughly a third to their size in transit, and compressors can overshoot a target slightly. Aiming for 20 MB leaves safe headroom.',
			},
			{
				q: 'Is it safe to compress a private video here?',
				a: 'Yes. Squash works entirely in your browser; the video is never uploaded to a server.',
			},
		],
	},
];

export function getSizeTarget(slug: string): SizeTarget | undefined {
	return SIZE_TARGETS.find((t) => t.slug === slug);
}

/** Typical H.264 video bitrates (kbps) for ordinary talking/screen/phone footage. */
export const LENGTH_TABLE_PROFILES = [
	{ label: '480p', videoKbps: 800 },
	{ label: '720p', videoKbps: 1500 },
	{ label: '1080p', videoKbps: 3000 },
] as const;

const AUDIO_KBPS = 128;

/** Minutes of video that fit in `targetMB` at the given video bitrate (plus 128 kbps audio). */
export function minutesThatFit(targetMB: number, videoKbps: number): number {
	const bits = targetMB * 1024 * 1024 * 8;
	const seconds = bits / ((videoKbps + AUDIO_KBPS) * 1000);
	return seconds / 60;
}

export function formatMinutes(minutes: number): string {
	if (minutes < 1) return `${Math.round(minutes * 60)} sec`;
	const whole = Math.floor(minutes);
	const secs = Math.round((minutes - whole) * 60);
	return secs === 0 ? `${whole} min` : `${whole} min ${secs} sec`;
}
