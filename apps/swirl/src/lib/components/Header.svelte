<script lang="ts">
	import { base, resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { Github, Disc3, WifiOff, Menu, X } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	let isOnline = $state(true);
	let showOfflineToast = $state(false);
	let mobileMenuOpen = $state(false);

	// Grouped navigation
	const navGroups = [
		{
			label: 'Create',
			links: [
				{ href: '/video-to-gif', label: 'Video to GIF' },
				{ href: '/make', label: 'GIF Maker' },
			],
		},
		{
			label: 'Edit',
			links: [
				{ href: '/optimize', label: 'Optimize' },
				{ href: '/resize', label: 'Resize' },
				{ href: '/crop', label: 'Crop' },
				{ href: '/speed', label: 'Speed' },
				{ href: '/combine', label: 'Combine' },
			],
		},
		{
			label: 'Extract',
			links: [{ href: '/split', label: 'Split Frames' }],
		},
	];

	// Flat list for mobile
	const allLinks = navGroups.flatMap((g) => g.links);

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

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

<header class="fixed top-0 right-0 left-0 z-50 px-4 py-4 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-7xl">
		<nav
			class="glass flex items-center justify-between rounded-2xl px-4 py-3 shadow-lg shadow-black/5 sm:px-6"
		>
			<!-- Logo -->
			<a href={resolve('/')} class="group flex items-center gap-3" onclick={closeMobileMenu}>
				<div
					class="from-accent-start to-accent-end shadow-accent-start/30 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-180"
				>
					<Disc3 class="h-5 w-5 text-white" strokeWidth={2.5} />
				</div>
				<span class="text-xl font-semibold tracking-tight">
					<span class="gradient-text">Swirl</span>
				</span>
			</a>

			<!-- Nav links - Desktop (hidden on mobile) -->
			<div class="hidden items-center gap-1 lg:flex">
				{#each navGroups as group, groupIndex (group.label)}
					{#each group.links as link (link.href)}
						{@const isActive = $page.url.pathname === `${base}${link.href}`}
						<a
							href={resolve(link.href)}
							class="rounded-lg px-3 py-2 text-sm font-medium transition-colors {isActive
								? 'text-accent-start bg-accent-start/10'
								: 'text-surface-400 hover:text-surface-100 hover:bg-surface-800'}"
						>
							{link.label}
						</a>
					{/each}
					{#if groupIndex < navGroups.length - 1}
						<div class="bg-surface-700 mx-1 h-5 w-px"></div>
					{/if}
				{/each}
			</div>

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
					href="https://github.com/ishanjalan/Neutron/tree/main/apps/swirl"
					target="_blank"
					rel="noopener noreferrer"
					class="text-surface-400 hover:bg-surface-800 hover:text-surface-100 flex h-10 w-10 items-center justify-center rounded-xl transition-all"
					title="View on GitHub"
				>
					<Github class="h-5 w-5" />
				</a>

				<!-- Mobile menu button -->
				<button
					onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
					class="text-surface-400 hover:bg-surface-800 hover:text-surface-100 flex h-10 w-10 items-center justify-center rounded-xl transition-all lg:hidden"
					aria-label="Toggle menu"
				>
					{#if mobileMenuOpen}
						<X class="h-5 w-5" />
					{:else}
						<Menu class="h-5 w-5" />
					{/if}
				</button>
			</div>
		</nav>
	</div>
</header>

<!-- Mobile menu overlay -->
{#if mobileMenuOpen}
	<div class="fixed inset-0 z-40 lg:hidden" transition:fade={{ duration: 150 }}>
		<!-- Backdrop -->
		<button
			class="absolute inset-0 bg-black/50 backdrop-blur-sm"
			onclick={closeMobileMenu}
			aria-label="Close menu"
		></button>

		<!-- Menu panel -->
		<div
			class="glass absolute top-20 right-4 left-4 rounded-2xl p-4 shadow-xl sm:left-auto sm:w-72"
			transition:fly={{ y: -10, duration: 200 }}
		>
			{#each navGroups as group (group.label)}
				<div class="mb-4 last:mb-0">
					<p class="text-surface-500 mb-2 px-3 text-xs font-semibold tracking-wider uppercase">
						{group.label}
					</p>
					<div class="space-y-1">
						{#each group.links as link (link.href)}
							{@const isActive = $page.url.pathname === `${base}${link.href}`}
							<a
								href={resolve(link.href)}
								onclick={closeMobileMenu}
								class="block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors {isActive
									? 'text-accent-start bg-accent-start/10'
									: 'text-surface-300 hover:text-surface-100 hover:bg-surface-800'}"
							>
								{link.label}
							</a>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}

<!-- Offline toast notification -->
{#if showOfflineToast}
	<div
		class="fixed top-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-amber-500 px-4 py-3 text-white shadow-lg"
		transition:fade={{ duration: 200 }}
	>
		<WifiOff class="h-5 w-5" />
		<div>
			<p class="font-medium">You're offline</p>
			<p class="text-sm text-amber-100">Don't worry, Swirl works offline!</p>
		</div>
	</div>
{/if}
