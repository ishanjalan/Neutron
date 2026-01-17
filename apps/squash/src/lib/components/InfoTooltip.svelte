<script lang="ts">
	import { Info } from 'lucide-svelte';
	import { fade } from 'svelte/transition';

	let { content }: { content: string } = $props();
	let showTooltip = $state(false);
</script>

<button
	type="button"
	class="text-surface-500 hover:text-surface-300 relative ml-1 transition-colors"
	onmouseenter={() => (showTooltip = true)}
	onmouseleave={() => (showTooltip = false)}
	onfocus={() => (showTooltip = true)}
	onblur={() => (showTooltip = false)}
	aria-label="More information"
>
	<Info class="h-4 w-4" />
	{#if showTooltip}
		<div
			class="bg-surface-800 text-surface-200 absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg p-3 text-left text-sm font-normal shadow-xl ring-1 ring-white/10"
			transition:fade={{ duration: 100 }}
			role="tooltip"
		>
			{content}
			<div
				class="border-t-surface-800 absolute left-1/2 top-full -mt-1 -translate-x-1/2 border-4 border-transparent"
			></div>
		</div>
	{/if}
</button>
