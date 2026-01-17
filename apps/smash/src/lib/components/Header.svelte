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

<header class="fixed left-0 right-0 top-0 z-50 px-4 py-4 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-7xl">
		<nav
			class="glass flex items-center justify-between rounded-2xl px-4 py-3 shadow-lg shadow-black/5 sm:px-6"
		>
			<!-- Logo -->
			<a
				href="{base}/"
				class="group flex items-center gap-3"
				onclick={(e) => {
					e.preventDefault();
					window.scrollTo({ top: 0, behavior: 'smooth' });
					if (window.scrollY === 0) {
						window.location.href = `${base}/`;
					}
				}}
			>
				<div
					class="from-accent-start to-accent-end shadow-accent-start/30 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-transform group-hover:scale-110"
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
						<span class="hidden text-sm font-medium sm:inline">Offline</span>
					</div>
				{/if}

				<a
					href="https://github.com/ishanjalan/Neutron/tree/main/apps/smash"
					target="_blank"
					rel="noopener noreferrer"
					class="text-surface-400 hover:bg-surface-800 hover:text-surface-100 flex h-10 w-10 items-center justify-center rounded-xl transition-all"
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
		class="fixed left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-amber-500 px-4 py-3 text-white shadow-lg"
		transition:fade={{ duration: 200 }}
	>
		<WifiOff class="h-5 w-5" />
		<div>
			<p class="font-medium">You're offline</p>
			<p class="text-sm text-amber-100">Don't worry, Smash works offline!</p>
		</div>
	</div>
{/if}
