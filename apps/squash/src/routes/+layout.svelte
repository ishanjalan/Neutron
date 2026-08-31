<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount, tick } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { countPageview } from '@neutron/utils/analytics';
	import { detectLocale, type Locale } from '@neutron/utils/seo';
	import { squashMeta } from '$lib/seo';

	let { children } = $props();

	const siteUrl = 'https://ishanjalan.github.io/Squash';
	const ogImage = `${siteUrl}/og-image.svg`;

	let locale = $state<Locale>('en');
	let meta = $derived(squashMeta[locale]);

	// GoatCounter counts nothing on its own (no_onload in app.html) — send one
	// pageview per navigation, once this route's <svelte:head> has applied its
	// <title>. This also covers client-side navigations, which fire no page load.
	afterNavigate(async () => {
		await tick();
		countPageview({
			path: location.pathname + location.search,
			title: document.title,
		});
	});

	onMount(() => {
		locale = detectLocale();
		document.documentElement.lang = locale;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content={siteUrl} />
	<meta property="og:title" content={meta.title} />
	<meta property="og:description" content={meta.description} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:site_name" content="Squash" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={meta.title} />
	<meta name="twitter:description" content={meta.description} />
	<meta name="twitter:image" content={ogImage} />

	<!-- SEO -->
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href={siteUrl} />
	<link rel="alternate" hreflang="x-default" href={siteUrl} />
	<link
		rel="sitemap"
		type="application/xml"
		href="https://ishanjalan.github.io/Squash/sitemap.xml"
	/>

	<!-- JSON-LD -->
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "SoftwareApplication",
			"name": "Squash - Video Compressor",
			"operatingSystem": "Web",
			"applicationCategory": "UtilityApplication",
			"offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
			"description": "Compress MP4, WebM, and MOV videos instantly in your browser using WebCodecs. No uploads, hardware-accelerated and 100% private.",
			"url": "https://ishanjalan.github.io/Squash",
			"author": {
				"@type": "Person",
				"name": "Ishan Jalan",
				"url": "https://github.com/ishanjalan"
			}
		}
	</script>
</svelte:head>

{@render children()}
