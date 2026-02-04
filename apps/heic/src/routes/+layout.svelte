<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		// Hide loader once app is loaded
		const loader = document.getElementById('app-loader');
		if (loader) {
			loader.classList.add('fade-out');
			setTimeout(() => loader.remove(), 300);
		}
	});
</script>

<div class="bg-surface-950 text-surface-100 min-h-screen">
	{@render children()}
</div>
