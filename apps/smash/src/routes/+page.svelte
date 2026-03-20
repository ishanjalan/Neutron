<script lang="ts">
	import { resolve } from '$app/paths';
	import Header from '$lib/components/Header.svelte';
	import { Footer } from '@neutron/ui';
	import {
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
	import { fade } from 'svelte/transition';

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
			description: 'Add AES-128 password encryption',
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
					<span class="gradient-text">PDF tools.</span>
					<span class="text-surface-100"> Zero uploads.</span>
				</h1>

				<p class="text-surface-500 mx-auto max-w-2xl text-lg leading-relaxed">
					Compress, merge, split, protect, and convert PDFs — all running locally in your browser.
					Fast. Private. Free.
				</p>
			</div>

			<!-- Tool Cards -->
			<div class="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each tools as tool (tool.href)}
					<a
						href={resolve(tool.href)}
						class="surface-card group hover:border-surface-600 relative p-5 text-left transition-all duration-200 hover:scale-[1.005]"
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
									class="text-surface-100 flex items-center gap-2 text-base font-semibold transition-colors group-hover:text-white"
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

	<Footer currentApp="smash" />
</div>
