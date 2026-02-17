<script lang="ts">
	import { formatBytes } from '$lib';
	import { AnimatedNumber } from '@neutron/ui';
	import { Trophy, Zap, TrendingUp, Share2, X, Sparkles, Globe, Gauge, Award } from 'lucide-svelte';
	import { scale, fly, fade } from 'svelte/transition';
	import { spring } from 'svelte/motion';

	let {
		open = false,
		totalSaved,
		imageCount,
		savingsPercent,
		onclose,
		ondownload,
	}: {
		open: boolean;
		totalSaved: number;
		imageCount: number;
		savingsPercent: number;
		onclose: () => void;
		ondownload: () => void;
	} = $props();

	// Calculate impact metrics
	const pageLoadsEquivalent = $derived(Math.round(totalSaved / (3 * 1024 * 1024))); // ~3MB per page
	const secondsFaster = $derived(Math.round((totalSaved / 1024 / 1024) * 2)); // ~2s per MB
	const co2Saved = $derived(Math.round((totalSaved / 1024 / 1024) * 0.28)); // ~0.28g CO2 per MB

	// Achievement level based on savings
	const achievementLevel = $derived(
		totalSaved > 50 * 1024 * 1024
			? { title: 'Compression Master', icon: Trophy, color: 'from-amber-500 to-orange-500' }
			: totalSaved > 20 * 1024 * 1024
				? { title: 'Size Slayer', icon: Award, color: 'from-purple-500 to-pink-500' }
				: totalSaved > 10 * 1024 * 1024
					? { title: 'Bandwidth Hero', icon: Zap, color: 'from-blue-500 to-cyan-500' }
					: { title: 'Space Saver', icon: Sparkles, color: 'from-green-500 to-emerald-500' }
	);

	// Confetti particles for celebration
	const confettiCount = 50;
	const confettiColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

	function handleShare() {
		const text = `🎉 Just optimized ${imageCount} images with Squish and saved ${formatBytes(totalSaved)} (${savingsPercent}% smaller)!`;
		const url = 'https://ishanjalan.github.io/Squish/';

		if (navigator.share) {
			navigator.share({ title: 'Squish Results', text, url }).catch(() => {
				/* user cancelled */
			});
		} else {
			// Fallback: copy to clipboard
			navigator.clipboard.writeText(`${text} ${url}`);
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		in:fade={{ duration: 200 }}
		out:fade={{ duration: 150 }}
	>
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/60 backdrop-blur-md"></div>

		<!-- Confetti -->
		{#each Array(confettiCount) as _, i}
			{@const delay = i * 20}
			{@const color = confettiColors[i % confettiColors.length]}
			{@const xStart = Math.random() * 100}
			{@const rotation = Math.random() * 360}
			<div
				class="pointer-events-none absolute"
				style="left: {xStart}%; top: -20px;"
				in:fly={{
					y: -20,
					duration: 2000 + Math.random() * 1000,
					delay,
				}}
			>
				<div
					class="h-3 w-3 rounded-full"
					style="background: {color}; transform: rotate({rotation}deg);"
				></div>
			</div>
		{/each}

		<!-- Modal -->
		<div
			class="glass relative w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl"
			in:scale={{ duration: 500, start: 0.8 }}
			out:scale={{ duration: 200, start: 1 }}
		>
			<!-- Close button -->
			<button
				onclick={onclose}
				class="text-surface-400 hover:bg-surface-700 absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
				aria-label="Close"
			>
				<X class="h-5 w-5" />
			</button>

			<!-- Header with achievement badge -->
			<div class="from-accent-start/20 to-accent-end/20 bg-gradient-to-br p-8 pb-6 text-center">
				<div class="mb-4 flex justify-center">
					<div
						class="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br {achievementLevel.color} shadow-lg"
						in:scale={{ duration: 600, delay: 200, start: 0 }}
					>
						<svelte:component this={achievementLevel.icon} class="h-10 w-10 text-white" />
					</div>
				</div>

				<h2 class="text-surface-50 mb-2 text-3xl font-bold">
					{achievementLevel.title}!
				</h2>
				<p class="text-surface-300 text-lg">
					You optimized <strong class="text-accent-start">{imageCount}</strong> images
				</p>
			</div>

			<!-- Stats -->
			<div class="p-6 pt-4">
				<!-- Main savings -->
				<div
					class="bg-gradient-to-br {achievementLevel.color} mb-6 rounded-2xl p-6 text-center text-white"
				>
					<p class="mb-2 text-sm font-medium uppercase tracking-wider opacity-90">Total Saved</p>
					<p class="mb-1 text-4xl font-bold">
						<AnimatedNumber value={totalSaved} format={formatBytes} duration={1000} />
					</p>
					<p class="text-lg font-semibold opacity-90">
						<AnimatedNumber
							value={savingsPercent}
							format={(n) => `${Math.round(n)}%`}
							duration={1000}
						/>
						smaller than original
					</p>
				</div>

				<!-- Impact metrics -->
				<div class="mb-6 space-y-3">
					<h3 class="text-surface-300 mb-3 text-sm font-semibold uppercase tracking-wide">
						Real-World Impact
					</h3>

					<div class="bg-surface-800/50 flex items-center gap-4 rounded-xl p-4">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
							<Gauge class="h-5 w-5 text-blue-400" />
						</div>
						<div class="flex-1">
							<p class="text-surface-100 font-semibold">
								~{secondsFaster}s faster page loads
							</p>
							<p class="text-surface-500 text-xs">On average 3G connection</p>
						</div>
					</div>

					<div class="bg-surface-800/50 flex items-center gap-4 rounded-xl p-4">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
							<TrendingUp class="h-5 w-5 text-green-400" />
						</div>
						<div class="flex-1">
							<p class="text-surface-100 font-semibold">Better SEO ranking</p>
							<p class="text-surface-500 text-xs">Google loves fast sites</p>
						</div>
					</div>

					<div class="bg-surface-800/50 flex items-center gap-4 rounded-xl p-4">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
							<Globe class="h-5 w-5 text-purple-400" />
						</div>
						<div class="flex-1">
							<p class="text-surface-100 font-semibold">~{co2Saved}g CO2 saved</p>
							<p class="text-surface-500 text-xs">Per 1000 page views</p>
						</div>
					</div>
				</div>

				<!-- Actions -->
				<div class="grid grid-cols-2 gap-3">
					<button
						onclick={ondownload}
						class="from-accent-start to-accent-end shadow-accent-start/30 hover:shadow-accent-start/50 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105"
					>
						<Zap class="h-5 w-5" />
						Download All
					</button>

					<button
						onclick={handleShare}
						class="border-surface-600 bg-surface-800/50 hover:bg-surface-700/50 flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 font-semibold transition-all hover:scale-105"
					>
						<Share2 class="h-5 w-5" />
						Share
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
