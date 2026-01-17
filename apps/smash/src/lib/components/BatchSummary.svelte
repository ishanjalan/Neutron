<script lang="ts">
	import { pdfs, formatBytes } from '$lib/stores/pdfs.svelte';
	import { Check, Clock, TrendingDown, Download, X, Zap } from 'lucide-svelte';
	import { fly, fade } from 'svelte/transition';
	import { downloadAll } from '$lib/utils/download';
	import AnimatedNumber from './AnimatedNumber.svelte';

	interface Props {
		onDismiss?: () => void;
		compact?: boolean;
	}

	const { onDismiss, compact = false }: Props = $props();

	// Compute stats from completed items
	const completedItems = $derived(pdfs.items.filter(i => i.status === 'completed'));
	const hasCompletedItems = $derived(completedItems.length > 0);

	const totalOriginalSize = $derived(
		completedItems.reduce((acc, item) => acc + item.originalSize, 0)
	);

	const totalProcessedSize = $derived(
		completedItems.reduce((acc, item) => acc + (item.processedSize || 0), 0)
	);

	const totalSavings = $derived(totalOriginalSize - totalProcessedSize);
	const savingsPercent = $derived(
		totalOriginalSize > 0 ? Math.round((totalSavings / totalOriginalSize) * 100) : 0
	);

	function handleDownloadAll() {
		const tool = pdfs.settings.tool;
		downloadAll(completedItems, tool);
	}
</script>

{#if hasCompletedItems}
	{#if compact}
		<!-- Compact mode for sidebar -->
		<div class="space-y-2">
			<div class="flex items-center justify-between text-xs">
				<span class="text-surface-400">{completedItems.length} done</span>
				{#if totalSavings !== 0}
					<span class="{totalSavings > 0 ? 'text-green-400' : 'text-amber-400'}">
						{totalSavings > 0 ? '-' : '+'}{Math.abs(savingsPercent)}%
					</span>
				{/if}
			</div>
			<button
				onclick={handleDownloadAll}
				class="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
			>
				<Download class="h-3.5 w-3.5" />
				Download {completedItems.length > 1 ? 'All' : ''}
			</button>
		</div>
	{:else}
		<!-- Full mode -->
		<div 
			class="glass rounded-2xl p-4 border border-surface-700/50"
			transition:fly={{ y: 20, duration: 300 }}
		>
			<!-- Header -->
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
						<Check class="h-4 w-4 text-green-400" />
					</div>
					<div>
						<h3 class="font-semibold text-surface-200">Processing Complete</h3>
						<p class="text-xs text-surface-500">{completedItems.length} file{completedItems.length !== 1 ? 's' : ''} processed</p>
					</div>
				</div>
				{#if onDismiss}
					<button
						onclick={onDismiss}
						class="p-1.5 text-surface-500 hover:text-surface-300 transition-colors rounded-lg hover:bg-surface-700/50"
					>
						<X class="h-4 w-4" />
					</button>
				{/if}
			</div>

			<!-- Stats Grid -->
			<div class="grid grid-cols-3 gap-3 mb-4">
				<!-- Original Size -->
				<div class="bg-surface-800/50 rounded-xl p-3 text-center">
					<div class="text-xs text-surface-500 mb-1">Original</div>
					<div class="font-semibold text-surface-200 text-sm">
						<AnimatedNumber value={totalOriginalSize} format={formatBytes} />
					</div>
				</div>

				<!-- New Size -->
				<div class="bg-surface-800/50 rounded-xl p-3 text-center">
					<div class="text-xs text-surface-500 mb-1">New Size</div>
					<div class="font-semibold text-surface-200 text-sm">
						<AnimatedNumber value={totalProcessedSize} format={formatBytes} />
					</div>
				</div>

				<!-- Savings -->
				<div class="bg-gradient-to-br from-accent-start/20 to-accent-end/20 rounded-xl p-3 text-center border border-accent-start/20">
					<div class="text-xs text-surface-500 mb-1">Saved</div>
					<div class="font-semibold text-accent-start text-sm">
						{#if totalSavings > 0}
							<AnimatedNumber value={savingsPercent} format={(n) => `${Math.round(n)}%`} />
						{:else if totalSavings < 0}
							+<AnimatedNumber value={Math.abs(savingsPercent)} format={(n) => `${Math.round(n)}%`} />
						{:else}
							0%
						{/if}
					</div>
				</div>
			</div>

			<!-- Download All Button -->
			<button
				onclick={handleDownloadAll}
				class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-accent-start to-accent-end text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-accent-start/30"
			>
				<Download class="h-4 w-4" />
				Download {completedItems.length > 1 ? 'All' : ''}
			</button>
		</div>
	{/if}
{/if}
