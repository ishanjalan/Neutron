<script lang="ts">
	import { formatBytes } from '$lib/stores/pdfs.svelte';
	import { ArrowRight, ArrowDown } from 'lucide-svelte';

	interface Props {
		originalSize: number;
		newSize: number;
		label?: string;
	}

	const { originalSize, newSize, label = 'File Size' }: Props = $props();

	const savings = $derived(originalSize - newSize);
	const savingsPercent = $derived(
		originalSize > 0 ? Math.round((savings / originalSize) * 100) : 0
	);
	const isSmaller = $derived(newSize < originalSize);
	const isLarger = $derived(newSize > originalSize);
	const ratio = $derived(originalSize > 0 ? newSize / originalSize : 1);
</script>

<div class="space-y-2">
	{#if label}
		<div class="text-xs text-surface-500 font-medium">{label}</div>
	{/if}
	
	<div class="flex items-center gap-3">
		<!-- Original size bar -->
		<div class="flex-1">
			<div class="h-6 bg-surface-700 rounded-lg overflow-hidden relative">
				<div 
					class="absolute inset-0 flex items-center px-2"
				>
					<span class="text-xs text-surface-400 font-medium truncate">{formatBytes(originalSize)}</span>
				</div>
			</div>
			<div class="text-[10px] text-surface-600 mt-0.5">Original</div>
		</div>

		<!-- Arrow -->
		<ArrowRight class="h-4 w-4 text-surface-600 flex-shrink-0" />

		<!-- New size bar -->
		<div class="flex-1">
			<div class="h-6 bg-surface-800 rounded-lg overflow-hidden relative">
				<div 
					class="absolute inset-y-0 left-0 {isSmaller ? 'bg-gradient-to-r from-green-500/30 to-green-500/10' : isLarger ? 'bg-gradient-to-r from-red-500/30 to-red-500/10' : 'bg-surface-700'} transition-all"
					style="width: {Math.min(100, ratio * 100)}%"
				></div>
				<div 
					class="absolute inset-0 flex items-center px-2"
				>
					<span class="text-xs font-medium truncate {isSmaller ? 'text-green-400' : isLarger ? 'text-red-400' : 'text-surface-400'}">
						{formatBytes(newSize)}
					</span>
				</div>
			</div>
			<div class="text-[10px] text-surface-600 mt-0.5">New</div>
		</div>

		<!-- Savings badge -->
		<div 
			class="flex-shrink-0 px-2 py-1 rounded-lg text-xs font-semibold
				{isSmaller 
					? 'bg-green-500/20 text-green-400' 
					: isLarger 
						? 'bg-red-500/20 text-red-400' 
						: 'bg-surface-700 text-surface-400'}"
		>
			{#if isSmaller}
				<div class="flex items-center gap-1">
					<ArrowDown class="h-3 w-3" />
					<span>{savingsPercent}%</span>
				</div>
			{:else if isLarger}
				<span>+{Math.abs(savingsPercent)}%</span>
			{:else}
				<span>Same</span>
			{/if}
		</div>
	</div>
</div>
