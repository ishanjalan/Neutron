<script lang="ts">
	import { images, formatBytes } from '$lib';
	import {
		downloadAllAsZip,
		isFileSystemAccessSupported,
		downloadWithFileSystemAPI,
	} from '$lib/utils/download';
	import { toast } from '@neutron/ui';
	import { AnimatedNumber } from '@neutron/ui';
	import {
		Download,
		Clock,
		Zap,
		HardDrive,
		TrendingDown,
		X,
		CheckCircle,
		FolderDown,
		Trophy,
		Globe,
		Gauge,
		Award,
		Sparkles,
		Share2,
	} from 'lucide-svelte';
	import { scale, fade } from 'svelte/transition';

	let { onclose }: { onclose: () => void } = $props();

	const completedItems = $derived(images.items.filter((i) => i.status === 'completed'));
	const stats = $derived(images.batchStats);

	let isSavingToFolder = $state(false);
	let savingProgress = $state('');

	const fsapiSupported = $derived(isFileSystemAccessSupported());

	// Calculate stats
	const totalOriginalSize = $derived(completedItems.reduce((acc, i) => acc + i.originalSize, 0));
	const totalCompressedSize = $derived(
		completedItems.reduce((acc, i) => acc + (i.compressedSize || 0), 0)
	);
	const totalSaved = $derived(totalOriginalSize - totalCompressedSize);
	const savingsPercent = $derived(
		totalOriginalSize > 0 ? Math.round((totalSaved / totalOriginalSize) * 100) : 0
	);

	const processingTime = $derived(
		stats.startTime && stats.endTime ? (stats.endTime - stats.startTime) / 1000 : 0
	);
	const imagesPerSecond = $derived(
		processingTime > 0 ? (completedItems.length / processingTime).toFixed(1) : '0'
	);
	const avgTimePerImage = $derived(
		completedItems.length > 0 ? Math.round((processingTime / completedItems.length) * 1000) : 0
	);

	// Impact metrics
	const secondsFaster = $derived(Math.round((totalSaved / 1024 / 1024) * 2)); // ~2s per MB
	const co2Saved = $derived(Math.round((totalSaved / 1024 / 1024) * 0.28)); // ~0.28g CO2 per MB

	// Achievement level based on savings
	const achievementLevel = $derived(
		totalSaved > 50 * 1024 * 1024
			? { title: 'Compression Master', icon: Trophy, color: 'from-amber-500 to-orange-500' }
			: totalSaved > 20 * 1024 * 1024
				? { title: 'Size Slayer', icon: Award, color: 'from-purple-500 to-pink-500' }
				: totalSaved > 10 * 1024 * 1024
					? { title: 'Bandwidth Hero', icon: Zap, color: 'from-blue-500 to-cyan-500' }
					: { title: 'Space Saver', icon: Sparkles, color: 'from-green-500 to-emerald-500' }
	);

	function formatTime(seconds: number): string {
		if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
		if (seconds < 60) return `${seconds.toFixed(1)}s`;
		const mins = Math.floor(seconds / 60);
		const secs = (seconds % 60).toFixed(0);
		return `${mins}m ${secs}s`;
	}

	function handleShare() {
		const text = `🎉 Just optimized ${completedItems.length} images with Squish and saved ${formatBytes(totalSaved)} (${savingsPercent}% smaller)!`;
		const url = 'https://ishanjalan.github.io/Squish/';

		if (navigator.share) {
			navigator.share({ title: 'Squish Results', text, url }).catch(() => {
				/* user cancelled */
			});
		} else {
			// Fallback: copy to clipboard
			navigator.clipboard.writeText(`${text} ${url}`);
			toast.success('Share text copied to clipboard!');
		}
	}

	async function handleDownloadAll() {
		if (completedItems.length > 0) {
			await downloadAllAsZip(completedItems, undefined, images.settings.filenameTemplate);
			const savedFormatted = formatBytes(totalSaved);
			toast.success(
				`Downloaded ${completedItems.length} ${completedItems.length === 1 ? 'image' : 'images'} as ZIP (${savedFormatted} saved!)`
			);
		}
	}

	async function handleSaveToFolder() {
		try {
			isSavingToFolder = true;
			savingProgress = 'Choosing folder...';

			await downloadWithFileSystemAPI(completedItems, images.settings.filenameTemplate);

			toast.success(`Saved ${completedItems.length} files to folder!`);
			onclose();
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				toast.info('Folder selection cancelled');
			} else {
				toast.error(
					'Failed to save files: ' + (error instanceof Error ? error.message : 'Unknown error')
				);
			}
		} finally {
			isSavingToFolder = false;
			savingProgress = '';
		}
	}
