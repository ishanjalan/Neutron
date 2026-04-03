import { NEUTRON_APPS } from '@neutron/utils';
import type { RelatedTool } from '@neutron/ui';

export const squishRelated: RelatedTool[] = [
	{
		label: 'Compress Videos',
		href: NEUTRON_APPS.squash.url,
		description: 'GPU-accelerated video compression — no upload, runs in your browser.',
	},
	{
		label: 'Compress PDFs',
		href: NEUTRON_APPS.smash.url,
		description: 'Shrink PDF files without losing quality. No upload required.',
	},
	{
		label: 'Optimise GIFs',
		href: NEUTRON_APPS.swirl.url,
		description: 'Compress and edit GIFs for Discord, Slack, and social media.',
	},
];
