<script lang="ts">
	import { pdfs, formatBytes, type PDFItem } from '$lib/stores/pdfs.svelte';
	import { downloadFile, getOutputFilename, processFiles } from '$lib/utils/pdf';
	import { downloadMultipleFiles } from '$lib/utils/download';
	import CompareSlider from './CompareSlider.svelte';
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
		ArrowRight
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
			const ext = pdfs.settings.tool === 'pdf-to-images' 
				? `.${pdfs.settings.imageFormat}` 
				: '.pdf';
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
			processedSize: undefined
		});
		// Trigger reprocessing
		processFiles();
	}
</script>

<div
	class="glass group relative rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/20"
	in:scale={{ duration: 200, start: 0.95 }}
	out:fade={{ duration: 150 }}
>
	<!-- Remove button -->
	<button
		onclick={handleRemove}
		class="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-surface-700 text-surface-400 opacity-0 shadow-lg transition-all hover:bg-red-500 hover:text-white group-hover:opacity-100"
		aria-label="Remove file"
	>
		<X class="h-3.5 w-3.5" />
	</button>

	<!-- Thumbnail / Icon -->
	<div class="relative w-full aspect-[4/3] overflow-hidden rounded-t-2xl bg-surface-800 flex items-center justify-center">
		{#if item.thumbnail}
			<img src={item.thumbnail} alt={item.name} class="h-full w-full object-contain" />
		{:else if item.isImage}
			<img src={item.originalUrl} alt={item.name} class="h-full w-full object-contain" />
		{:else}
			<div class="flex flex-col items-center gap-2 text-surface-500">
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
				<Loader2 class="h-8 w-8 text-white animate-spin mb-2" />
				<span class="text-white text-sm font-medium">{item.progress}%</span>
				{#if item.progressStage}
					<span class="text-white/60 text-xs mt-1">{item.progressStage}</span>
				{/if}
			</div>
		{/if}

		<!-- Status badge -->
		{#if item.status === 'completed' && item.processedSize}
			<div class="absolute top-2 right-2">
				{#if isPositiveSavings}
					<span class="flex items-center gap-1 rounded-full bg-green-500 px-2 py-1 text-xs font-bold text-white shadow-lg">
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
	<div class="p-3 sm:p-4 space-y-2">
		<!-- Filename -->
		<h3 class="text-sm font-medium text-surface-200 truncate" title={item.name}>
			{item.name}
		</h3>

		<!-- Size info -->
		<div class="flex items-center gap-2 text-xs text-surface-500">
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
						class="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
						title="Move up"
					>
						<ChevronUp class="h-4 w-4" />
					</button>
					<button
						onclick={handleMoveDown}
						disabled={index === pdfs.items.length - 1}
						class="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
						title="Move down"
					>
						<ChevronDown class="h-4 w-4" />
					</button>
					<span class="ml-auto text-xs text-surface-500">#{index + 1}</span>
				</div>
			{/if}

		{:else if item.status === 'processing'}
			<div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-700">
				<div
					class="h-full rounded-full bg-gradient-to-r from-accent-start to-accent-end transition-all duration-300"
					style="width: {item.progress}%"
				></div>
			</div>

		{:else if item.status === 'error'}
			<div class="space-y-2">
				<div class="flex items-start gap-1.5 text-xs text-red-400">
					<AlertCircle class="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
					<span class="break-words">{item.error || 'Processing failed'}</span>
				</div>
				<button
					onclick={handleRetry}
					class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
				>
					<RotateCcw class="h-3 w-3" />
					Retry
				</button>
			</div>

		{:else if item.status === 'completed'}
			<div class="space-y-3">
				<!-- Size comparison -->
				{#if showCompare && item.processedSize && pdfs.settings.tool === 'compress'}
					<CompareSlider 
						originalSize={item.originalSize} 
						newSize={item.processedSize} 
						label=""
					/>
				{/if}

				<div class="flex items-center justify-between">
					{#if item.processedBlobs}
						<span class="text-xs text-surface-400">
							{item.processedBlobs.length} files
						</span>
					{/if}
					<button
						onclick={handleDownload}
						class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-accent-start to-accent-end text-white hover:opacity-90 transition-opacity ml-auto"
					>
						<Download class="h-3.5 w-3.5" />
						Download
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
