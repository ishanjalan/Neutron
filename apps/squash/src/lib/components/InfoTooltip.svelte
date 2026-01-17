<script lang="ts">
	import { Info } from 'lucide-svelte';
	import { fade } from 'svelte/transition';

	let { content }: { content: string } = $props();
	let showTooltip = $state(false);
</script>

<button
	type="button"
	class="relative ml-1 text-surface-500 hover:text-surface-300 transition-colors"
	onmouseenter={() => (showTooltip = true)}
	onmouseleave={() => (showTooltip = false)}
	onfocus={() => (showTooltip = true)}
	onblur={() => (showTooltip = false)}
	aria-label="More information"
>
	<Info class="h-4 w-4" />
	{#if showTooltip}
		<div
			class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-lg bg-surface-800 text-sm text-surface-200 shadow-xl ring-1 ring-white/10 z-50 text-left font-normal"
			transition:fade={{ duration: 100 }}
			role="tooltip"
		>
			{content}
			<div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-surface-800"></div>
		</div>
	{/if}
</button>
