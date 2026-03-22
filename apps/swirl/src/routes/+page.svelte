<script lang="ts">
	import { resolve } from '$app/paths';
	import Header from '$lib/components/Header.svelte';
	import { Footer } from '@neutron/ui';
	import { Film, Gauge, Maximize2, ArrowRight, Rewind, Images, Crop, Type } from 'lucide-svelte';
	import { fade } from 'svelte/transition';

	const tools = [
		{
			id: 'video-to-gif',
			href: '/video-to-gif',
			title: 'Video to GIF',
			description: 'Turn any video clip into a shareable GIF',
			icon: Film,
			gradient: 'from-pink-500 to-rose-500',
			popular: true,
		},
		{
			id: 'make',
			href: '/make',
			title: 'GIF Maker',
			description: 'Create GIFs from images with drag-and-drop',
			icon: Images,
			gradient: 'from-green-500 to-emerald-500',
			popular: true,
		},
		{
			id: 'optimize',
			href: '/optimize',
			title: 'Optimize',
			description: 'Shrink GIFs for Discord, Slack, Twitter — one click',
			icon: Gauge,
			gradient: 'from-violet-500 to-purple-500',
			popular: true,
		},
		{
			id: 'text',
			href: '/text',
			title: 'Add Text',
			description: 'Add meme-style captions and text overlays',
			icon: Type,
			gradient: 'from-yellow-500 to-amber-500',
			popular: true,
		},
		{
			id: 'resize',
			href: '/resize',
			title: 'Resize',
			description: 'Resize for emojis, stickers, or any platform',
			icon: Maximize2,
			gradient: 'from-blue-500 to-cyan-500',
			popular: false,
		},
		{
			id: 'crop',
			href: '/crop',
			title: 'Crop',
			description: 'Crop GIFs visually with drag handles',
			icon: Crop,
			gradient: 'from-amber-500 to-orange-500',
			popular: false,
		},
		{
			id: 'reverse',
			href: '/reverse',
			title: 'Reverse',
			description: 'Play GIFs backwards or create boomerang loops',
			icon: Rewind,
			gradient: 'from-rose-500 to-pink-500',
			popular: true,
		},
		{
			id: 'speed',
			href: '/speed',
			title: 'Speed',
			description: 'Speed up or slow down GIF playback',
			icon: Gauge,
			gradient: 'from-orange-500 to-red-500',
			popular: false,
		},
	];

	const presets = [
		{ id: 'discord', name: 'Discord', size: '10MB', icon: '💬' },
		{ id: 'twitter', name: 'Twitter', size: '15MB', icon: '𝕏' },
		{ id: 'slack', name: 'Slack', size: '1MB', icon: '💼' },
		{ id: 'whatsapp', name: 'WhatsApp', size: '16MB', icon: '📱' },
	];
</script>

<div class="flex min-h-screen flex-col">
	<Header />

	<!-- Background decoration -->
	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div
			class="from-accent-start/6 to-accent-end/6 absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br blur-3xl"
		></div>
		<div
			class="from-accent-end/6 to-accent-start/6 absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr blur-3xl"
		></div>
	</div>

	<main class="flex-1 px-4 pt-28 pb-12 sm:px-6 sm:pt-32 lg:px-8">
		<div class="mx-auto max-w-6xl">
			<!-- Hero Section -->
			<div class="mb-12 text-center" in:fade={{ duration: 300 }}>
				<h1 class="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
					<span class="gradient-text">GIF tools.</span>
					<span class="text-surface-100"> No server required.</span>
				</h1>

				<p class="text-surface-500 mx-auto max-w-2xl text-lg leading-relaxed">
					Create, convert, and optimize GIFs with professional tools — all running locally in your
					browser. Fast. Private. Free.
				</p>

				<!-- One-click presets -->
				<div class="mt-6 flex flex-wrap items-center justify-center gap-2">
					<span class="text-surface-500 text-sm">One-click presets for:</span>
					{#each presets as preset (preset.id)}
						<a
							href={resolve(`/optimize?preset=${preset.id}`)}
							class="bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-surface-100 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-colors"
						>
							<span>{preset.icon}</span>
							<span>{preset.name}</span>
							<span class="text-surface-500">{preset.size}</span>
						</a>
					{/each}
				</div>
			</div>

			<!-- Tool Cards -->
			<div class="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each tools as tool (tool.id)}
					<a
						href={resolve(tool.href as any)}
						class="surface-card group hover:border-surface-600 relative p-5 transition-all duration-200 hover:scale-[1.005]"
						in:fade={{ duration: 150 }}
					>
						<!-- Popular badge -->
						{#if tool.popular}
							<div
								class="from-accent-start to-accent-end absolute -top-2 -right-2 rounded-full bg-gradient-to-r px-2.5 py-0.5 text-xs font-semibold text-white shadow-lg"
							>
								Popular
							</div>
						{/if}

						<div class="flex items-start gap-4">
							<div
								class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br {tool.gradient} shadow-lg transition-transform duration-200 group-hover:scale-110"
							>
								<tool.icon class="h-6 w-6 text-white" strokeWidth={2} />
							</div>

							<div class="min-w-0 flex-1">
								<h3
									class="text-surface-100 group-hover:text-surface-50 flex items-center gap-2 text-base font-semibold transition-colors"
								>
									{tool.title}
									<ArrowRight
										class="text-accent-start h-4 w-4 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
									/>
								</h3>
								<p class="text-surface-500 mt-0.5 text-sm leading-relaxed">
									{tool.description}
								</p>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	</main>

	<Footer currentApp="swirl" />
</div>
