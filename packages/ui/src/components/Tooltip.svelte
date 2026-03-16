<script lang="ts">
	import { HelpCircle } from 'lucide-svelte';
	import { fade } from 'svelte/transition';

	interface Props {
		content: string;
		position?: 'top' | 'bottom' | 'left' | 'right';
		icon?: import('svelte').Snippet;
	}

	const { content, position = 'top', icon }: Props = $props();

	let showTooltip = $state(false);

	const positionClasses = {
		top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
		bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
		left: 'right-full top-1/2 -translate-y-1/2 mr-2',
		right: 'left-full top-1/2 -translate-y-1/2 ml-2',
	};

	const arrowClasses = {
		top: 'top-full left-1/2 -translate-x-1/2 border-t-surface-700 border-x-transparent border-b-transparent',
		bottom:
			'bottom-full left-1/2 -translate-x-1/2 border-b-surface-700 border-x-transparent border-t-transparent',
		left: 'left-full top-1/2 -translate-y-1/2 border-l-surface-700 border-y-transparent border-r-transparent',
		right:
			'right-full top-1/2 -translate-y-1/2 border-r-surface-700 border-y-transparent border-l-transparent',
	};
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_no_static_element_interactions -->
<span
	class="relative inline-flex items-center"
	onmouseenter={() => (showTooltip = true)}
	onmouseleave={() => (showTooltip = false)}
	onfocus={() => (showTooltip = true)}
	onblur={() => (showTooltip = false)}
	tabindex="0"
>
	<button
		type="button"
		class="text-surface-500 hover:text-surface-300 p-0.5 transition-colors"
		aria-label="More info"
	>
		{#if icon}
			{@render icon()}
		{:else}
			<HelpCircle class="h-3.5 w-3.5" />
		{/if}
	</button>

	{#if showTooltip}
		<div class="absolute z-50 {positionClasses[position]} pointer-events-none" role="tooltip">
			<div
				class="bg-surface-700 text-surface-200 max-w-xs rounded-lg px-3 py-2 text-xs whitespace-normal shadow-lg"
				transition:fade={{ duration: 100 }}
			>
				{content}
			</div>
			<div class="absolute border-4 {arrowClasses[position]}"></div>
		</div>
	{/if}
</span>
