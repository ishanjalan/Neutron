<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import DraggableVideoList from '$lib/components/DraggableVideoList.svelte';
	import AdvancedSettings from '$lib/components/AdvancedSettings.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import KeyboardShortcuts from '$lib/components/KeyboardShortcuts.svelte';
	import PerformanceMonitor from '$lib/components/PerformanceMonitor.svelte';
	import OnboardingModal from '$lib/components/OnboardingModal.svelte';
	import { Toast, toast } from '@neutron/ui';
	import { videos, QUALITY_PRESETS } from '$lib/stores/videos.svelte';
	import {
		Download,
		Trash2,
		Film,
		Shield,
		Gauge,
		Keyboard,
		Activity,
		Clipboard,
		Cpu,
		Layers,
		AlertTriangle,
		ArrowRight,
	} from 'lucide-svelte';
	import { downloadAllAsZip } from '$lib/utils/download';
	import { processVideos, preloadEncoder, checkBrowserSupport } from '$lib/utils/compress';
	import { formatBytes } from '@neutron/utils';
	import { fade, fly } from 'svelte/transition';
	import { onMount } from 'svelte';

	let showClearConfirm = $state(false);
	let showShortcuts = $state(false);
	let showPerformance = $state(false);
	let showOnboarding = $state(false);
	let browserSupported = $state(true);
	let browserError = $state('');

	const hasVideos = $derived(videos.items.length > 0);
	const completedCount = $derived(videos.items.filter((i) => i.status === 'completed').length);
	const totalSaved = $derived(
		videos.items
			.filter((i) => i.status === 'completed' && i.compressedSize)
			.reduce((acc, i) => acc + (i.originalSize - (i.compressedSize || 0)), 0)
	);
	const savingsPercent = $derived(
		videos.items.length > 0
			? Math.round(
					(totalSaved /
						videos.items
							.filter((i) => i.status === 'completed')
							.reduce((acc, i) => acc + i.originalSize, 0)) *
						100
				) || 0
			: 0
	);

	function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
		if (type === 'success') {
			toast.success(message);
		} else if (type === 'error') {
			toast.error(message);
		} else {
			toast.info(message);
		}
	}

	async function handleDownloadAll() {
		const completedVideos = videos.items.filter(
			(i) => i.status === 'completed' && i.compressedBlob
		);
		if (completedVideos.length > 0) {
			await downloadAllAsZip(completedVideos);
			showNotification(`Downloaded ${completedVideos.length} videos as ZIP`, 'success');
		}
	}

	// Clipboard paste support
	async function handlePaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items;
		if (!items) return;

		const videoFiles: File[] = [];
		for (const item of items) {
			if (item.type.startsWith('video/')) {
				const file = item.getAsFile();
				if (file) {
					videoFiles.push(file);
				}
			}
		}

		if (videoFiles.length > 0) {
			e.preventDefault();
			const newItems = await videos.addFiles(videoFiles);
			if (newItems.length > 0) {
				// Don't auto-compress - let user set trim/settings first
				showNotification(
					`Added ${newItems.length} video(s) — click Compress when ready`,
					'success'
				);
			}
		}
	}

	// Comprehensive keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		// Don't trigger shortcuts when typing in inputs
		if (
			e.target instanceof HTMLInputElement ||
			e.target instanceof HTMLTextAreaElement ||
			e.target instanceof HTMLSelectElement
		) {
			return;
		}

		const isMod = e.metaKey || e.ctrlKey;

		// Cmd/Ctrl + Shift + D - Download all as ZIP
		if (isMod && e.shiftKey && e.key.toLowerCase() === 'd') {
			e.preventDefault();
			handleDownloadAll();
			return;
		}

		// Escape - Clear all videos or close modals
		if (e.key === 'Escape') {
			if (showShortcuts) {
				showShortcuts = false;
			} else if (showPerformance) {
				showPerformance = false;
			} else if (hasVideos) {
				showClearConfirm = true;
			}
			return;
		}

		// ? - Show keyboard shortcuts
		if (e.key === '?' || (e.shiftKey && e.key === '/')) {
			e.preventDefault();
			showShortcuts = true;
			return;
		}

		// Quality presets (1-5)
		const presetKeys: { [key: string]: keyof typeof QUALITY_PRESETS } = {
			'1': 'tiny',
			'2': 'web',
			'3': 'social',
			'4': 'high',
			'5': 'lossless',
		};

		if (presetKeys[e.key]) {
			e.preventDefault();
			videos.updateSettings({ quality: presetKeys[e.key] });
			showNotification(`Quality: ${QUALITY_PRESETS[presetKeys[e.key]].label}`, 'info');
			return;
		}

		// Format shortcuts (M, W, A)
		if (e.key.toLowerCase() === 'm' && !isMod) {
			e.preventDefault();
			videos.updateSettings({ outputFormat: 'mp4' });
			showNotification('Format: MP4', 'info');
			return;
		}

		if (e.key.toLowerCase() === 'w' && !isMod) {
			e.preventDefault();
			videos.updateSettings({ outputFormat: 'webm' });
			showNotification('Format: WebM', 'info');
			return;
		}

		// P - Toggle performance monitor
		if (e.key.toLowerCase() === 'p' && !isMod) {
			e.preventDefault();
			showPerformance = !showPerformance;
			return;
		}
	}

	// Check browser support and preload encoder on mount
	onMount(() => {
		// Check browser compatibility
		const support = checkBrowserSupport();
		if (!support.supported) {
			browserSupported = false;
			browserError = support.reason || 'WebCodecs not supported';
		}

		// Show onboarding for first-time users
		if (!localStorage.getItem('squash-onboarding-seen')) {
			showOnboarding = true;
		}

		// Preload WebCodecs capabilities after a short delay
		setTimeout(() => {
			preloadEncoder().then((loaded) => {
				if (loaded) {
					console.log('WebCodecs encoder ready');
				}
			});
		}, 500);
	});

	function dismissOnboarding(dontShowAgain: boolean) {
		if (dontShowAgain) {
			localStorage.setItem('squash-onboarding-seen', 'true');
		}
		showOnboarding = false;
	}

	const features = [
		{
			icon: Cpu,
			title: 'GPU Accelerated',
			description: 'Up to 100x faster with WebCodecs hardware encoding',
		},
		{
			icon: Shield,
			title: '100% Private',
			description: 'Videos never leave your device — zero server uploads',
		},
		{
			icon: Gauge,
			title: 'Pro Codecs',
			description: 'H.264, H.265/HEVC, VP9, AV1, AAC, Opus',
		},
		{
			icon: Layers,
			title: 'Pure WebCodecs',
			description: 'Powered by Mediabunny — tiny bundle, instant start',
		},
	];
