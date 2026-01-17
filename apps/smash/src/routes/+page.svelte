<script lang="ts">
	import { base } from '$app/paths';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import {
		Shield,
		Zap,
		Sparkles,
		Minimize2,
		Layers,
		Scissors,
		RotateCw,
		Trash2,
		ArrowUpDown,
		Image,
		FileText,
		Hash,
		Stamp,
		Lock,
		Unlock,
		ArrowRight,
		FileSearch,
	} from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';

	// Tool cards with routes and metadata
	const tools = [
		{
			href: '/compress',
			title: 'Compress PDF',
			description: 'Reduce file size while keeping text sharp',
			icon: Minimize2,
			gradient: 'from-violet-500 to-purple-500',
			popular: true,
		},
		{
			href: '/merge',
			title: 'Merge PDFs',
			description: 'Combine multiple PDFs into one document',
			icon: Layers,
			gradient: 'from-blue-500 to-cyan-500',
			popular: true,
		},
		{
			href: '/split',
			title: 'Split PDF',
			description: 'Extract pages or split into multiple files',
			icon: Scissors,
			gradient: 'from-pink-500 to-rose-500',
			popular: true,
		},
		{
			href: '/ocr',
			title: 'OCR',
			description: 'Extract searchable text from scanned PDFs',
			icon: FileSearch,
			gradient: 'from-sky-500 to-cyan-500',
			popular: true,
		},
		{
			href: '/protect',
			title: 'Protect PDF',
			description: 'Add AES-256 password encryption',
			icon: Lock,
			gradient: 'from-green-500 to-emerald-500',
			popular: false,
		},
		{
			href: '/unlock',
			title: 'Unlock PDF',
			description: 'Remove password protection',
			icon: Unlock,
			gradient: 'from-amber-500 to-orange-500',
			popular: false,
		},
		{
			href: '/rotate',
			title: 'Rotate Pages',
			description: 'Rotate PDF pages 90°, 180°, or 270°',
			icon: RotateCw,
			gradient: 'from-cyan-500 to-blue-500',
			popular: false,
		},
		{
			href: '/delete',
			title: 'Delete Pages',
			description: 'Remove unwanted pages from your PDF',
			icon: Trash2,
			gradient: 'from-red-500 to-pink-500',
			popular: false,
		},
		{
			href: '/reorder',
			title: 'Reorder Pages',
			description: 'Drag and drop to rearrange pages',
			icon: ArrowUpDown,
			gradient: 'from-orange-500 to-red-500',
			popular: false,
		},
		{
			href: '/to-images',
			title: 'PDF to Images',
			description: 'Convert pages to PNG, JPG, or WebP',
			icon: Image,
			gradient: 'from-teal-500 to-green-500',
			popular: false,
		},
		{
			href: '/from-images',
			title: 'Images to PDF',
			description: 'Create a PDF from your images',
			icon: FileText,
			gradient: 'from-indigo-500 to-violet-500',
			popular: false,
		},
		{
			href: '/page-numbers',
			title: 'Page Numbers',
			description: 'Add page numbers to your document',
			icon: Hash,
			gradient: 'from-slate-500 to-gray-500',
			popular: false,
		},
		{
			href: '/watermark',
			title: 'Watermark',
			description: 'Add text watermark to all pages',
			icon: Stamp,
			gradient: 'from-fuchsia-500 to-purple-500',
			popular: false,
		},
	];

	const features = [
		{
			icon: Zap,
			title: 'Lightning Fast',
			description: 'Instant processing with no uploads or wait times',
		},
		{
			icon: Shield,
			title: '100% Private',
			description: 'Your files never leave your computer',
		},
		{
			icon: Sparkles,
			title: 'All-in-One',
			description: 'Everything you need in one place',
		},
	];
</script>

