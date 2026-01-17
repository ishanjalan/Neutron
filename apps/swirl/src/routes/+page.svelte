<script lang="ts">
	import { base } from '$app/paths';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { 
		Film, 
		Gauge, 
		Maximize2, 
		Zap, 
		Layers, 
		Shield, 
		Sparkles,
		ArrowRight,
		Rewind,
		Images,
		Merge,
		Crop,
		Type
	} from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';

	const tools = [
		{
			id: 'video-to-gif',
			href: '/video-to-gif',
			title: 'Video to GIF',
			description: 'Turn any video clip into a shareable GIF',
			icon: Film,
			gradient: 'from-pink-500 to-rose-500',
			popular: true
		},
		{
			id: 'make',
			href: '/make',
			title: 'GIF Maker',
			description: 'Create GIFs from images with drag-and-drop',
			icon: Images,
			gradient: 'from-green-500 to-emerald-500',
			popular: true
		},
		{
			id: 'optimize',
			href: '/optimize',
			title: 'Optimize',
			description: 'Shrink GIFs for Discord, Slack, Twitter — one click',
			icon: Gauge,
			gradient: 'from-violet-500 to-purple-500',
			popular: true
		},
		{
			id: 'text',
			href: '/text',
			title: 'Add Text',
			description: 'Add meme-style captions and text overlays',
			icon: Type,
			gradient: 'from-yellow-500 to-amber-500',
			popular: true
		},
		{
			id: 'combine',
			href: '/combine',
			title: 'Combine GIFs',
			description: 'Merge multiple GIFs into one seamless animation',
			icon: Merge,
			gradient: 'from-cyan-500 to-blue-500',
			popular: false
		},
		{
			id: 'resize',
			href: '/resize',
			title: 'Resize',
			description: 'Resize for emojis, stickers, or any platform',
			icon: Maximize2,
			gradient: 'from-blue-500 to-cyan-500',
			popular: false
		},
		{
			id: 'crop',
			href: '/crop',
			title: 'Crop',
			description: 'Crop GIFs visually with drag handles',
			icon: Crop,
			gradient: 'from-amber-500 to-orange-500',
			popular: false
		},
		{
			id: 'reverse',
			href: '/reverse',
			title: 'Reverse',
			description: 'Play GIFs backwards or create boomerang loops',
			icon: Rewind,
			gradient: 'from-rose-500 to-pink-500',
			popular: true
		},
		{
			id: 'speed',
			href: '/speed',
			title: 'Speed',
			description: 'Speed up or slow down GIF playback',
			icon: Gauge,
			gradient: 'from-orange-500 to-red-500',
			popular: false
		},
		{
			id: 'split',
			href: '/split',
			title: 'Split Frames',
			description: 'Export every frame as PNG',
			icon: Layers,
			gradient: 'from-emerald-500 to-teal-500',
			popular: false
		}
	];

	const features = [
		{
			icon: Zap,
			title: 'Lightning Fast',
			description: 'Hardware-accelerated encoding — no waiting around'
		},
		{
			icon: Shield,
			title: '100% Private',
			description: 'Your files never leave your computer'
		},
		{
			icon: Sparkles,
			title: 'All-in-One',
			description: 'Everything you need in one place'
		}
	];

	const presets = [
		{ id: 'discord', name: 'Discord', size: '10MB', icon: '💬' },
		{ id: 'twitter', name: 'Twitter', size: '15MB', icon: '𝕏' },
		{ id: 'slack', name: 'Slack', size: '1MB', icon: '💼' },
		{ id: 'whatsapp', name: 'WhatsApp', size: '16MB', icon: '📱' }
	];
</script>

