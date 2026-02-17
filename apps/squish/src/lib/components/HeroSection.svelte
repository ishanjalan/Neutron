<script lang="ts">
	import { Zap, Shield, Gauge, Globe, Download, ArrowDown } from 'lucide-svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { spring } from 'svelte/motion';
	import { onMount } from 'svelte';

	let {
		hasImages = false,
	}: {
		hasImages?: boolean;
	} = $props();

	// Animated counter
	let mounted = $state(false);
	let counter = spring(0, { stiffness: 0.1, damping: 0.3 });

	const benefits = [
		{
			icon: Zap,
			title: 'Lightning Fast',
			description: 'Process images in milliseconds with WASM',
			gradient: 'from-yellow-500 to-orange-500',
		},
		{
			icon: Shield,
			title: '100% Private',
			description: 'Everything happens in your browser',
			gradient: 'from-green-500 to-emerald-500',
		},
		{
			icon: Gauge,
			title: 'Up to 90% Smaller',
			description: 'Best-in-class compression algorithms',
			gradient: 'from-blue-500 to-cyan-500',
		},
		{
			icon: Globe,
			title: 'Works Offline',
			description: 'Install as PWA for offline use',
			gradient: 'from-purple-500 to-pink-500',
		},
	];

	onMount(() => {
		mounted = true;
		counter.set(85);
	});
</script>

{#if !hasImages}
	<div class="relative overflow-hidden py-12 sm:py-16" transition:fly={{ y: -20, duration: 300 }}>
		<!-- Background gradient orbs -->
		<div class="pointer-events-none absolute inset-0">
			<div
				class="from-accent-start/20 absolute -left-1/4 top-0 h-96 w-96 rounded-full bg-gradient-to-br to-transparent blur-3xl"
			></div>
			<div
				class="to-accent-end/20 absolute -right-1/4 top-20 h-96 w-96 rounded-full bg-gradient-to-bl from-transparent blur-3xl"
			></div>
		</div>

		<div class="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
			<!-- Main headline -->
			<div class="mb-6">
				<div class="bg-accent-start/10 mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2">
					<Zap class="text-accent-start h-4 w-4" />
					<span class="text-accent-start text-sm font-semibold">Free · Private · Fast</span>
				</div>
				<h1
					class="gradient-text mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
					in:fly={{ y: 20, duration: 400, delay: 100 }}
				>
					Compress Images<br />Without Compromise
				</h1>
				<p
					class="text-surface-400 mx-auto max-w-2xl text-lg sm:text-xl"
					in:fly={{ y: 20, duration: 400, delay: 200 }}
				>
					Reduce image file sizes by up to <span class="text-accent-start font-bold">90%</span>
					while maintaining visual quality. All processing happens in your browser—no uploads, no tracking.
				</p>
			</div>

			<!-- Stats showcase -->
			<div
				class="mb-12 flex flex-wrap items-center justify-center gap-8"
				in:fly={{ y: 20, duration: 400, delay: 300 }}
			>
				<div class="text-center">
					<div class="gradient-text mb-1 text-4xl font-bold tabular-nums sm:text-5xl">
						{#if mounted}
							{Math.round($counter)}%
						{:else}
							0%
						{/if}
					</div>
					<div class="text-surface-500 text-sm font-medium">Avg. Size Reduction</div>
				</div>
				<div class="text-surface-700 hidden h-12 w-px bg-current sm:block"></div>
				<div class="text-center">
					<div class="text-surface-100 mb-1 text-4xl font-bold tabular-nums sm:text-5xl">
						100<span class="text-2xl">%</span>
					</div>
					<div class="text-surface-500 text-sm font-medium">Private & Secure</div>
				</div>
				<div class="text-surface-700 hidden h-12 w-px bg-current sm:block"></div>
				<div class="text-center">
					<div class="text-surface-100 mb-1 text-4xl font-bold tabular-nums sm:text-5xl">
						<Download class="inline h-8 w-8 sm:h-10 sm:w-10" />
					</div>
					<div class="text-surface-500 text-sm font-medium">Works Offline</div>
				</div>
			</div>

			<!-- Scroll indicator -->
			<div class="flex justify-center" in:fade={{ duration: 400, delay: 500 }}>
				<div class="flex flex-col items-center gap-2">
					<span class="text-surface-500 text-sm font-medium">Start compressing below</span>
					<ArrowDown class="text-accent-start h-5 w-5 animate-bounce" />
				</div>
			</div>
		</div>

		<!-- Benefits grid - below the fold -->
		<div
			class="mx-auto mt-16 max-w-6xl px-4 sm:px-6 lg:px-8"
			in:fly={{ y: 20, duration: 400, delay: 400 }}
		>
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{#each benefits as benefit, i}
					<div
						class="glass group relative overflow-hidden rounded-2xl p-6 transition-all hover:scale-105 hover:shadow-xl"
						in:scale={{ duration: 200, delay: 500 + i * 100 }}
					>
						<div
							class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br {benefit.gradient} shadow-lg"
						>
							<svelte:component this={benefit.icon} class="h-6 w-6 text-white" />
						</div>
						<h3 class="text-surface-100 mb-2 text-lg font-semibold">{benefit.title}</h3>
						<p class="text-surface-400 text-sm">{benefit.description}</p>

						<!-- Subtle gradient overlay on hover -->
						<div
							class="pointer-events-none absolute inset-0 bg-gradient-to-br {benefit.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-5"
						></div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
