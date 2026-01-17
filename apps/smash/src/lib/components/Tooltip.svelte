<script lang="ts">
	import { HelpCircle } from 'lucide-svelte';

	interface Props {
		text: string;
		position?: 'top' | 'bottom' | 'left' | 'right';
	}

	const { text, position = 'top' }: Props = $props();

	let showTooltip = $state(false);

	const positionClasses = {
		top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
		bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
		left: 'right-full top-1/2 -translate-y-1/2 mr-2',
		right: 'left-full top-1/2 -translate-y-1/2 ml-2'
	};

	const arrowClasses = {
		top: 'top-full left-1/2 -translate-x-1/2 border-t-surface-700 border-x-transparent border-b-transparent',
		bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-surface-700 border-x-transparent border-t-transparent',
		left: 'left-full top-1/2 -translate-y-1/2 border-l-surface-700 border-y-transparent border-r-transparent',
		right: 'right-full top-1/2 -translate-y-1/2 border-r-surface-700 border-y-transparent border-l-transparent'
	};
</script>

<span
	class="relative inline-flex items-center"
	onmouseenter={() => (showTooltip = true)}
	onmouseleave={() => (showTooltip = false)}
	onfocus={() => (showTooltip = true)}
	onblur={() => (showTooltip = false)}
	role="tooltip"
>
	<button
		type="button"
		class="p-0.5 text-surface-500 hover:text-surface-300 transition-colors"
		aria-label="More info"
	>
		<HelpCircle class="h-3.5 w-3.5" />
	</button>

	{#if showTooltip}
		<div
			class="absolute z-50 {positionClasses[position]} pointer-events-none"
		>
			<div class="bg-surface-700 text-surface-200 text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs whitespace-normal">
				{text}
			</div>
			<div
				class="absolute border-4 {arrowClasses[position]}"
			></div>
		</div>
	{/if}
</span>