</script>

{#if completedItems.length > 0 && stats.endTime}
	<div
		class="glass mb-6 overflow-hidden rounded-2xl sm:mb-8"
		in:scale={{ duration: 300, start: 0.95 }}
		out:fade={{ duration: 150 }}
	>
		<!-- Header with Achievement Badge -->
		<div class="from-accent-start/20 to-accent-end/20 relative bg-gradient-to-r px-5 py-6">
			<button
				onclick={onclose}
				class="text-surface-400 hover:bg-surface-700 hover:text-surface-200 absolute right-4 top-4 rounded-lg p-2 transition-colors"
				aria-label="Dismiss summary"
			>
				<X class="h-5 w-5" />
			</button>

			<!-- Achievement Badge -->
			<div class="mb-4 flex justify-center">
				<div
					class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br {achievementLevel.color} shadow-lg"
					in:scale={{ duration: 600, delay: 200, start: 0 }}
				>
					<svelte:component this={achievementLevel.icon} class="h-8 w-8 text-white" />
				</div>
			</div>

			<div class="text-center">
				<h3 class="text-surface-50 mb-1 text-2xl font-bold">{achievementLevel.title}!</h3>
				<p class="text-surface-300">
					You optimized <strong class="text-accent-start">{completedItems.length}</strong>
					{completedItems.length === 1 ? 'image' : 'images'}
				</p>
			</div>
		</div>

		<!-- Stats Grid -->
		<div class="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
			<!-- Total Saved -->
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-500/10"
				>
					<TrendingDown class="h-5 w-5 text-green-500" />
				</div>
				<div>
					<p class="text-surface-400 text-xs uppercase tracking-wide">Saved</p>
					<p class="text-lg font-bold text-green-500">
						<AnimatedNumber value={totalSaved} format={formatBytes} duration={800} />
					</p>
					<p class="text-surface-500 text-xs">
						-<AnimatedNumber value={savingsPercent} format={(n) => Math.round(n).toString()} />%
					</p>
				</div>
			</div>

			<!-- Processing Time -->
			<div class="flex items-center gap-3">
				<div
					class="bg-accent-start/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
				>
					<Clock class="text-accent-start h-5 w-5" />
				</div>
				<div>
					<p class="text-surface-400 text-xs uppercase tracking-wide">Time</p>
					<p class="text-surface-100 text-lg font-bold">
						<AnimatedNumber value={processingTime} format={formatTime} duration={800} />
					</p>
					<p class="text-surface-500 text-xs">
						<AnimatedNumber value={avgTimePerImage} format={(n) => Math.round(n).toString()} />ms
						avg
					</p>
				</div>
			</div>

			<!-- Speed -->
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10"
				>
					<Zap class="h-5 w-5 text-amber-500" />
				</div>
				<div>
					<p class="text-surface-400 text-xs uppercase tracking-wide">Speed</p>
					<p class="text-surface-100 text-lg font-bold">
						<AnimatedNumber
							value={parseFloat(imagesPerSecond)}
							format={(n) => n.toFixed(1)}
							duration={800}
						/>
					</p>
					<p class="text-surface-500 text-xs">images/sec</p>
				</div>
			</div>

			<!-- Final Size -->
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/10"
				>
					<HardDrive class="h-5 w-5 text-blue-500" />
				</div>
				<div>
					<p class="text-surface-400 text-xs uppercase tracking-wide">Final Size</p>
					<p class="text-surface-100 text-lg font-bold">
						<AnimatedNumber value={totalCompressedSize} format={formatBytes} duration={800} />
					</p>
					<p class="text-surface-500 text-xs">from {formatBytes(totalOriginalSize)}</p>
				</div>
			</div>
		</div>

		<!-- Impact Metrics -->
		<div class="border-surface-700/50 border-t px-5 py-4">
			<h4 class="text-surface-300 mb-3 text-xs font-semibold uppercase tracking-wide">
				Real-World Impact
			</h4>
			<div class="mb-4 grid gap-3 sm:grid-cols-3">
				<div class="bg-surface-800/30 flex items-center gap-3 rounded-lg p-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
						<Gauge class="h-4 w-4 text-blue-400" />
					</div>
					<div>
						<p class="text-surface-100 text-sm font-semibold">~{secondsFaster}s</p>
						<p class="text-surface-500 text-[10px]">faster loads</p>
					</div>
				</div>

				<div class="bg-surface-800/30 flex items-center gap-3 rounded-lg p-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20">
						<TrendingDown class="h-4 w-4 text-green-400" />
					</div>
					<div>
						<p class="text-surface-100 text-sm font-semibold">Better SEO</p>
						<p class="text-surface-500 text-[10px]">Google loves it</p>
					</div>
				</div>

				<div class="bg-surface-800/30 flex items-center gap-3 rounded-lg p-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20">
						<Globe class="h-4 w-4 text-purple-400" />
					</div>
					<div>
						<p class="text-surface-100 text-sm font-semibold">~{co2Saved}g CO2</p>
						<p class="text-surface-500 text-[10px]">saved/1K views</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Download Buttons -->
		<div class="border-surface-700/50 border-t px-5 py-4">
			{#if fsapiSupported}
				<!-- Chrome: Show all three options -->
				<div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
					<button
						onclick={handleSaveToFolder}
						disabled={isSavingToFolder}
						class="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-blue-500/40 active:scale-95 disabled:opacity-50"
					>
						<FolderDown class="h-5 w-5" />
						{#if isSavingToFolder}
							{savingProgress}
						{:else}
							Save to Folder
						{/if}
					</button>

					<button
						onclick={handleDownloadAll}
						disabled={isSavingToFolder}
						class="bg-surface-800/50 border-surface-600 hover:bg-surface-700/50 hover:border-surface-500 text-surface-200 flex items-center justify-center gap-2 rounded-xl border-2 px-5 py-2.5 text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
					>
						<Download class="h-5 w-5" />
						Download ZIP
					</button>

					<button
						onclick={handleShare}
						disabled={isSavingToFolder}
						class="border-surface-600 hover:border-accent-start/50 hover:bg-accent-start/10 text-surface-200 flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
						title="Share your results"
					>
						<Share2 class="h-4 w-4" />
					</button>
				</div>

				<!-- Helpful hint -->
				<p class="text-surface-500 mt-2 text-center text-xs">
					Save to Folder writes files directly (faster for large batches)
				</p>
			{:else}
				<!-- Safari/Firefox: Show ZIP and Share -->
				<div class="flex justify-end gap-3">
					<button
						onclick={handleDownloadAll}
						class="from-accent-start to-accent-end shadow-accent-start/30 hover:shadow-accent-start/40 flex items-center gap-2 rounded-xl bg-gradient-to-r px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
					>
						<Download class="h-5 w-5" />
						Download All ({completedItems.length})
					</button>

					<button
						onclick={handleShare}
						class="border-surface-600 hover:border-accent-start/50 hover:bg-accent-start/10 text-surface-200 flex items-center justify-center rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all active:scale-95"
						title="Share your results"
					>
						<Share2 class="h-4 w-4" />
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
