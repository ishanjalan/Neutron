<script lang="ts">
	import '../app.css';
	import { base } from '$app/paths';
	import { Toast } from '@neutron/ui';

	let { children } = $props();

	const siteUrl = 'https://ishanjalan.github.io/Swirl';
	const ogImage = `${siteUrl}/og-image.svg`;
</script>

<svelte:head>
	<link rel="icon" href="{base}/favicon.svg" type="image/svg+xml" />
	<title>Swirl - Modern GIF Tools</title>
	<meta name="description" content="Convert videos to GIF, optimize, resize, reverse, crop, and split animations. 10 browser-based GIF tools. 100% private — files never leave your device." />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content={siteUrl} />
	<meta property="og:title" content="Swirl - Modern GIF Tools" />
	<meta property="og:description" content="Convert videos to GIF, optimize, resize, reverse, crop, and split animations. 10 browser-based GIF tools. 100% private — files never leave your device." />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:site_name" content="Swirl" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Swirl - Modern GIF Tools" />
	<meta name="twitter:description" content="Convert videos to GIF, optimize, resize, reverse, crop, and split animations. 10 browser-based GIF tools. 100% private — files never leave your device." />
	<meta name="twitter:image" content={ogImage} />

	<!-- SEO -->
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href={siteUrl} />

	<!-- JSON-LD -->
	<script type="application/ld+json">{JSON.stringify({
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		"name": "Swirl - GIF Tools",
		"operatingSystem": "Web",
		"applicationCategory": "UtilityApplication",
		"offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
		"description": "Convert videos to GIF, optimize, resize, reverse, crop, and split animations. 10 browser-based GIF tools. 100% private.",
		"url": "https://ishanjalan.github.io/Swirl",
		"author": { "@type": "Person", "name": "Ishan Jalan", "url": "https://github.com/ishanjalan" }
	})}</script>
</svelte:head>

{@render children()}
<Toast />
