<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { AppHeader } from '@neutron/ui';
	import { Disc3 } from 'lucide-svelte';

	const navGroups = [
		{
			label: 'Create',
			links: [
				{ href: resolve(`video-to-gif`), label: 'Video to GIF' },
				{ href: resolve(`make`), label: 'GIF Maker' },
			],
		},
		{
			label: 'Edit',
			links: [
				{ href: resolve(`optimize`), label: 'Optimize' },
				{ href: resolve(`resize`), label: 'Resize' },
				{ href: resolve(`crop`), label: 'Crop' },
				{ href: resolve(`speed`), label: 'Speed' },
			],
		},
	];
</script>

<AppHeader
	appName="Swirl"
	homeHref={resolve('/')}
	offlineMessage="Don't worry, Swirl works offline!"
	{navGroups}
	currentPath={page.url.pathname}
	githubUrl="https://github.com/ishanjalan/Neutron/tree/main/apps/swirl"
>
	{#snippet icon()}
		<Disc3 class="h-5 w-5 text-white" strokeWidth={2.5} />
	{/snippet}
</AppHeader>
