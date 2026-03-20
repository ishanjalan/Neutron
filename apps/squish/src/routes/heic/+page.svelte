<script lang="ts">
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import { images } from '$lib/stores/images.svelte';
	import { Footer } from '@neutron/ui';

	const siteUrl = 'https://ishanjalan.github.io/ImageOptimser';

	// Once files are dropped and added to the store, navigate to the main tool
	$effect(() => {
		if (images.items.length > 0) {
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			goto('/');
		}
	});
</script>

<svelte:head>
	<title>HEIC to JPG Converter — Free, Private, No Upload | Squish</title>
	<meta
		name="description"
		content="Convert iPhone HEIC and HEIF photos to JPG, PNG, WebP, or AVIF instantly in your browser. No account, no upload, no file limits. 100% private."
	/>
	<meta property="og:title" content="HEIC to JPG Converter — Squish" />
	<meta
		property="og:description"
		content="Convert iPhone HEIC/HEIF photos to JPG, PNG, WebP, or AVIF in your browser. 100% private — files never leave your device."
	/>
	<meta property="og:url" content="{siteUrl}/heic" />
	<link rel="canonical" href="{siteUrl}/heic" />
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />

	<main class="flex-1 px-4 pt-24 pb-8 sm:px-6 sm:pt-28 sm:pb-12 lg:px-8">
		<div class="mx-auto max-w-4xl">
			<div class="mb-10 text-center">
				<h1 class="gradient-text mb-3 text-3xl font-bold sm:text-4xl">
					Convert HEIC to JPG, PNG, or WebP
				</h1>
				<p class="text-surface-400 mx-auto max-w-xl text-base leading-relaxed sm:text-lg">
					Drop your iPhone photos below. HEIC and HEIF files are converted in your browser — nothing
					is uploaded, nothing is stored.
				</p>
				<div class="mt-4 flex flex-wrap justify-center gap-2">
					{#each ['100% Private', 'No Upload', 'No Account', 'Batch Convert', 'Free Forever'] as pill (pill)}
						<span
							class="bg-surface-800 text-surface-400 border-surface-700 rounded-full border px-3 py-1 text-xs font-medium"
							>{pill}</span
						>
					{/each}
				</div>
			</div>

			<DropZone />

			<div class="mt-12 grid gap-6 sm:grid-cols-3">
				<div class="glass rounded-2xl p-5">
					<div class="text-accent-start mb-2 text-lg font-semibold">HEIC & HEIF</div>
					<p class="text-surface-400 text-sm">
						Supports all Apple HEIC and HEIF files from iPhone, iPad, and Mac cameras.
					</p>
				</div>
				<div class="glass rounded-2xl p-5">
					<div class="text-accent-start mb-2 text-lg font-semibold">4 Output Formats</div>
					<p class="text-surface-400 text-sm">
						Convert to JPG for universal compatibility, PNG for lossless quality, WebP or AVIF for
						modern compression.
					</p>
				</div>
				<div class="glass rounded-2xl p-5">
					<div class="text-accent-start mb-2 text-lg font-semibold">Also Converts</div>
					<p class="text-surface-400 text-sm">
						Squish also handles JPEG, PNG, WebP, AVIF, JPEG XL, SVG, and GIF — all in one tool.
					</p>
				</div>
			</div>
		</div>
	</main>

	<Footer currentApp="squish" />
</div>
