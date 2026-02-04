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

<div class="bg-surface-950 text-surface-100 relative min-h-screen">
	<!-- Background decoration -->
	<div class="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
		<div
			class="from-accent-start/10 to-accent-end/10 absolute -right-1/4 -top-1/2 h-[800px] w-[800px] rounded-full bg-gradient-to-br blur-3xl"
		></div>
		<div
			class="from-accent-end/10 to-accent-start/10 absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr blur-3xl"
		></div>
	</div>

	{@render children()}
</div>
