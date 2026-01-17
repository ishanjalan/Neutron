<script lang="ts">
	import { pdfs, formatBytes } from '$lib/stores/pdfs.svelte';
	import { Check, Clock, TrendingDown, Download, X, Zap } from 'lucide-svelte';
	import { fly, fade } from 'svelte/transition';
	import { downloadAll } from '$lib/utils/download';
	import { AnimatedNumber } from '@neutron/ui';

	interface Props {
		onDismiss?: () => void;
		compact?: boolean;
	}

	const { onDismiss, compact = false }: Props = $props();

	// Compute stats from completed items
	const completedItems = $derived(pdfs.items.filter((i) => i.status === 'completed'));
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
					<span class={totalSavings > 0 ? 'text-green-400' : 'text-amber-400'}>
						{totalSavings > 0 ? '-' : '+'}{Math.abs(savingsPercent)}%
					</span>
				{/if}
			</div>
			<button
				onclick={handleDownloadAll}
				class="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500/20 px-3 py-2 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/30"
			>
				<Download class="h-3.5 w-3.5" />
				Download {completedItems.length > 1 ? 'All' : ''}
			</button>
		</div>
	{:else}
		<!-- Full mode -->
		<div
			class="glass border-surface-700/50 rounded-2xl border p-4"
			transition:fly={{ y: 20, duration: 300 }}
		>
			<!-- Header -->
			<div class="mb-4 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
						<Check class="h-4 w-4 text-green-400" />
					</div>
					<div>
						<h3 class="text-surface-200 font-semibold">Processing Complete</h3>
						<p class="text-surface-500 text-xs">
							{completedItems.length} file{completedItems.length !== 1 ? 's' : ''} processed
						</p>
					</div>
				</div>
				{#if onDismiss}
					<button
						onclick={onDismiss}
						class="text-surface-500 hover:text-surface-300 hover:bg-surface-700/50 rounded-lg p-1.5 transition-colors"
					>
						<X class="h-4 w-4" />
					</button>
				{/if}
			</div>

			<!-- Stats Grid -->
			<div class="mb-4 grid grid-cols-3 gap-3">
				<!-- Original Size -->
				<div class="bg-surface-800/50 rounded-xl p-3 text-center">
					<div class="text-surface-500 mb-1 text-xs">Original</div>
					<div class="text-surface-200 text-sm font-semibold">
						<AnimatedNumber value={totalOriginalSize} format={formatBytes} />
					</div>
				</div>

				<!-- New Size -->
				<div class="bg-surface-800/50 rounded-xl p-3 text-center">
					<div class="text-surface-500 mb-1 text-xs">New Size</div>
					<div class="text-surface-200 text-sm font-semibold">
						<AnimatedNumber value={totalProcessedSize} format={formatBytes} />
					</div>
				</div>

				<!-- Savings -->
				<div
					class="from-accent-start/20 to-accent-end/20 border-accent-start/20 rounded-xl border bg-gradient-to-br p-3 text-center"
				>
					<div class="text-surface-500 mb-1 text-xs">Saved</div>
					<div class="text-accent-start text-sm font-semibold">
						{#if totalSavings > 0}
							<AnimatedNumber value={savingsPercent} format={(n) => `${Math.round(n)}%`} />
						{:else if totalSavings < 0}
							+<AnimatedNumber
								value={Math.abs(savingsPercent)}
								format={(n) => `${Math.round(n)}%`}
							/>
						{:else}
							0%
						{/if}
					</div>
				</div>
			</div>

			<!-- Download All Button -->
			<button
				onclick={handleDownloadAll}
				class="from-accent-start to-accent-end shadow-accent-start/30 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 font-semibold text-white shadow-lg transition-all hover:opacity-90"
			>
				<Download class="h-4 w-4" />
				Download {completedItems.length > 1 ? 'All' : ''}
			</button>
		</div>
	{/if}
{/if}
