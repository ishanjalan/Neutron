<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Toast } from '@neutron/ui';

	let { children } = $props();

	const siteUrl = 'https://ishanjalan.github.io/Squish';
	const ogImage = `${siteUrl}/og-image.svg`;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Squish — Compress HEIC, JPEG, PNG, WebP & More</title>
	<meta
		name="description"
		content="Compress and convert HEIC, JPEG, PNG, WebP, AVIF, JPEG XL, SVG and GIF images in your browser. 100% private — files never leave your device."
	/>

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content={siteUrl} />
	<meta property="og:title" content="Squish — Compress HEIC, JPEG, PNG, WebP & More" />
	<meta
		property="og:description"
		content="Compress and convert HEIC, JPEG, PNG, WebP, AVIF, JPEG XL, SVG and GIF images in your browser. 100% private — files never leave your device."
	/>
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:site_name" content="Squish" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Squish — Compress HEIC, JPEG, PNG, WebP & More" />
	<meta
		name="twitter:description"
		content="Compress and convert HEIC, JPEG, PNG, WebP, AVIF, JPEG XL, SVG and GIF images in your browser. 100% private — files never leave your device."
	/>
	<meta name="twitter:image" content={ogImage} />

	<!-- Additional SEO -->
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href={siteUrl} />

	<!-- JSON-LD -->
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "SoftwareApplication",
			"name": "Squish - Image Optimizer",
			"operatingSystem": "Web",
			"applicationCategory": "UtilityApplication",
			"offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
			"description": "Compress and convert HEIC, JPEG, PNG, WebP, AVIF, JPEG XL, SVG and GIF images in your browser. 100% private.",
			"url": "https://ishanjalan.github.io/ImageOptimser/",
			"author": {
				"@type": "Person",
				"name": "Ishan Jalan",
				"url": "https://github.com/ishanjalan"
			}
		}
	</script>
</svelte:head>

{@render children()}

<!-- Global Toast Container -->
<Toast />
