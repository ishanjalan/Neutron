<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	const siteUrl = 'https://ishanjalan.github.io/Squash';
	const ogImage = `${siteUrl}/og-image.svg`;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Squash - Video Compressor</title>
	<meta name="description" content="Compress MP4, WebM, and MOV videos instantly in your browser using WebCodecs. No uploads, no FFmpeg — hardware-accelerated and 100% private." />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content={siteUrl} />
	<meta property="og:title" content="Squash - Video Compressor" />
	<meta property="og:description" content="Compress MP4, WebM, and MOV videos instantly in your browser using WebCodecs. No uploads, no FFmpeg — hardware-accelerated and 100% private." />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:site_name" content="Squash" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Squash - Video Compressor" />
	<meta name="twitter:description" content="Compress MP4, WebM, and MOV videos instantly in your browser using WebCodecs. No uploads, no FFmpeg — hardware-accelerated and 100% private." />
	<meta name="twitter:image" content={ogImage} />

	<!-- SEO -->
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href={siteUrl} />

	<!-- JSON-LD -->
	<script type="application/ld+json">{JSON.stringify({
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		"name": "Squash - Video Compressor",
		"operatingSystem": "Web",
		"applicationCategory": "UtilityApplication",
		"offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
		"description": "Compress MP4, WebM, and MOV videos instantly in your browser using WebCodecs. No uploads, hardware-accelerated and 100% private.",
		"url": "https://ishanjalan.github.io/Squash",
		"author": { "@type": "Person", "name": "Ishan Jalan", "url": "https://github.com/ishanjalan" }
	})}</script>
</svelte:head>

{@render children()}
