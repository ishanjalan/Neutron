<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import { Footer } from '@neutron/ui';
	import DropZone from '$lib/components/DropZone.svelte';
	import ImageList from '$lib/components/ImageList.svelte';
	import Settings from '$lib/components/Settings.svelte';
	import BatchSummary from '$lib/components/BatchSummary.svelte';
	import LiveSavingsTicker from '$lib/components/LiveSavingsTicker.svelte';
	import EnterpriseHero from '$lib/components/EnterpriseHero.svelte';
	import MobileOptimizations from '$lib/components/MobileOptimizations.svelte';
	import { ConfirmModal, AnimatedNumber, toast } from '@neutron/ui';
	import { images, formatBytes } from '$lib';
	import { processImages, cancelProcessing } from '$lib/utils/compress';
	import { terminatePool } from '$lib/utils/worker-pool';
	import {
		Download,
		Trash2,
		Sparkles,
		Zap,
		Shield,
		Gauge,
		ArrowDown,
		XCircle,
	} from 'lucide-svelte';
	import { downloadAllAsZip } from '$lib/utils/download';
	import { fade, fly } from 'svelte/transition';
	import type { ImageItem } from '$lib/stores/images.svelte';

	let showClearConfirm = $state(false);
	let showBatchSummary = $state(false);
	let previousCompletedCount = $state(0);

	// ZIP download progress
	let zipProgress = $state<number | null>(null);
	let isZipping = $state(false);

	// Undo support for clear all
	let deletedItems: ImageItem[] = [];
	let undoTimeout: ReturnType<typeof setTimeout> | null = null;

	const hasImages = $derived(images.items.length > 0);
	const completedCount = $derived(images.items.filter((i) => i.status === 'completed').length);
	const processingCount = $derived(images.items.filter((i) => i.status === 'processing').length);
	const errorCount = $derived(images.items.filter((i) => i.status === 'error').length);
	const hasUndownloaded = $derived(
		images.items.some((i) => i.status === 'completed' && i.compressedBlob)
	);

	const totalSaved = $derived(
		images.items
			.filter((i) => i.status === 'completed' && i.compressedSize)
			.reduce((acc, i) => acc + (i.originalSize - (i.compressedSize || 0)), 0)
	);
	const savingsPercent = $derived(
		images.items.length > 0
			? Math.round(
					(totalSaved /
						images.items
							.filter((i) => i.status === 'completed')
							.reduce((acc, i) => acc + i.originalSize, 0)) *
						100
				) || 0
			: 0
	);

	// Status text for aria-live region
	const statusText = $derived(
		completedCount > 0
			? `${completedCount} of ${images.items.length} images optimized. ${totalSaved > 0 ? `Saved ${formatBytes(totalSaved)} (${savingsPercent}%)` : ''}`
			: processingCount > 0
				? `Processing ${processingCount} images...`
				: ''
	);

	// Show batch summary and toast when all images complete
	$effect(() => {
		if (
			completedCount > previousCompletedCount &&
			processingCount === 0 &&
			completedCount === images.items.length &&
			images.items.length > 0
		) {
			// Show batch summary with stats
			showBatchSummary = true;
		}
		previousCompletedCount = completedCount;
	});

	async function handleDownloadAll() {
		const completedImages = images.items.filter(
			(i) => i.status === 'completed' && i.compressedBlob
		);
		if (completedImages.length > 0) {
			isZipping = true;
			zipProgress = 0;

			await downloadAllAsZip(
				completedImages,
				(progress) => {
					zipProgress = progress;
				},
				images.settings.filenameTemplate
			);

			isZipping = false;
			zipProgress = null;

			const savedBytes = completedImages.reduce(
				(acc, i) => acc + (i.originalSize - (i.compressedSize || 0)),
				0
			);
			const savedFormatted = formatBytes(savedBytes);
			toast.success(
				`Downloaded ${completedImages.length} images as ZIP (${savedFormatted} saved!)`
			);
		}
	}

	// Clear all with undo support
	function handleClearAllConfirm() {
		const count = images.items.length;

		// Clear existing undo timer if any
		if (undoTimeout) {
			clearTimeout(undoTimeout);
			// Permanently delete previous items
			deletedItems.forEach((item) => {
				URL.revokeObjectURL(item.originalUrl);
				if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
			});
		}

		// Store items for undo (without revoking URLs)
		deletedItems = images.clearAllForUndo();
		showClearConfirm = false;
		showBatchSummary = false;

		// Show toast with undo action
		toast.info(`Cleared ${count} image${count !== 1 ? 's' : ''}`, {
			duration: 5000,
			action: {
				label: 'Undo',
				onClick: handleUndoClear,
			},
		});

		// Schedule permanent deletion
		undoTimeout = setTimeout(() => {
			deletedItems.forEach((item) => {
				URL.revokeObjectURL(item.originalUrl);
				if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
			});
			deletedItems = [];
			undoTimeout = null;
		}, 5000);
	}

	function handleUndoClear() {
		if (deletedItems.length === 0) return;

		// Cancel permanent deletion
		if (undoTimeout) {
			clearTimeout(undoTimeout);
			undoTimeout = null;
		}

		// Restore items
		images.restoreItems(deletedItems);
		const count = deletedItems.length;
		deletedItems = [];

		toast.success(`Restored ${count} image${count !== 1 ? 's' : ''}`);
	}

	function handleCancelProcessing() {
		const count = processingCount;
		cancelProcessing();
		toast.info(`Cancelled processing of ${count} image${count !== 1 ? 's' : ''}`);
	}

	// Keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'd') {
			e.preventDefault();
			handleDownloadAll();
		}
		// Only trigger clear confirm if no modals/dialogs are currently open
		// Check for any open dialogs in the DOM (CompareSlider, PreviewModal, etc.)
		const hasOpenDialog = document.querySelector('[role="dialog"]') !== null;
		if (
			e.key === 'Escape' &&
			hasImages &&
			!showClearConfirm &&
			!showBatchSummary &&
			!hasOpenDialog
		) {
			showClearConfirm = true;
		}
	}

	// Paste from clipboard (images or URLs)
	async function handlePaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items;
		const text = e.clipboardData?.getData('text');
		if (!items && !text) return;

		// Check for pasted URL first
		if (text) {
			const urlPattern =
				/^https?:\/\/[^\s]+\.(jpe?g|png|webp|avif|jxl|svg|gif|heic|heif)(\?[^\s]*)?$/i;
			if (urlPattern.test(text.trim())) {
				e.preventDefault();
				await fetchImageFromUrl(text.trim());
				return;
			}
		}

		// Check for pasted images
		if (items) {
			const imageFiles: File[] = [];
			for (const item of items) {
				if (item.type.startsWith('image/')) {
					const file = item.getAsFile();
					if (file) {
						// Create a new file with a proper name for pasted images
						const ext = file.type.split('/')[1] || 'png';
						const namedFile = new File([file], `pasted-image-${Date.now()}.${ext}`, {
							type: file.type,
						});
						imageFiles.push(namedFile);
					}
				}
			}

			if (imageFiles.length > 0) {
				const newItems = await images.addFiles(imageFiles);
				if (newItems.length > 0) {
					await processImages(newItems.map((i) => i.id));
				}
			}
		}
	}

	// Fetch image from URL (shared with DropZone)
	async function fetchImageFromUrl(url: string) {
		try {
			const parsedUrl = new URL(url);
			const response = await fetch(url, { mode: 'cors', credentials: 'omit' });

			if (!response.ok) {
				throw new Error(`Failed to fetch: ${response.status}`);
			}

			const contentType = response.headers.get('content-type') || '';
			if (!contentType.startsWith('image/')) {
				throw new Error('URL does not point to an image');
			}

			const blob = await response.blob();
			const pathname = parsedUrl.pathname;
			const filename =
				pathname.split('/').pop() || `image-${Date.now()}.${contentType.split('/')[1] || 'png'}`;
			const file = new File([blob], filename, { type: blob.type });

			const newItems = await images.addFiles([file]);
			if (newItems.length > 0) {
				await processImages(newItems.map((i) => i.id));
			}
		} catch (error) {
			console.error('URL fetch error:', error);
			if (error instanceof TypeError && error.message.includes('fetch')) {
				toast.error('CORS blocked - try downloading the image first');
			} else {
				toast.error('Failed to fetch image from URL');
			}
		}
	}

	function handleBeforeUnload(e: BeforeUnloadEvent) {
		if (processingCount > 0) {
			e.preventDefault();
		}
	}

	function handlePageHide() {
		terminatePool();
		images.clearAll();
	}

	const features = [
		{
			icon: Zap,
			title: 'Lightning Fast',
			description: 'WASM-powered codecs for instant compression',
		},
		{
			icon: Shield,
			title: '100% Private',
			description: 'Files never leave your device',
		},
		{
			icon: Gauge,
			title: 'Pro Codecs',
			description: 'MozJPEG, WebP, AVIF, JPEG XL & more',
		},
	];