<div class="flex min-h-screen flex-col">
	<Header />

	<!-- Background decoration -->
	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-accent-start/10 to-accent-end/10 blur-3xl"
		></div>
		<div
			class="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-accent-end/10 to-accent-start/10 blur-3xl"
		></div>
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-12">
		<div class="mx-auto max-w-6xl">
			<!-- Hero Section -->
			<div class="text-center mb-16" in:fade={{ duration: 300 }}>
				<div
					class="mb-4 inline-flex items-center gap-2 rounded-full bg-accent-start/10 px-4 py-1.5 text-sm font-medium text-accent-start"
				>
					<Sparkles class="h-4 w-4" />
					100% Free • Works Offline • No Account Needed
				</div>
				
				<h1 class="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
					<span class="text-surface-100">The</span> <span class="gradient-text">GIF toolkit</span>
					<br class="hidden sm:block" />
					<span class="text-surface-100">you actually want</span>
				</h1>
				
				<p class="mx-auto max-w-2xl text-lg text-surface-500 leading-relaxed">
					Create, convert, and optimize GIFs with professional tools —
					all running locally in your browser. <span class="font-semibold text-surface-300">Fast. Private. Free.</span>
				</p>

				<!-- Smart presets pill -->
				<div class="mt-6 flex flex-wrap items-center justify-center gap-2">
					<span class="text-sm text-surface-500">One-click presets for:</span>
					{#each presets as preset}
						<a 
							href="{base}/optimize?preset={preset.id}"
							class="inline-flex items-center gap-1.5 rounded-full bg-surface-800 px-3 py-1 text-sm text-surface-300 hover:bg-surface-700 hover:text-surface-100 transition-colors"
						>
							<span>{preset.icon}</span>
							<span>{preset.name}</span>
							<span class="text-surface-500">{preset.size}</span>
						</a>
					{/each}
				</div>
			</div>

			<!-- Tool Cards -->
			<div class="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 mb-16">
				{#each tools as tool, i}
					<a
						href="{base}{tool.href}"
						class="group relative glass rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-accent-start/10"
						in:fly={{ y: 30, delay: 100 * i, duration: 400 }}
					>
						<!-- Popular badge -->
						{#if tool.popular}
							<div class="absolute -top-2 -right-2 rounded-full bg-gradient-to-r from-accent-start to-accent-end px-2.5 py-0.5 text-xs font-semibold text-white shadow-lg">
								Popular
							</div>
						{/if}

						<div class="flex items-start gap-4">
							<div
								class="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br {tool.gradient} shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
							>
								<tool.icon class="h-7 w-7 text-white" strokeWidth={2} />
							</div>
							
							<div class="flex-1 min-w-0">
								<h3 class="text-lg font-semibold text-surface-100 group-hover:text-white transition-colors flex items-center gap-2">
									{tool.title}
									<ArrowRight class="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent-start" />
								</h3>
								<p class="mt-1 text-sm text-surface-500 leading-relaxed">
									{tool.description}
								</p>
							</div>
						</div>
					</a>
				{/each}
			</div>

			<!-- Features Section -->
			<div class="grid gap-6 sm:grid-cols-3 mb-16">
				{#each features as feature, i}
					<div
						class="text-center"
						in:fly={{ y: 20, delay: 400 + 100 * i, duration: 300 }}
					>
						<div
							class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-start/20 to-accent-end/20 text-accent-start"
						>
							<feature.icon class="h-6 w-6" />
						</div>
						<h3 class="text-base font-semibold text-surface-100">
							{feature.title}
						</h3>
						<p class="mt-1 text-sm text-surface-500">{feature.description}</p>
					</div>
				{/each}
			</div>

			<!-- Stats Bar -->
			<div class="glass rounded-2xl p-6" in:fade={{ delay: 600, duration: 300 }}>
				<div class="grid grid-cols-3 gap-6 text-center">
					<div>
						<p class="text-2xl font-bold text-surface-100">10</p>
						<p class="text-sm text-surface-500">Tools</p>
					</div>
					<div>
						<p class="text-2xl font-bold text-surface-100">Unlimited</p>
						<p class="text-sm text-surface-500">Files</p>
					</div>
					<div>
						<p class="text-2xl font-bold text-surface-100">Zero</p>
						<p class="text-sm text-surface-500">Data Collection</p>
					</div>
				</div>
			</div>
		</div>
	</main>

	<Footer />
</div>
