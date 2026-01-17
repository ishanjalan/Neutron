<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Smash - Privacy-First PDF Tools</title>
	<meta property="og:title" content="Smash - Privacy-First PDF Tools" />
	<meta property="og:description" content="Free online PDF tools - compress, merge, split, protect PDFs instantly in your browser. 100% private, files never leave your device." />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Smash - Privacy-First PDF Tools" />
	<meta name="twitter:description" content="Free online PDF tools - compress, merge, split, protect PDFs instantly in your browser. 100% private, files never leave your device." />
</svelte:head>

{@render children()}
