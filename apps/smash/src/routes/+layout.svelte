<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { terminateGhostscript, setGhostscriptErrorHandler } from '$lib/utils/ghostscript';
	import { Toast, toast } from '@neutron/ui';
	import { onMount, tick } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { countPageview } from '@neutron/utils/analytics';
	import { detectLocale, type Locale } from '@neutron/utils/seo';
	import { smashLayoutMeta } from '$lib/seo';
	import { page } from '$app/state';

	let { children } = $props();

	const BASE_URL = 'https://ishanjalan.github.io/Smash';

	const routeLabels: Record<string, string> = {
		compress: 'Compress PDF',
		merge: 'Merge PDFs',
		split: 'Split PDF',
		ocr: 'OCR PDF',
		'to-images': 'PDF to Images',
		'from-images': 'Images to PDF',
		rotate: 'Rotate Pages',
		delete: 'Delete Pages',
		reorder: 'Reorder Pages',
		'add-page-numbers': 'Add Page Numbers',
		watermark: 'Watermark PDF',
		protect: 'Protect PDF',
		unlock: 'Unlock PDF',
		'reverse-pages': 'Reverse Pages',
		'edit-metadata': 'Edit Metadata',
		'remove-blank-pages': 'Remove Blank Pages',
		workspace: 'Workspace',
	};

	// Homepage-only SEO — tool pages set their own <title>/meta in +page.svelte.
	// Match by last path segment so prerender works with or without `paths.base`.
	const isHome = $derived.by(() => {
		const segment = page.url.pathname.split('/').filter(Boolean).at(-1) ?? '';
		return !(segment in routeLabels);
	});

	let breadcrumbHtml = $derived.by(() => {
		const segment = page.url.pathname.split('/').filter(Boolean).at(-1) ?? '';
		const label = routeLabels[segment];
		if (!label) return null;
		const schema = {
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
				{ '@type': 'ListItem', position: 2, name: label, item: `${BASE_URL}/${segment}` },
			],
		};
		return '<script type="application/ld+json">' + JSON.stringify(schema) + '<' + '/script>';
	});

	let locale = $state<Locale>('en');
	let meta = $derived(smashLayoutMeta[locale]);

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
	<meta property="og:type" content="website" />
	<meta property="og:image" content="https://ishanjalan.github.io/Smash/og-image.svg" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:site_name" content="Smash" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content="https://ishanjalan.github.io/Smash/og-image.svg" />
	<meta name="robots" content="index, follow" />
	<link rel="alternate" hreflang="x-default" href={BASE_URL} />
	<link
		rel="sitemap"
		type="application/xml"
		href="https://ishanjalan.github.io/Smash/sitemap.xml"
	/>

	{#if isHome}
		<title>{meta.title}</title>
		<meta name="description" content={meta.description} />
		<meta property="og:url" content={BASE_URL} />
		<meta property="og:title" content={meta.title} />
		<meta property="og:description" content={meta.description} />
		<meta name="twitter:title" content={meta.title} />
		<meta name="twitter:description" content={meta.description} />
		<link rel="canonical" href={BASE_URL} />
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
	{/if}

	<!-- BreadcrumbList JSON-LD (tool pages only) -->
	{#if breadcrumbHtml}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html breadcrumbHtml}
	{/if}
</svelte:head>

{@render children()}
