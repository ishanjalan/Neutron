<script lang="ts">
	import { base } from '$app/paths';
	import { Github, FileText, WifiOff } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	let isOnline = $state(true);
	let showOfflineToast = $state(false);

	onMount(() => {
		isOnline = navigator.onLine;

		const handleOnline = () => {
			isOnline = true;
			showOfflineToast = false;
		};

		const handleOffline = () => {
			isOnline = false;
			showOfflineToast = true;
			setTimeout(() => {
				showOfflineToast = false;
			}, 5000);
		};

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});
</script>

<header class="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 py-4">
	<div class="mx-auto max-w-7xl">
		<nav
			class="glass flex items-center justify-between rounded-2xl px-4 sm:px-6 py-3 shadow-lg shadow-black/5"
		>
			<!-- Logo -->
			<a
				href="{base}/"
				class="flex items-center gap-3 group"
				onclick={(e) => {
					e.preventDefault();
					window.scrollTo({ top: 0, behavior: 'smooth' });
					if (window.scrollY === 0) {
						window.location.href = `${base}/`;
					}
				}}
			>
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-start to-accent-end shadow-lg shadow-accent-start/30 transition-transform group-hover:scale-110"
				>
					<FileText class="h-5 w-5 text-white" strokeWidth={2.5} />
				</div>
				<span class="text-xl font-semibold tracking-tight">
					<span class="gradient-text">Smash</span>
				</span>
			</a>

			<!-- Right side -->
			<div class="flex items-center gap-2">
				<!-- Offline indicator -->
				{#if !isOnline}
					<div
						class="flex items-center gap-2 rounded-xl bg-amber-500/20 px-3 py-2 text-amber-400"
						title="You're offline - app still works!"
						transition:fade={{ duration: 150 }}
					>
						<WifiOff class="h-4 w-4" />
						<span class="text-sm font-medium hidden sm:inline">Offline</span>
					</div>
				{/if}

				<a
					href="https://github.com/ishanjalan/Smash"
					target="_blank"
					rel="noopener noreferrer"
					class="flex h-10 w-10 items-center justify-center rounded-xl text-surface-400 transition-all hover:bg-surface-800 hover:text-surface-100"
					title="View on GitHub"
				>
					<Github class="h-5 w-5" />
				</a>
			</div>
		</nav>
	</div>
</header>

<!-- Offline toast notification -->
{#if showOfflineToast}
	<div
		class="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl bg-amber-500 px-4 py-3 text-white shadow-lg"
		transition:fade={{ duration: 200 }}
	>
		<WifiOff class="h-5 w-5" />
		<div>
			<p class="font-medium">You're offline</p>
			<p class="text-sm text-amber-100">Don't worry, Smash works offline!</p>
		</div>
	</div>
{/if}
