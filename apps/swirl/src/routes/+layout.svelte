<script lang="ts">
	import '../app.css';
	import { base } from '$app/paths';
	import { Toast } from '@neutron/ui';
	import { onMount } from 'svelte';
	import { detectLocale, type Locale } from '@neutron/utils/seo';
	import { swirlMeta } from '$lib/seo';
	import { page } from '$app/state';

	let { children } = $props();

	const siteUrl = 'https://ishanjalan.github.io/Swirl';

	const routeLabels: Record<string, string> = {
		'video-to-gif': 'Video to GIF',
		make: 'GIF Maker',
		optimize: 'Optimise GIF',
		text: 'Add Text to GIF',
		resize: 'Resize GIF',
		crop: 'Crop GIF',
		reverse: 'Reverse GIF',
		speed: 'GIF Speed',
	};

	let breadcrumbHtml = $derived.by(() => {
		const segment = page.url.pathname.split('/').filter(Boolean).at(-1) ?? '';
		const label = routeLabels[segment];
		if (!label) return null;
		const schema = {
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
				{ '@type': 'ListItem', position: 2, name: label, item: `${siteUrl}/${segment}` },
			],
		};
		return '<script type="application/ld+json">' + JSON.stringify(schema) + '<' + '/script>';
	});
	const ogImage = `${siteUrl}/og-image.svg`;

	let locale = $state<Locale>('en');
	let meta = $derived(swirlMeta[locale]);

	onMount(() => {
		locale = detectLocale();
		document.documentElement.lang = locale;
	});
</script>

<svelte:head>
	<link rel="icon" href="{base}/favicon.svg" type="image/svg+xml" />
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
	<meta property="og:site_name" content="Swirl" />

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
		href="https://ishanjalan.github.io/Swirl/sitemap.xml"
	/>

	<!-- BreadcrumbList JSON-LD (tool pages only) -->
	{#if breadcrumbHtml}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html breadcrumbHtml}
	{/if}

	<!-- JSON-LD -->
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "SoftwareApplication",
			"name": "Swirl - GIF Tools",
			"operatingSystem": "Web",
			"applicationCategory": "UtilityApplication",
			"offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
			"description": "Convert videos to GIF, optimize, resize, reverse, crop, and split animations. 10 browser-based GIF tools. 100% private.",
			"url": "https://ishanjalan.github.io/Swirl",
			"author": {
				"@type": "Person",
				"name": "Ishan Jalan",
				"url": "https://github.com/ishanjalan"
			}
		}
	</script>
</svelte:head>

{@render children()}
<Toast />
