<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Squash - Video Compressor</title>
	<meta property="og:title" content="Squash - Video Compressor" />
	<meta property="og:description" content="Free online video compressor - compress MP4, WebM, MOV files instantly in your browser. 100% private." />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Squash - Video Compressor" />
	<meta name="twitter:description" content="Free online video compressor - compress MP4, WebM, MOV files instantly in your browser. 100% private." />
</svelte:head>

{@render children()}
