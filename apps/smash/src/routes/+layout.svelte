<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { terminateGhostscript, setGhostscriptErrorHandler } from '$lib/utils/ghostscript';
	import { Toast, toast } from '@neutron/ui';
	import { onMount } from 'svelte';
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
	<link
		rel="sitemap"
		type="application/xml"
		href="https://ishanjalan.github.io/Smash/sitemap.xml"
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
