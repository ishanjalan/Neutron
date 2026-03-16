<script lang="ts">
	import { resolve } from '$app/paths';
	import { AppHeader } from '@neutron/ui';
	import { FileText } from 'lucide-svelte';
</script>

<AppHeader
	appName="Smash"
	homeHref={resolve('/')}
	offlineMessage="Don't worry, Smash works offline!"
	githubUrl="https://github.com/ishanjalan/Neutron/tree/main/apps/smash"
>
	{#snippet icon()}
		<FileText class="h-5 w-5 text-white" strokeWidth={2.5} />
	{/snippet}
</AppHeader>
