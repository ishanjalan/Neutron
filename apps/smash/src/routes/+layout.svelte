<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { terminateGhostscript, setGhostscriptErrorHandler } from '$lib/utils/ghostscript';
	import { Toast, toast } from '@neutron/ui';
	import { onMount } from 'svelte';
	import { detectLocale, type Locale } from '@neutron/utils/seo';
	import { smashLayoutMeta } from '$lib/seo';

	let { children } = $props();

	let locale = $state<Locale>('en');
	let meta = $derived(smashLayoutMeta[locale]);

	onMount(() => {
		locale = detectLocale();
		document.documentElement.lang = locale;
		setGhostscriptErrorHandler((error) => {
			toast.error(`PDF processing engine crashed: ${error.message}. Please reload the page.`);
		});
	});

	function handlePageHide() {
		terminateGhostscript();
	}
</script>

<svelte:window onpagehide={handlePageHide} />
<Toast />

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://ishanjalan.github.io/Smash" />
	<meta property="og:title" content={meta.title} />
	<meta property="og:description" content={meta.description} />
	<meta property="og:image" content="https://ishanjalan.github.io/Smash/og-image.svg" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:site_name" content="Smash" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={meta.title} />
	<meta name="twitter:description" content={meta.description} />
	<meta name="twitter:image" content="https://ishanjalan.github.io/Smash/og-image.svg" />

	<!-- SEO -->
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href="https://ishanjalan.github.io/Smash" />
	<link rel="alternate" hreflang="x-default" href="https://ishanjalan.github.io/Smash" />

	<!-- JSON-LD -->
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "SoftwareApplication",
			"name": "Smash - PDF Tools",
			"operatingSystem": "Web",
			"applicationCategory": "UtilityApplication",
			"offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
			"description": "Free online PDF tools — compress, merge, split, protect, OCR, and more. All 13 tools run instantly in your browser. 100% private.",
			"url": "https://ishanjalan.github.io/Smash",
			"author": {
				"@type": "Person",
				"name": "Ishan Jalan",
				"url": "https://github.com/ishanjalan"
			}
		}
	</script>
</svelte:head>

{@render children()}