<svelte:head>
	<title>Smash - PDF Tools</title>
	<meta
		name="description"
		content="Free browser-based PDF tools. Compress, merge, split, protect, and convert PDFs - 100% private, works offline."
	/>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />

	<!-- Background decoration -->
	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div
			class="from-accent-start/10 to-accent-end/10 absolute -right-1/4 -top-1/2 h-[800px] w-[800px] rounded-full bg-gradient-to-br blur-3xl"
		></div>
		<div
			class="from-accent-end/10 to-accent-start/10 absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr blur-3xl"
		></div>
	</div>

	<main class="flex-1 px-4 pb-12 pt-28 sm:px-6 sm:pt-32 lg:px-8">
		<div class="mx-auto max-w-6xl">
			<!-- Hero Section -->
			<div class="mb-16 text-center" in:fade={{ duration: 300 }}>
				<div
					class="bg-accent-start/10 text-accent-start mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
				>
					<Sparkles class="h-4 w-4" />
					100% Free • Works Offline • No Account Needed
				</div>

				<h1 class="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
					<span class="text-surface-100">The</span> <span class="gradient-text">PDF toolkit</span>
					<br class="hidden sm:block" />
					<span class="text-surface-100">you actually want</span>
				</h1>

				<p class="text-surface-500 mx-auto max-w-2xl text-lg leading-relaxed">
					Compress, merge, split, protect, and convert PDFs with professional tools — all running
					locally in your browser. <span class="text-surface-300 font-semibold"
						>Fast. Private. Free.</span
					>
				</p>
			</div>

			<!-- Tool Cards -->
			<div class="mb-16 grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each tools as tool, i}
					<a
						href="{base}{tool.href}"
						class="glass hover:shadow-accent-start/10 group relative rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
						in:fly={{ y: 30, delay: 50 * i, duration: 400 }}
					>
						<!-- Popular badge -->
						{#if tool.popular}
							<div
								class="from-accent-start to-accent-end absolute -right-2 -top-2 rounded-full bg-gradient-to-r px-2.5 py-0.5 text-xs font-semibold text-white shadow-lg"
							>
								Popular
							</div>
						{/if}

						<div class="flex items-start gap-4">
							<div
								class="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br {tool.gradient} shadow-lg transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110"
							>
								<tool.icon class="h-7 w-7 text-white" strokeWidth={2} />
							</div>

							<div class="min-w-0 flex-1">
								<h3
									class="text-surface-100 flex items-center gap-2 text-lg font-semibold transition-colors group-hover:text-white"
								>
									{tool.title}
									<ArrowRight
										class="text-accent-start h-4 w-4 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
									/>
								</h3>
								<p class="text-surface-500 mt-1 text-sm leading-relaxed">
									{tool.description}
								</p>
							</div>
						</div>
					</a>
				{/each}
			</div>

			<!-- Features Section -->
			<div class="mb-16 grid gap-6 sm:grid-cols-3">
				{#each features as feature, i}
					<div class="text-center" in:fly={{ y: 20, delay: 400 + 100 * i, duration: 300 }}>
						<div
							class="from-accent-start/20 to-accent-end/20 text-accent-start mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br"
						>
							<feature.icon class="h-6 w-6" />
						</div>
						<h3 class="text-surface-100 text-base font-semibold">
							{feature.title}
						</h3>
						<p class="text-surface-500 mt-1 text-sm">{feature.description}</p>
					</div>
				{/each}
			</div>

			<!-- Stats Bar -->
			<div class="glass rounded-2xl p-6" in:fade={{ delay: 600, duration: 300 }}>
				<div class="grid grid-cols-3 gap-6 text-center">
					<div>
						<p class="text-surface-100 text-2xl font-bold">13</p>
						<p class="text-surface-500 text-sm">Tools</p>
					</div>
					<div>
						<p class="text-surface-100 text-2xl font-bold">Unlimited</p>
						<p class="text-surface-500 text-sm">Files</p>
					</div>
					<div>
						<p class="text-surface-100 text-2xl font-bold">Zero</p>
						<p class="text-surface-500 text-sm">Data Collection</p>
					</div>
				</div>
			</div>
		</div>
	</main>

	<Footer />
</div>