</script>

<svelte:window onkeydown={handleKeydown} onpaste={handlePaste} />

<div class="flex min-h-screen flex-col">
	<Header />

	<!-- Background decoration -->
	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div
			class="from-accent-start/10 to-accent-end/10 absolute -right-1/4 -top-1/2 h-[800px] w-[800px] rounded-full bg-gradient-to-br blur-3xl"
		></div>
		<div
			class="from-accent-end/10 to-accent-start/10 absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr blur-3xl"
		></div>
	</div>

	<main class="flex-1 px-4 pb-8 pt-24 sm:px-6 sm:pb-12 sm:pt-28 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<!-- Browser Compatibility Warning -->
			{#if !browserSupported}
				<div
					class="mb-6 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5"
					in:fade={{ duration: 200 }}
				>
					<AlertTriangle class="h-6 w-6 flex-shrink-0 text-amber-500" />
					<div>
						<h3 class="font-semibold text-amber-400">Browser Not Supported</h3>
						<p class="mt-1 text-sm text-amber-300/80">
							{browserError} Please use <strong>Chrome</strong>, <strong>Edge</strong>, or
							<strong>Safari 16.4+</strong> for the best experience.
						</p>
					</div>
				</div>
			{/if}

			<!-- Hero Section -->
			{#if !hasVideos}
				<div class="mb-8 text-center sm:mb-12" in:fade={{ duration: 300 }}>
					<div
						class="bg-accent-start/10 text-accent-start mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
					>
						<Cpu class="h-4 w-4" />
						GPU-Accelerated • Free & Open Source
					</div>
					<h1 class="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
						<span class="gradient-text">Compress</span> videos
						<br class="hidden sm:block" />
						<span class="text-surface-400">at warp speed</span>
					</h1>
					<p class="text-surface-500 mx-auto mb-8 max-w-2xl text-base leading-relaxed sm:text-lg">
						GPU-accelerated video compression powered by
						<a
							href="https://mediabunny.dev"
							target="_blank"
							rel="noopener"
							class="text-accent-start hover:underline">Mediabunny</a
						>
						+ WebCodecs.
						<span class="text-surface-300 font-medium">100% private</span>
						— everything runs locally in your browser.
					</p>

					<!-- Drop Zone - Primary action above the fold -->
					<div class="mx-auto mb-10 max-w-3xl">
						<DropZone />
					</div>

					<!-- Clipboard hint -->
					<div class="text-surface-500 mb-8 flex items-center justify-center gap-2">
						<Clipboard class="h-4 w-4" />
						<span class="text-sm"
							>Or press <kbd class="bg-surface-800 text-surface-300 rounded px-2 py-0.5">Cmd+V</kbd>
							to paste from clipboard</span
						>
					</div>

					<!-- Privacy visualization -->
					<div class="mb-10 flex items-center justify-center gap-3 sm:gap-4">
						<div class="flex flex-col items-center">
							<div class="bg-surface-800/80 border-surface-700/50 rounded-xl border p-3">
								<Film class="text-surface-400 h-5 w-5" />
							</div>
							<span class="text-surface-500 mt-1.5 text-[10px]">Your Video</span>
						</div>

						<div class="flex items-center gap-1.5 sm:gap-2">
							<ArrowRight class="text-surface-600 h-4 w-4" />
							<div class="rounded-full border border-green-500/30 bg-green-500/15 px-2.5 py-1">
								<span class="text-xs font-medium text-green-400">Stays Local</span>
							</div>
							<ArrowRight class="text-surface-600 h-4 w-4" />
						</div>

						<div class="flex flex-col items-center">
							<div
								class="from-accent-start to-accent-end shadow-accent-start/20 rounded-xl bg-gradient-to-br p-3 shadow-lg"
							>
								<Download class="h-5 w-5 text-white" />
							</div>
							<span class="text-surface-500 mt-1.5 text-[10px]">Compressed</span>
						</div>
					</div>

					<!-- Feature Cards -->
					<div class="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
						{#each features as feature, i}
							<div
								class="glass group flex flex-col items-center gap-3 rounded-2xl p-4 text-center transition-all hover:scale-[1.02] sm:p-5"
								in:fly={{ y: 20, delay: 100 * i, duration: 300 }}
							>
								<div
									class="from-accent-start/20 to-accent-end/20 text-accent-start flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br"
								>
									<feature.icon class="h-5 w-5" />
								</div>
								<div>
									<h3 class="text-surface-100 text-sm font-semibold">
										{feature.title}
									</h3>
									<p class="text-surface-500 mt-1 text-xs leading-relaxed">{feature.description}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Stats bar when there are videos -->
			{#if hasVideos}
				<div
					class="glass mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4 sm:mb-8 sm:gap-6 sm:p-6"
					in:fade={{ duration: 200 }}
				>
					<div class="flex flex-wrap items-center gap-4 sm:gap-8">
						<div class="flex items-center gap-3">
							<Film class="text-accent-start h-6 w-6" />
							<span class="text-surface-500 text-base">
								<span class="text-surface-100 text-lg font-semibold">{completedCount}</span>
								of {videos.items.length} compressed
							</span>
						</div>
						{#if totalSaved > 0}
							<div class="flex items-center gap-4">
								<div class="text-surface-500 text-base">
									Saved:
									<span class="text-accent-start font-mono text-lg font-semibold"
										>{formatBytes(totalSaved)}</span
									>
								</div>
								<span
									class="rounded-full bg-green-500/10 px-3 py-1 text-sm font-bold text-green-500"
								>
									-{savingsPercent}%
								</span>
							</div>
						{/if}
					</div>
					<div class="flex items-center gap-3">
						<!-- Performance Monitor Toggle -->
						<button
							onclick={() => (showPerformance = !showPerformance)}
							class="bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all {showPerformance
								? 'ring-accent-start/50 text-accent-start ring-1'
								: ''}"
							title="Performance monitor (P)"
						>
							<Activity class="h-4 w-4" />
							<span class="hidden sm:inline">Stats</span>
						</button>

						<!-- Keyboard Shortcuts -->
						<button
							onclick={() => (showShortcuts = true)}
							class="bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
							title="Keyboard shortcuts (?)"
						>
							<Keyboard class="h-4 w-4" />
							<span class="hidden sm:inline">Shortcuts</span>
						</button>

						{#if completedCount > 0}
							<button
								onclick={handleDownloadAll}
								class="from-accent-start to-accent-end shadow-accent-start/30 hover:shadow-accent-start/40 flex items-center gap-2 rounded-xl bg-gradient-to-r px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
							>
								<Download class="h-5 w-5" />
								<span class="hidden sm:inline">Download All</span>
								<span class="sm:hidden">ZIP</span>
							</button>
						{/if}
						<button
							onclick={() => (showClearConfirm = true)}
							class="bg-surface-800 text-surface-400 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all hover:bg-red-900/20 hover:text-red-400"
							title="Press Escape to clear"
						>
							<Trash2 class="h-5 w-5" />
							<span class="hidden sm:inline">Clear All</span>
						</button>
					</div>
				</div>
			{/if}

			<!-- Settings Panel -->
			{#if hasVideos}
				<AdvancedSettings />
			{/if}

			<!-- Drop Zone (only shown when videos exist, as it's in hero otherwise) -->
			{#if hasVideos}
				<DropZone />
			{/if}

			<!-- Video List -->
			{#if hasVideos}
				<DraggableVideoList />
			{/if}
		</div>
	</main>

	<Footer />
</div>

<!-- Clear All Confirmation Modal -->
<ConfirmModal
	open={showClearConfirm}
	title="Clear all videos?"
	message="This will remove all {videos.items
		.length} videos from the list. This action cannot be undone."
	confirmText="Clear All"
	onconfirm={() => {
		videos.clearAll();
		showClearConfirm = false;
		showNotification('All videos cleared', 'info');
	}}
	oncancel={() => (showClearConfirm = false)}
/>

<!-- Keyboard Shortcuts Modal -->
<KeyboardShortcuts open={showShortcuts} onclose={() => (showShortcuts = false)} />

<!-- Performance Monitor -->
<PerformanceMonitor open={showPerformance} onclose={() => (showPerformance = false)} />

<!-- Onboarding Modal -->
<OnboardingModal open={showOnboarding} onclose={dismissOnboarding} />

<!-- Toast Notifications -->
<Toast />
