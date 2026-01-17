<script lang="ts">
	import { X, Download, CheckCircle, TrendingDown, Files, Package } from 'lucide-svelte';
	import { scale, fade } from 'svelte/transition';
	import { formatBytes } from '$lib/utils/gif-parser';

	let {
		totalFiles,
		totalOriginalSize,
		totalCompressedSize,
		ondownloadAll,
		onclose
	}: {
		totalFiles: number;
		totalOriginalSize: number;
		totalCompressedSize: number;
		ondownloadAll: () => void;
		onclose: () => void;
	} = $props();

	const savings = $derived(totalOriginalSize > 0 ? totalOriginalSize - totalCompressedSize : 0);
	const savingsPercent = $derived(totalOriginalSize > 0 ? Math.round((1 - totalCompressedSize / totalOriginalSize) * 100) : 0);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}

	function handleDownloadAndClose() {
		ondownloadAll();
		onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
<!-- Backdrop -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
	onclick={handleBackdropClick}
	transition:fade={{ duration: 150 }}
	role="dialog"
	aria-modal="true"
	aria-label="Batch processing summary"
	tabindex="-1"
>
	<!-- Modal -->
	<div
		class="glass w-full max-w-md rounded-2xl p-6"
		transition:scale={{ duration: 200, start: 0.95 }}
	>
		<!-- Header -->
		<div class="flex items-center justify-between mb-6">
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
					<CheckCircle class="h-5 w-5 text-green-400" />
				</div>
				<div>
					<h3 class="text-lg font-semibold text-surface-100">Processing Complete!</h3>
					<p class="text-sm text-surface-500">Your GIFs are ready</p>
				</div>
			</div>
			<button
				onclick={onclose}
				class="rounded-lg p-2 text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors"
				aria-label="Close"
			>
				<X class="h-5 w-5" />
			</button>
		</div>

		<!-- Stats Grid -->
		<div class="grid grid-cols-2 gap-4 mb-6">
			<!-- Files Processed -->
			<div class="rounded-xl bg-surface-800/50 p-4">
				<div class="flex items-center gap-2 mb-1">
					<Files class="h-4 w-4 text-blue-400" />
					<span class="text-xs text-surface-500 uppercase tracking-wide">Files</span>
				</div>
				<p class="text-2xl font-bold text-surface-100">{totalFiles}</p>
			</div>

			<!-- Size Saved -->
			<div class="rounded-xl bg-surface-800/50 p-4">
				<div class="flex items-center gap-2 mb-1">
					<TrendingDown class="h-4 w-4 text-green-400" />
					<span class="text-xs text-surface-500 uppercase tracking-wide">Saved</span>
				</div>
				<p class="text-2xl font-bold text-green-400">{formatBytes(savings)}</p>
			</div>

			<!-- Before Size -->
			<div class="rounded-xl bg-surface-800/50 p-4">
				<div class="flex items-center gap-2 mb-1">
					<span class="text-xs text-surface-500 uppercase tracking-wide">Before</span>
				</div>
				<p class="text-lg font-semibold text-surface-300">{formatBytes(totalOriginalSize)}</p>
			</div>

			<!-- After Size -->
			<div class="rounded-xl bg-surface-800/50 p-4">
				<div class="flex items-center gap-2 mb-1">
					<span class="text-xs text-surface-500 uppercase tracking-wide">After</span>
				</div>
				<p class="text-lg font-semibold text-surface-300">{formatBytes(totalCompressedSize)}</p>
			</div>
		</div>

		<!-- Savings Badge -->
		{#if savingsPercent > 0}
			<div class="flex items-center justify-center mb-6">
				<div class="inline-flex items-center gap-2 rounded-full bg-green-500/20 px-4 py-2">
					<TrendingDown class="h-5 w-5 text-green-400" />
					<span class="text-lg font-bold text-green-400">{savingsPercent}% smaller</span>
				</div>
			</div>
		{/if}

		<!-- Action Buttons -->
		<div class="flex gap-3">
			<button
				onclick={onclose}
				class="flex-1 rounded-xl bg-surface-700 px-4 py-3 text-sm font-medium text-surface-200 hover:bg-surface-600 transition-colors"
			>
				Close
			</button>
			<button
				onclick={handleDownloadAndClose}
				class="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-start to-accent-end px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-start/30 hover:shadow-xl hover:shadow-accent-start/40 transition-all"
			>
				<Package class="h-4 w-4" />
				Download {totalFiles > 1 ? 'All as ZIP' : ''}
			</button>
		</div>
	</div>
</div>
