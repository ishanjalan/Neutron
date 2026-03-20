<script lang="ts">
	import '../app.css';

	let { children } = $props();

	const squishHeicUrl = 'https://ishanjalan.github.io/Squish/heic';
</script>

<svelte:head>
	<title>HEIC Converter — Now part of Squish</title>
	<meta name="robots" content="noindex, follow" />
	<link rel="canonical" href={squishHeicUrl} />
	<meta http-equiv="refresh" content="0;url={squishHeicUrl}" />
</svelte:head>

<div class="bg-surface-950 text-surface-100 relative min-h-screen">
	{@render children()}
</div>
