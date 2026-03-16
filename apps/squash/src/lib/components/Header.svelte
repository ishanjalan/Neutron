<script lang="ts">
	import { resolve } from '$app/paths';
	import { AppHeader } from '@neutron/ui';
	import { Film } from 'lucide-svelte';
</script>

<AppHeader
	appName="Squash"
	homeHref={resolve('/')}
	offlineMessage="Don't worry, Squash works offline!"
	githubUrl="https://github.com/ishanjalan/Neutron/tree/main/apps/squash"
>
	{#snippet icon()}
		<Film class="h-5 w-5 text-white" strokeWidth={2.5} />
	{/snippet}
</AppHeader>
