<script lang="ts">
	import { pdfs, formatBytes, type PDFItem } from '$lib/stores/pdfs.svelte';
	import { downloadFile, getOutputFilename, processFiles } from '$lib/utils/pdf';
	import { downloadMultipleFiles } from '$lib/utils/download';
	import { CompareSlider } from '@neutron/ui';
	import {
		X,
		Download,
		FileText,
		Image,
		Loader2,
		Check,
		AlertCircle,
		RotateCcw,
		ChevronUp,
		ChevronDown,
		ArrowRight,
	} from 'lucide-svelte';
	import { scale, fade } from 'svelte/transition';

	interface Props {
		item: PDFItem;
		index: number;
		canReorder?: boolean;
		showCompare?: boolean;
	}

	let { item, index, canReorder = false, showCompare = false }: Props = $props();

	const savings = $derived(
		item.processedSize ? Math.round((1 - item.processedSize / item.originalSize) * 100) : 0
	);
	const isPositiveSavings = $derived(savings > 0);

	function handleRemove() {
		pdfs.removeItem(item.id);
	}

	function handleMoveUp() {
		if (index > 0) {
			pdfs.reorderItems(index, index - 1);
		}
	}

	function handleMoveDown() {
		if (index < pdfs.items.length - 1) {
			pdfs.reorderItems(index, index + 1);
		}
	}

	function handleDownload() {
		if (item.processedBlob) {
			const filename = getOutputFilename(item.name, pdfs.settings.tool);
			downloadFile(item.processedBlob, filename);
		} else if (item.processedBlobs && item.processedBlobs.length > 0) {
			const baseName = item.name.replace(/\.[^/.]+$/, '');
			const ext = pdfs.settings.tool === 'pdf-to-images' ? `.${pdfs.settings.imageFormat}` : '.pdf';
			downloadMultipleFiles(item.processedBlobs, baseName, ext);
		}
	}

	async function handleRetry() {
		pdfs.updateItem(item.id, {
			status: 'pending',
			progress: 0,
			error: undefined,
			processedBlob: undefined,
			processedBlobs: undefined,
			processedUrl: undefined,
			processedSize: undefined,
		});
		// Trigger reprocessing
		processFiles();
	}
</script>

<div
	class="glass group relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-black/20"
	in:scale={{ duration: 200, start: 0.95 }}
	out:fade={{ duration: 150 }}
>
	<!-- Remove button -->
	<button
		onclick={handleRemove}
		class="bg-surface-700 text-surface-400 absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full opacity-0 shadow-lg transition-all hover:bg-red-500 hover:text-white group-hover:opacity-100"
		aria-label="Remove file"
	>
		<X class="h-3.5 w-3.5" />
	</button>

	<!-- Thumbnail / Icon -->
	<div
		class="bg-surface-800 relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-t-2xl"
	>
		{#if item.thumbnail}
			<img src={item.thumbnail} alt={item.name} class="h-full w-full object-contain" />
		{:else if item.isImage}
			<img src={item.originalUrl} alt={item.name} class="h-full w-full object-contain" />
		{:else}
			<div class="text-surface-500 flex flex-col items-center gap-2">
				<FileText class="h-12 w-12" />
				{#if item.pageCount}
					<span class="text-xs">{item.pageCount} pages</span>
				{/if}
			</div>
		{/if}

		{#if item.status === 'processing'}
			<div
				class="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
			>
				<Loader2 class="mb-2 h-8 w-8 animate-spin text-white" />
				<span class="text-sm font-medium text-white">{item.progress}%</span>
				{#if item.progressStage}
					<span class="mt-1 text-xs text-white/60">{item.progressStage}</span>
				{/if}
			</div>
		{/if}

		<!-- Status badge -->
		{#if item.status === 'completed' && item.processedSize}
			<div class="absolute right-2 top-2">
				{#if isPositiveSavings}
					<span
						class="flex items-center gap-1 rounded-full bg-green-500 px-2 py-1 text-xs font-bold text-white shadow-lg"
					>
						<Check class="h-3 w-3" />
						-{savings}%
					</span>
				{:else}
					<span class="rounded-full bg-amber-500 px-2 py-1 text-xs font-bold text-white shadow-lg">
						+{Math.abs(savings)}%
					</span>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Info Section -->
	<div class="space-y-2 p-3 sm:p-4">
		<!-- Filename -->
		<h3 class="text-surface-200 truncate text-sm font-medium" title={item.name}>
			{item.name}
		</h3>

		<!-- Size info -->
		<div class="text-surface-500 flex items-center gap-2 text-xs">
			<span>{formatBytes(item.originalSize)}</span>
			{#if item.processedSize}
				<ArrowRight class="h-3 w-3" />
				<span class="text-accent-start font-medium">{formatBytes(item.processedSize)}</span>
			{/if}
		</div>

		<!-- Status-specific content -->
		{#if item.status === 'pending'}
			<!-- Reorder buttons for merge/images-to-pdf -->
			{#if canReorder}
				<div class="flex items-center gap-1">
					<button
						onclick={handleMoveUp}
						disabled={index === 0}
						class="text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
						title="Move up"
					>
						<ChevronUp class="h-4 w-4" />
					</button>
					<button
						onclick={handleMoveDown}
						disabled={index === pdfs.items.length - 1}
						class="text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
						title="Move down"
					>
						<ChevronDown class="h-4 w-4" />
					</button>
					<span class="text-surface-500 ml-auto text-xs">#{index + 1}</span>
				</div>
			{/if}
		{:else if item.status === 'processing'}
			<div class="bg-surface-700 h-1.5 w-full overflow-hidden rounded-full">
				<div
					class="from-accent-start to-accent-end h-full rounded-full bg-gradient-to-r transition-all duration-300"
					style="width: {item.progress}%"
				></div>
			</div>
		{:else if item.status === 'error'}
			<div class="space-y-2">
				<div class="flex items-start gap-1.5 text-xs text-red-400">
					<AlertCircle class="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
					<span class="break-words">{item.error || 'Processing failed'}</span>
				</div>
				<button
					onclick={handleRetry}
					class="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30"
				>
					<RotateCcw class="h-3 w-3" />
					Retry
				</button>
			</div>
		{:else if item.status === 'completed'}
			<div class="space-y-3">
				<!-- Size comparison -->
				{#if showCompare && item.processedSize && pdfs.settings.tool === 'compress'}
					<CompareSlider originalSize={item.originalSize} newSize={item.processedSize} label="" />
				{/if}

				<div class="flex items-center justify-between">
					{#if item.processedBlobs}
						<span class="text-surface-400 text-xs">
							{item.processedBlobs.length} files
						</span>
					{/if}
					<button
						onclick={handleDownload}
						class="from-accent-start to-accent-end ml-auto flex items-center gap-1.5 rounded-lg bg-gradient-to-r px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
					>
						<Download class="h-3.5 w-3.5" />
						Download
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
