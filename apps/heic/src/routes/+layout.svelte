<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';

	let { children } = $props();

	const siteUrl = 'https://ishanjalan.github.io/HEICConverter';
	const ogImage = `${siteUrl}/og-image.svg`;

	onMount(() => {
		// Hide loader once app is loaded
		const loader = document.getElementById('app-loader');
		if (loader) {
			loader.classList.add('fade-out');
			setTimeout(() => loader.remove(), 300);
		}
	});
</script>

<svelte:head>
	<title>HEIC Converter — Free iPhone Photo Converter</title>
	<meta name="description" content="Convert unlimited HEIC/HEIF photos to JPG, PNG, WebP, or AVIF instantly in your browser. 100% private — files never leave your device." />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content={siteUrl} />
	<meta property="og:title" content="HEIC Converter — Free iPhone Photo Converter" />
	<meta property="og:description" content="Convert unlimited HEIC/HEIF photos to JPG, PNG, WebP, or AVIF instantly in your browser. 100% private — files never leave your device." />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:site_name" content="HEIC Converter" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="HEIC Converter — Free iPhone Photo Converter" />
	<meta name="twitter:description" content="Convert unlimited HEIC/HEIF photos to JPG, PNG, WebP, or AVIF instantly in your browser. 100% private — files never leave your device." />
	<meta name="twitter:image" content={ogImage} />

	<!-- SEO -->
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href={siteUrl} />

	<!-- JSON-LD -->
	<script type="application/ld+json">{JSON.stringify({
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		"name": "HEIC Converter",
		"operatingSystem": "Web",
		"applicationCategory": "UtilityApplication",
		"offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
		"description": "Convert unlimited HEIC/HEIF photos to JPG, PNG, WebP, or AVIF instantly in your browser. 100% private — files never leave your device.",
		"url": "https://ishanjalan.github.io/HEICConverter",
		"author": { "@type": "Person", "name": "Ishan Jalan", "url": "https://github.com/ishanjalan" }
	})}</script>
</svelte:head>

<div class="bg-surface-950 text-surface-100 relative min-h-screen">
	<!-- Background decoration -->
	<div class="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
		<div
			class="from-accent-start/10 to-accent-end/10 absolute -right-1/4 -top-1/2 h-[800px] w-[800px] rounded-full bg-gradient-to-br blur-3xl"
		></div>
		<div
			class="from-accent-end/10 to-accent-start/10 absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr blur-3xl"
		></div>
	</div>

	{@render children()}
</div>
