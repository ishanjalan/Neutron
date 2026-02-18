<script lang="ts">
	import { images, formatBytes } from '$lib';
	import { AnimatedNumber } from '@neutron/ui';
	import { TrendingDown, Zap, Clock, CheckCircle2, X } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import { spring } from 'svelte/motion';

	const processingCount = $derived(images.items.filter((i) => i.status === 'processing').length);
	const completedCount = $derived(images.items.filter((i) => i.status === 'completed').length);
	const totalCount = $derived(images.items.length);
	const isProcessing = $derived(processingCount > 0);

	const totalOriginalSize = $derived(
		images.items.filter((i) => i.status === 'completed').reduce((acc, i) => acc + i.originalSize, 0)
	);
	const totalCompressedSize = $derived(
		images.items
			.filter((i) => i.status === 'completed')
			.reduce((acc, i) => acc + (i.compressedSize || 0), 0)
	);
	const totalSaved = $derived(totalOriginalSize - totalCompressedSize);
	const savingsPercent = $derived(
		totalOriginalSize > 0 ? Math.round((totalSaved / totalOriginalSize) * 100) : 0
	);

	const batchStartTime = $derived(images.batchStats.startTime);
	let elapsedSeconds = $state(0);
	let dismissed = $state(false);
	let autoHideTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if (isProcessing && batchStartTime) {
			dismissed = false;
			const interval = setInterval(() => {
				elapsedSeconds = Math.round((Date.now() - batchStartTime) / 1000);
			}, 100);
			return () => clearInterval(interval);
		}
	});

	// Auto-dismiss 5s after completion
	$effect(() => {
		if (!isProcessing && completedCount > 0 && completedCount === totalCount) {
			clearTimeout(autoHideTimer);
			autoHideTimer = setTimeout(() => {
				dismissed = true;
			}, 5000);
			return () => clearTimeout(autoHideTimer);
		}
	});

	const progress = spring(0, { stiffness: 0.1, damping: 0.7 });
	$effect(() => {
		const currentProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
		progress.set(currentProgress);
	});

	const showTicker = $derived(
		!dismissed && (isProcessing || (completedCount > 0 && completedCount === totalCount))
	);

	function dismiss() {
		dismissed = true;
	}
</script>

{#if showTicker && totalCount > 0}
	<div
		class="glass fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 overflow-hidden rounded-xl shadow-2xl"
		in:fly={{ y: 60, duration: 300 }}
		out:fly={{ y: 60, duration: 200 }}
	>
		<!-- Progress bar -->
		<div class="bg-surface-800 absolute inset-x-0 top-0 h-0.5">
			<div
				class="from-accent-start to-accent-end h-full bg-gradient-to-r transition-all duration-300"
				style="width: {$progress}%"
			></div>
		</div>

		<div class="flex items-center gap-3 px-4 py-3">
			<!-- Icon -->
			{#if isProcessing}
				<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/20">
					<Zap class="h-4 w-4 animate-pulse text-blue-400" />
				</div>
			{:else}
				<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-500/20">
					<CheckCircle2 class="h-4 w-4 text-green-400" />
				</div>
			{/if}

			<!-- Content -->
			<div class="min-w-0 flex-1">
				{#if isProcessing}
					<p class="text-surface-100 text-sm font-medium">
						{completedCount}/{totalCount} optimized
					</p>
				{:else}
					<p class="text-surface-100 text-sm font-medium">
						{totalCount} done
					</p>
				{/if}

				<div class="text-surface-400 flex items-center gap-2 text-xs">
					{#if totalSaved > 0}
						<span class="flex items-center gap-1">
							<TrendingDown class="h-3 w-3 text-green-400" />
							<AnimatedNumber value={totalSaved} format={formatBytes} duration={400} />
							<span>({savingsPercent}%)</span>
						</span>
					{/if}
					{#if isProcessing}
						<span class="flex items-center gap-1">
							<Clock class="h-3 w-3" />
							{elapsedSeconds}s
						</span>
					{/if}
				</div>
			</div>

			<!-- Dismiss button -->
			<button
				onclick={dismiss}
				class="text-surface-500 hover:text-surface-200 hover:bg-surface-700/50 -mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
				aria-label="Dismiss"
			>
				<X class="h-3.5 w-3.5" />
			</button>
		</div>
	</div>
{/if}
