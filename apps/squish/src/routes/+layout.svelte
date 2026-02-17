<script lang="ts">
	import '../app-enterprise.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Toast } from '@neutron/ui';
	import { base } from '$app/paths';

	let { children } = $props();

	const siteUrl = 'https://ishanjalan.github.io/ImageOptimser';
	const ogImage = `${siteUrl}/og-image.svg`;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Squish - Enterprise Image Optimization Infrastructure</title>

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content={siteUrl} />
	<meta property="og:title" content="Squish - Enterprise Image Optimization Infrastructure" />
	<meta
		property="og:description"
		content="Mission-critical image compression for organizations. Zero-latency processing, 100% private, industrial-grade reliability. WASM-powered batch optimization."
	/>
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:site_name" content="Squish Enterprise" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Squish - Free Image Optimizer" />
	<meta
		name="twitter:description"
		content="Compress JPEG, PNG, WebP, AVIF, and SVG files instantly in your browser. 100% private - your images never leave your device."
	/>
	<meta name="twitter:image" content={ogImage} />

	<!-- Additional SEO -->
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href={siteUrl} />
</svelte:head>

{@render children()}

<!-- Global Toast Container -->
<Toast />
