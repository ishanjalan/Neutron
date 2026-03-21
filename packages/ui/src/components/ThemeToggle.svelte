<script lang="ts">
	import { Sun, Moon } from 'lucide-svelte';

	let isDark = $state(true);

	$effect(() => {
		if (typeof document === 'undefined') return;
		isDark = document.documentElement.getAttribute('data-theme') !== 'light';
	});

	function toggle() {
		const next = isDark ? 'light' : 'dark';
		document.documentElement.setAttribute('data-theme', next);
		try {
			localStorage.setItem('neutron-theme', next);
		} catch (_) {
			// localStorage may be unavailable (private browsing)
		}
		isDark = !isDark;
	}
</script>

<button
	onclick={toggle}
	class="text-surface-400 hover:bg-surface-800 hover:text-surface-100 flex h-10 w-10 items-center justify-center rounded-xl transition-all"
	title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
	aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
>
	{#if isDark}
		<Sun class="h-5 w-5" />
	{:else}
		<Moon class="h-5 w-5" />
	{/if}
</button>
