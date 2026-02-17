<script lang="ts">
	import { images, formatBytes } from '$lib';
	import { AnimatedNumber } from '@neutron/ui';
	import { TrendingDown, Zap, Clock, CheckCircle2, Sparkles } from 'lucide-svelte';
	import { fade, scale, fly } from 'svelte/transition';
	import { spring } from 'svelte/motion';

	// Track processing state
	const processingCount = $derived(images.items.filter((i) => i.status === 'processing').length);
	const completedCount = $derived(images.items.filter((i) => i.status === 'completed').length);
	const totalCount = $derived(images.items.length);
	const isProcessing = $derived(processingCount > 0);

	// Calculate cumulative savings from completed images
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

	// Estimate time saved on page load (rough estimate: 1MB = 3 seconds on slow connection)
	const timeSavedSeconds = $derived(Math.round((totalSaved / 1024 / 1024) * 3));

	// Processing time elapsed
	const batchStartTime = $derived(images.batchStats.startTime);
	let elapsedSeconds = $state(0);

	// Update elapsed time while processing
	$effect(() => {
		if (isProcessing && batchStartTime) {
			const interval = setInterval(() => {
				elapsedSeconds = Math.round((Date.now() - batchStartTime) / 1000);
			}, 100);

			return () => clearInterval(interval);
		}
	});

	// Spring animation for progress bar
	const progress = spring(0, { stiffness: 0.1, damping: 0.7 });
	$effect(() => {
		const currentProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
		progress.set(currentProgress);
	});

	// Show ticker when processing or just completed
	const showTicker = $derived(
		isProcessing || (completedCount > 0 && completedCount === totalCount)
	);
</script>

{#if showTicker && totalCount > 0}
	<div
		class="glass fixed bottom-6 left-1/2 z-40 w-full max-w-md -translate-x-1/2 overflow-hidden rounded-2xl shadow-2xl"
		in:fly={{ y: 100, duration: 400 }}
		out:fly={{ y: 100, duration: 200 }}
	>
		<!-- Progress bar background -->
		<div class="bg-surface-800 absolute inset-x-0 top-0 h-1">
			<div
				class="from-accent-start to-accent-end h-full bg-gradient-to-r transition-all duration-300"
				style="width: {$progress}%"
			></div>
		</div>

		<div class="p-4">
			<!-- Header -->
			<div class="mb-3 flex items-center justify-between">
				<div class="flex items-center gap-2">
					{#if isProcessing}
						<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
							<Zap class="h-4 w-4 animate-pulse text-blue-400" />
						</div>
						<div>
							<h3 class="text-surface-100 text-sm font-semibold">Processing...</h3>
							<p class="text-surface-500 text-xs">
								{completedCount} of {totalCount} complete
							</p>
						</div>
					{:else}
						<div
							class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20"
							in:scale={{ duration: 400 }}
						>
							<CheckCircle2 class="h-4 w-4 text-green-400" />
						</div>
						<div>
							<h3 class="text-surface-100 text-sm font-semibold">Complete! 🎉</h3>
							<p class="text-surface-500 text-xs">{totalCount} images optimized</p>
						</div>
					{/if}
				</div>

				<!-- Elapsed time -->
				{#if isProcessing}
					<div class="text-surface-400 flex items-center gap-1.5">
						<Clock class="h-3.5 w-3.5" />
						<span class="text-xs font-medium">{elapsedSeconds}s</span>
					</div>
				{/if}
			</div>

			<!-- Stats Grid -->
			<div class="grid grid-cols-2 gap-3">
				<!-- Total Saved -->
				<div class="bg-surface-800/50 rounded-lg p-3">
					<div class="mb-1 flex items-center gap-1.5">
						<TrendingDown class="h-3.5 w-3.5 text-green-400" />
						<span class="text-surface-400 text-xs font-medium uppercase tracking-wide">Saved</span>
					</div>
					<p class="text-surface-100 text-lg font-bold">
						<AnimatedNumber value={totalSaved} format={formatBytes} duration={600} />
					</p>
					<p class="text-surface-500 mt-0.5 text-xs">
						<AnimatedNumber
							value={savingsPercent}
							format={(n) => `${Math.round(n)}%`}
							duration={600}
						/>
						smaller
					</p>
				</div>

				<!-- Time Impact -->
				<div class="bg-surface-800/50 rounded-lg p-3">
					<div class="mb-1 flex items-center gap-1.5">
						<Sparkles class="h-3.5 w-3.5 text-purple-400" />
						<span class="text-surface-400 text-xs font-medium uppercase tracking-wide">Impact</span>
					</div>
					<p class="text-surface-100 text-lg font-bold">
						{#if timeSavedSeconds > 60}
							{Math.round(timeSavedSeconds / 60)}m {timeSavedSeconds % 60}s
						{:else}
							{timeSavedSeconds}s
						{/if}
					</p>
					<p class="text-surface-500 mt-0.5 text-xs">faster loads</p>
				</div>
			</div>

			<!-- Milestone celebrations -->
			{#if completedCount > 0 && !isProcessing}
				<div class="from-accent-start/10 to-accent-end/10 mt-3 rounded-lg bg-gradient-to-r p-3">
					<p class="text-surface-300 text-center text-xs">
						{#if totalSaved > 10 * 1024 * 1024}
							<strong class="text-accent-start">Wow!</strong> You saved over 10MB! 🚀
						{:else if totalSaved > 5 * 1024 * 1024}
							<strong class="text-accent-start">Nice!</strong> That's a significant reduction! ⚡
						{:else if totalSaved > 1 * 1024 * 1024}
							<strong class="text-accent-start">Great!</strong> Every megabyte counts! ✨
						{:else}
							<strong class="text-accent-start">Success!</strong> Your images are optimized! 🎉
						{/if}
					</p>
				</div>
			{/if}
		</div>
	</div>
{/if}
