<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import { AppHeader } from '@neutron/ui';
	import { Disc3 } from 'lucide-svelte';

	const navGroups = [
		{
			label: 'Create',
			links: [
				{ href: `${base}/video-to-gif`, label: 'Video to GIF' },
				{ href: `${base}/make`, label: 'GIF Maker' },
			],
		},
		{
			label: 'Edit',
			links: [
				{ href: `${base}/optimize`, label: 'Optimize' },
				{ href: `${base}/resize`, label: 'Resize' },
				{ href: `${base}/crop`, label: 'Crop' },
				{ href: `${base}/speed`, label: 'Speed' },
				{ href: `${base}/combine`, label: 'Combine' },
			],
		},
		{
			label: 'Extract',
			links: [{ href: `${base}/split`, label: 'Split Frames' }],
		},
	];
</script>

<AppHeader
	appName="Swirl"
	homeHref={`${base}/`}
	offlineMessage="Don't worry, Swirl works offline!"
	{navGroups}
	currentPath={$page.url.pathname}
	githubUrl="https://github.com/ishanjalan/Neutron/tree/main/apps/swirl"
>
	{#snippet icon()}
		<Disc3 class="h-5 w-5 text-white" strokeWidth={2.5} />
	{/snippet}
</AppHeader>