</script>

<svelte:window
	onkeydown={handleKeydown}
	onpaste={handlePaste}
	onbeforeunload={handleBeforeUnload}
	onpagehide={handlePageHide}
/>

<!-- Screen reader status announcements -->
<div class="sr-only" aria-live="polite" aria-atomic="true">
	{statusText}
</div>

<div class="flex min-h-screen flex-col">
	<MobileOptimizations />
	<Header />

	<!-- Background decoration -->
	<div class="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
		<div
			class="from-data-cyan/5 to-data-blue/5 absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br blur-3xl"
		></div>
		<div
			class="from-data-blue/5 to-data-cyan/5 absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr blur-3xl"
		></div>
	</div>

	<main class="flex-1 px-4 pt-24 pb-8 sm:px-6 sm:pt-28 sm:pb-12 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<!-- Hero Section -->
			{#if !hasImages}
				<EnterpriseHero />
			{/if}

			<!-- Batch Summary (shown after all images complete) -->
			{#if showBatchSummary}
				<BatchSummary onclose={() => (showBatchSummary = false)} />
			{/if}

			<!-- Stats bar when there are images -->
			{#if hasImages && !showBatchSummary}
				<div
					class="glass mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4 sm:mb-8 sm:gap-6 sm:p-6"
					in:fade={{ duration: 200 }}
					role="status"
				>
					<div class="flex flex-wrap items-center gap-4 sm:gap-8">
						<div class="flex items-center gap-3">
							<Sparkles class="text-accent-start h-6 w-6" aria-hidden="true" />
							<span class="text-surface-500 text-base">
								<span class="text-surface-100 text-lg font-semibold"
									><AnimatedNumber
										value={completedCount}
										format={(n) => Math.round(n).toString()}
									/></span
								>
								of {images.items.length} optimized
							</span>
						</div>
						{#if totalSaved > 0}
							<div class="flex items-center gap-4">
								<div class="text-surface-500 text-base">
									Saved:
									<span class="text-accent-start font-mono text-lg font-semibold"
										><AnimatedNumber value={totalSaved} format={formatBytes} /></span
									>
								</div>
								<span
									class="rounded-full bg-green-500/10 px-3 py-1 text-sm font-bold text-green-500"
								>
									-<AnimatedNumber
										value={savingsPercent}
										format={(n) => Math.round(n).toString()}
									/>%
								</span>
							</div>
						{/if}
					</div>
					<div class="flex items-center gap-3">
						{#if processingCount > 0}
							<button
								onclick={handleCancelProcessing}
								class="flex items-center gap-2 rounded-xl bg-amber-500/10 px-5 py-2.5 text-sm font-medium text-amber-400 transition-all hover:bg-amber-500/20"
							>
								<XCircle class="h-5 w-5" aria-hidden="true" />
								<span class="hidden sm:inline">Cancel</span>
							</button>
						{/if}
						{#if completedCount > 0}
							<button
								onclick={handleDownloadAll}
								disabled={isZipping}
								class="from-accent-start to-accent-end shadow-accent-start/30 hover:shadow-accent-start/40 relative flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:cursor-wait disabled:opacity-80"
							>
								<!-- Progress bar overlay -->
								{#if isZipping && zipProgress !== null}
									<div
										class="absolute inset-0 bg-white/20 transition-all duration-150"
										style="width: {zipProgress}%"
									></div>
								{/if}
								<span class="relative flex items-center gap-2">
									{#if isZipping}
										<div
											class="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
											aria-hidden="true"
										></div>
										<span class="hidden sm:inline"
											>Zipping... {zipProgress !== null ? Math.round(zipProgress) : 0}%</span
										>
										<span class="sm:hidden"
											>{zipProgress !== null ? Math.round(zipProgress) : 0}%</span
										>
									{:else}
										<Download class="h-5 w-5" aria-hidden="true" />
										<span class="hidden sm:inline">Download All</span>
										<span class="sm:hidden">ZIP</span>
									{/if}
								</span>
							</button>
						{/if}
						<button
							onclick={() => (showClearConfirm = true)}
							class="bg-surface-800 text-surface-400 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all hover:bg-red-900/20 hover:text-red-400"
							aria-label="Clear all images (press Escape)"
						>
							<Trash2 class="h-5 w-5" aria-hidden="true" />
							<span class="hidden sm:inline">Clear All</span>
						</button>
					</div>
				</div>
			{/if}

			<!-- Settings Panel (shown before drop zone when images exist) -->
			{#if hasImages}
				<Settings />
			{/if}

			<!-- Drop Zone -->
			<DropZone />

			<!-- Settings Panel (shown after drop zone when no images - allows pre-configuration) -->
			{#if !hasImages}
				<div id="settings-panel" class="relative z-10 mt-6" in:fade={{ duration: 200, delay: 300 }}>
					<Settings />
				</div>
			{/if}

			<!-- Image List -->
			{#if hasImages}
				<ImageList />
			{/if}
		</div>
	</main>

	<Footer currentApp="squish" />
</div>

<!-- Live Savings Ticker (shows during/after processing) -->
<LiveSavingsTicker />

<!-- Clear All Confirmation Modal -->
<ConfirmModal
	open={showClearConfirm}
	title="Clear all images?"
	message="This will remove all {images.items
		.length} images from the list. You can undo this action for 5 seconds."
	confirmText="Clear All"
	onconfirm={handleClearAllConfirm}
	oncancel={() => (showClearConfirm = false)}
/>
