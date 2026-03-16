<script lang="ts">
	import { resolve } from '$app/paths';
	import { AppHeader } from '@neutron/ui';
	import { images } from '$lib/stores/images.svelte';
	import { toast } from '@neutron/ui';
	import { Command, Download, Keyboard, X, Zap } from 'lucide-svelte';
	import { scale } from 'svelte/transition';

	const FIRST_VISIT_KEY = 'squish-first-visit-shown';

	function handleLogoClick() {
		const hadImages = images.items.length > 0;
		images.clearAll();
		if (hadImages) {
			toast.info('All images cleared');
		}
	}

	let showShortcuts = $state(false);
	let showFirstRunHint = $state(false);
	let showInstallPrompt = $state(false);
	let deferredPrompt: {
		prompt: () => Promise<{ outcome: string }>;
		userChoice: Promise<{ outcome: string }>;
	} | null = null;

	const isMac =
		typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
	const modKey = isMac ? '⌘' : 'Ctrl';

	const shortcuts = [
		{ keys: `${modKey}+Shift+D`, action: 'Download all as ZIP' },
		{ keys: `${modKey}+V`, action: 'Paste image from clipboard' },
		{ keys: 'Escape', action: 'Clear all images' },
	];

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('[data-shortcuts-popover]') && !target.closest('[data-first-run-hint]')) {
			showShortcuts = false;
			showFirstRunHint = false;
		}
	}

	function dismissFirstRunHint() {
		showFirstRunHint = false;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(FIRST_VISIT_KEY, 'true');
		}
	}

	function handleBeforeInstallPrompt(e: Event) {
		e.preventDefault();
		deferredPrompt = e as unknown as {
			prompt: () => Promise<{ outcome: string }>;
			userChoice: Promise<{ outcome: string }>;
		};
		showInstallPrompt = true;
	}

	async function handleInstallClick() {
		if (!deferredPrompt) return;
		await deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;
		if (outcome === 'accepted') {
			showInstallPrompt = false;
		}
		deferredPrompt = null;
	}

	$effect(() => {
		if (typeof window === 'undefined') return;
		const hasVisited = localStorage.getItem(FIRST_VISIT_KEY);
		if (!hasVisited) {
			const t = setTimeout(() => {
				showFirstRunHint = true;
			}, 1500);
			return () => clearTimeout(t);
		}
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
	});
</script>

<svelte:window onclick={handleClickOutside} />

<AppHeader
	appName="Squish"
	homeHref={resolve('/')}
	offlineMessage="Don't worry, Squish works offline!"
	githubUrl="https://github.com/ishanjalan/Neutron/tree/main/apps/squish"
	onLogoClick={() => handleLogoClick()}
>
	{#snippet icon()}
		<Zap class="text-surface-950 h-5 w-5" strokeWidth={2.5} />
	{/snippet}

	{#if showInstallPrompt}
		<button
			onclick={handleInstallClick}
			class="bg-accent-start/10 text-accent-start hover:bg-accent-start/20 flex items-center gap-2 rounded-xl px-3 py-2 transition-colors"
			transition:scale={{ duration: 150, start: 0.95 }}
			title="Install Squish as an app"
		>
			<Download class="h-4 w-4" />
			<span class="hidden text-xs font-medium sm:inline">Install App</span>
		</button>
	{/if}

	<div class="relative" data-shortcuts-popover>
		<button
			onclick={(e) => {
				e.stopPropagation();
				showShortcuts = !showShortcuts;
				showFirstRunHint = false;
			}}
			class="text-surface-400 hover:bg-surface-800 hover:text-surface-100 flex h-10 w-10 items-center justify-center rounded-xl transition-all {showFirstRunHint
				? 'ring-accent-start ring-offset-surface-900 ring-2 ring-offset-2'
				: ''}"
			aria-label="Keyboard shortcuts"
			aria-expanded={showShortcuts}
			aria-haspopup="true"
		>
			<Keyboard class="h-5 w-5" />
		</button>

		{#if showFirstRunHint && !showShortcuts}
			<div
				class="from-accent-start to-accent-end absolute top-full right-0 mt-2 w-72 rounded-xl bg-gradient-to-br p-4 shadow-xl"
				transition:scale={{ duration: 200, start: 0.95 }}
				data-first-run-hint
			>
				<button
					onclick={dismissFirstRunHint}
					class="absolute top-2 right-2 rounded-lg p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
					aria-label="Dismiss"
				>
					<X class="h-4 w-4" />
				</button>
				<div class="flex items-start gap-3">
					<div
						class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/20"
					>
						<Command class="h-4 w-4 text-white" />
					</div>
					<div>
						<h3 class="text-sm font-semibold text-white">Pro tip: Keyboard shortcuts!</h3>
						<p class="mt-1 text-xs text-white/80">
							Paste images with <kbd class="rounded bg-white/20 px-1.5 py-0.5 font-mono"
								>{modKey}+V</kbd
							>, download all with
							<kbd class="rounded bg-white/20 px-1.5 py-0.5 font-mono">{modKey}+Shift+D</kbd>
						</p>
						<button
							onclick={dismissFirstRunHint}
							class="mt-2 text-xs font-medium text-white underline underline-offset-2 hover:no-underline"
						>
							Got it!
						</button>
					</div>
				</div>
			</div>
		{/if}

		{#if showShortcuts}
			<div
				class="bg-surface-800 absolute top-full right-0 mt-2 w-64 rounded-xl p-4 shadow-xl ring-1 ring-white/10"
				transition:scale={{ duration: 150, start: 0.95 }}
				role="tooltip"
			>
				<h3 class="text-surface-100 mb-3 flex items-center gap-2 text-sm font-semibold">
					<Command class="text-accent-start h-4 w-4" />
					Keyboard Shortcuts
				</h3>
				<ul class="space-y-2">
					{#each shortcuts as shortcut (shortcut.action)}
						<li class="flex items-center justify-between text-sm">
							<span class="text-surface-400">{shortcut.action}</span>
							<kbd class="bg-surface-700 text-surface-300 rounded px-2 py-0.5 font-mono text-xs">
								{shortcut.keys}
							</kbd>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</AppHeader>
