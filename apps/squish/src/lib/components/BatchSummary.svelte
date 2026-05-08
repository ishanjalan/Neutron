<script lang="ts">
	import { images, formatBytes } from '$lib';
	import {
		downloadAllAsZip,
		isFileSystemAccessSupported,
		downloadWithFileSystemAPI,
	} from '$lib/utils/download';
	import { toast } from '@neutron/ui';
	import { AnimatedNumber } from '@neutron/ui';
	import { Download, Clock, Zap, HardDrive, TrendingDown, X, FolderDown } from 'lucide-svelte';
	import { scale, fade } from 'svelte/transition';

	let { onclose }: { onclose: () => void } = $props();

	const completedItems = $derived(images.items.filter((i) => i.status === 'completed'));
	const stats = $derived(images.batchStats);

	let isSavingToFolder = $state(false);
	let savingProgress = $state('');

	const fsapiSupported = $derived(isFileSystemAccessSupported());

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

	function formatTime(seconds: number): string {
		if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
		if (seconds < 60) return `${seconds.toFixed(1)}s`;
		const mins = Math.floor(seconds / 60);
		const secs = (seconds % 60).toFixed(0);
		return `${mins}m ${secs}s`;
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
		<!-- Header -->
		<div class="from-accent-start/20 to-accent-end/20 relative bg-gradient-to-r px-5 py-5">
			<button
				onclick={onclose}
				class="text-surface-400 hover:bg-surface-700 hover:text-surface-200 absolute top-4 right-4 rounded-lg p-2 transition-colors"
				aria-label="Dismiss summary"
			>
				<X class="h-5 w-5" />
			</button>

			<div class="text-center">
				<h3 class="text-surface-50 mb-1 text-xl font-bold">
					{completedItems.length}
					{completedItems.length === 1 ? 'image' : 'images'} optimized
				</h3>
				<p class="text-surface-300 text-sm">
					Saved <strong class="text-accent-start">{formatBytes(totalSaved)}</strong>
					({savingsPercent}% smaller)
				</p>
			</div>
		</div>

		<!-- Stats Grid -->
		<div class="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-500/10"
				>
					<TrendingDown class="h-5 w-5 text-green-500" />
				</div>
				<div>
					<p class="text-surface-400 text-xs tracking-wide uppercase">Saved</p>
					<p class="text-lg font-bold text-green-500">
						<AnimatedNumber value={totalSaved} format={formatBytes} duration={800} />
					</p>
					<p class="text-surface-500 text-xs">
						-<AnimatedNumber value={savingsPercent} format={(n) => Math.round(n).toString()} />%
					</p>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<div
					class="bg-accent-start/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
				>
					<Clock class="text-accent-start h-5 w-5" />
				</div>
				<div>
					<p class="text-surface-400 text-xs tracking-wide uppercase">Time</p>
					<p class="text-surface-100 text-lg font-bold">
						<AnimatedNumber value={processingTime} format={formatTime} duration={800} />
					</p>
					<p class="text-surface-500 text-xs">
						<AnimatedNumber value={avgTimePerImage} format={(n) => Math.round(n).toString()} />ms
						avg
					</p>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10"
				>
					<Zap class="h-5 w-5 text-amber-500" />
				</div>
				<div>
					<p class="text-surface-400 text-xs tracking-wide uppercase">Speed</p>
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

			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/10"
				>
					<HardDrive class="h-5 w-5 text-blue-500" />
				</div>
				<div>
					<p class="text-surface-400 text-xs tracking-wide uppercase">Final Size</p>
					<p class="text-surface-100 text-lg font-bold">
						<AnimatedNumber value={totalCompressedSize} format={formatBytes} duration={800} />
					</p>
					<p class="text-surface-500 text-xs">from {formatBytes(totalOriginalSize)}</p>
				</div>
			</div>
		</div>

		<!-- Download Buttons -->
		<div class="border-surface-700/50 border-t px-5 py-4">
			{#if fsapiSupported}
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
				</div>

				<p class="text-surface-500 mt-2 text-center text-xs">
					Save to Folder writes files directly (faster for large batches)
				</p>
			{:else}
				<div class="flex justify-end gap-3">
					<button
						onclick={handleDownloadAll}
						class="from-accent-start to-accent-end shadow-accent-start/30 hover:shadow-accent-start/40 flex items-center gap-2 rounded-xl bg-gradient-to-r px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
					>
						<Download class="h-5 w-5" />
						Download All ({completedItems.length})
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
