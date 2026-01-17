<script lang="ts">
	import { pdfs, formatBytes, TOOLS } from '$lib/stores/pdfs.svelte';
	import { processFiles, downloadFile, getOutputFilename } from '$lib/utils/pdf';
	import { downloadMultipleFiles } from '$lib/utils/download';
	import PDFViewer from './PDFViewer.svelte';
	import DropZone from './DropZone.svelte';
	import ToolSelector from './ToolSelector.svelte';
	import BatchSummary from './BatchSummary.svelte';
	import {
		FileText,
		X,
		Download,
		Trash2,
		Play,
		Check,
		Loader2,
		AlertCircle,
		ChevronRight,
		Plus
	} from 'lucide-svelte';
	import { fade, fly, slide } from 'svelte/transition';

	// State
	let selectedItemId = $state<string | null>(null);
	let showDropZone = $state(false);
	let isProcessing = $state(false);

	// Derived
	const hasItems = $derived(pdfs.items.length > 0);
	const selectedItem = $derived(selectedItemId ? pdfs.items.find(i => i.id === selectedItemId) : null);
	const pendingCount = $derived(pdfs.items.filter(i => i.status === 'pending').length);
	const completedCount = $derived(pdfs.items.filter(i => i.status === 'completed').length);
	const processingCount = $derived(pdfs.items.filter(i => i.status === 'processing').length);
	const isAnyProcessing = $derived(pdfs.items.some(i => i.status === 'processing'));
	const totalItems = $derived(pdfs.items.length);
	
	// Batch progress calculation
	const batchProgress = $derived(() => {
		if (totalItems === 0) return 0;
		
		// Calculate overall progress across all items
		let totalProgress = 0;
		for (const item of pdfs.items) {
			if (item.status === 'completed' || item.status === 'error') {
				totalProgress += 100;
			} else if (item.status === 'processing') {
				totalProgress += item.progress || 0;
			}
			// pending items contribute 0
		}
		
		return Math.round(totalProgress / totalItems);
	});
	
	// Current processing item info
	const currentProcessingItem = $derived(pdfs.items.find(i => i.status === 'processing'));

	// Current tool info
	const currentTool = $derived(TOOLS.find(t => t.value === pdfs.settings.tool));
	const isSingleFileTool = $derived(
		!['merge', 'images-to-pdf'].includes(pdfs.settings.tool)
	);
	const needsViewer = $derived(
		['split', 'delete-pages', 'reorder', 'rotate', 'compress'].includes(pdfs.settings.tool)
	);

	// Auto-select first item when there's only one
	$effect(() => {
		if (hasItems && !selectedItemId && isSingleFileTool && pdfs.items.length === 1) {
			selectedItemId = pdfs.items[0].id;
		}
	});

	function selectItem(id: string) {
		selectedItemId = id;
	}

	function removeItem(id: string) {
		pdfs.removeItem(id);
		if (selectedItemId === id) {
			selectedItemId = pdfs.items.length > 0 ? pdfs.items[0].id : null;
		}
	}

	async function handleProcess() {
		if (isProcessing || isAnyProcessing) return;
		isProcessing = true;
		try {
			await processFiles();
		} finally {
			isProcessing = false;
		}
	}

	function handleDownload(item: typeof pdfs.items[0]) {
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

	function getStatusIcon(status: string) {
		switch (status) {
			case 'completed': return Check;
			case 'processing': return Loader2;
			case 'error': return AlertCircle;
			default: return FileText;
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'completed': return 'text-green-400';
			case 'processing': return 'text-accent-start';
			case 'error': return 'text-red-400';
			default: return 'text-surface-400';
		}
	}
</script>

<div class="h-full flex flex-col lg:flex-row gap-4">
	<!-- Left Panel: File List -->
	<div class="w-full lg:w-72 flex-shrink-0 flex flex-col glass rounded-2xl overflow-hidden">
		<!-- Header -->
		<div class="p-3 border-b border-surface-700/50">
			<div class="flex items-center justify-between mb-2">
				<h2 class="text-sm font-semibold text-surface-200">Files</h2>
				<span class="text-xs text-surface-500">{pdfs.items.length} file{pdfs.items.length !== 1 ? 's' : ''}</span>
			</div>
			
			<!-- Add more files button -->
			<button
				onclick={() => showDropZone = !showDropZone}
				class="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-surface-400 hover:text-surface-200 border border-dashed border-surface-700 hover:border-surface-500 rounded-lg transition-colors"
			>
				<Plus class="h-4 w-4" />
				Add Files
			</button>
		</div>

		<!-- Drop zone (collapsible) -->
		{#if showDropZone || !hasItems}
			<div class="p-3 border-b border-surface-700/50" transition:slide={{ duration: 200 }}>
				<DropZone />
			</div>
		{/if}

		<!-- File list -->
		<div class="flex-1 overflow-y-auto p-2 space-y-1" role="listbox" aria-label="File list">
			{#each pdfs.items as item (item.id)}
				{@const StatusIcon = getStatusIcon(item.status)}
				<div
					role="option"
					tabindex="0"
					aria-selected={selectedItemId === item.id}
					onclick={() => selectItem(item.id)}
					onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && selectItem(item.id)}
					class="w-full group relative flex items-center gap-3 p-2 rounded-lg transition-all text-left cursor-pointer
						{selectedItemId === item.id
							? 'bg-accent-start/20 border border-accent-start/30'
							: 'hover:bg-surface-800/50 border border-transparent'}"
				>
					<!-- Status icon -->
					<div class="flex-shrink-0 {getStatusColor(item.status)}">
						<StatusIcon class="h-4 w-4 {item.status === 'processing' ? 'animate-spin' : ''}" />
					</div>

					<!-- File info -->
					<div class="flex-1 min-w-0">
						<p class="text-sm text-surface-200 truncate" title={item.name}>{item.name}</p>
						<p class="text-xs text-surface-500">
							{formatBytes(item.originalSize)}
							{#if item.processedSize}
								<ChevronRight class="inline h-3 w-3" />
								<span class="{item.processedSize < item.originalSize ? 'text-green-400' : 'text-amber-400'}">
									{formatBytes(item.processedSize)}
								</span>
							{/if}
						</p>
					</div>

					<!-- Actions -->
					<div class="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
						{#if item.status === 'completed'}
							<button
								onclick={(e) => { e.stopPropagation(); handleDownload(item); }}
								class="p-1 text-surface-400 hover:text-green-400 transition-colors"
								title="Download"
								aria-label="Download {item.name}"
							>
								<Download class="h-3.5 w-3.5" />
							</button>
						{/if}
						<button
							onclick={(e) => { e.stopPropagation(); removeItem(item.id); }}
							class="p-1 text-surface-400 hover:text-red-400 transition-colors"
							title="Remove"
							aria-label="Remove {item.name}"
						>
							<X class="h-3.5 w-3.5" />
						</button>
					</div>
				</div>
			{/each}

			{#if !hasItems}
				<div class="flex flex-col items-center justify-center py-8 text-surface-500">
					<FileText class="h-8 w-8 mb-2" />
					<p class="text-sm">No files added</p>
				</div>
			{/if}
		</div>

		<!-- Batch Progress Bar (shown when processing multiple files) -->
		{#if isAnyProcessing && totalItems > 1}
			<div class="p-3 border-t border-surface-700/50 space-y-2" transition:slide={{ duration: 200 }}>
				<div class="flex items-center justify-between text-xs">
					<span class="text-surface-400">
						Processing {completedCount + processingCount} of {totalItems} files
					</span>
					<span class="font-medium text-accent-start">{batchProgress()}%</span>
				</div>
				<div class="h-2 bg-surface-800 rounded-full overflow-hidden">
					<div 
						class="h-full bg-gradient-to-r from-accent-start to-accent-end transition-all duration-300 ease-out"
						style="width: {batchProgress()}%"
					></div>
				</div>
				{#if currentProcessingItem}
					<p class="text-xs text-surface-500 truncate">
						{currentProcessingItem.progressStage || 'Processing'}: {currentProcessingItem.name}
					</p>
				{/if}
			</div>
		{/if}

		<!-- Process button -->
		{#if pendingCount > 0 && !isAnyProcessing}
			<div class="p-3 border-t border-surface-700/50">
				<button
					onclick={handleProcess}
					disabled={isProcessing || isAnyProcessing}
					class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-accent-start to-accent-end text-white shadow-lg shadow-accent-start/30 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
				>
					<Play class="h-4 w-4" fill="currentColor" />
					Process {pendingCount} File{pendingCount !== 1 ? 's' : ''}
				</button>
			</div>
		{/if}

		<!-- Batch summary -->
		{#if completedCount > 0}
			<div class="p-3 border-t border-surface-700/50">
				<BatchSummary compact={true} />
			</div>
		{/if}
	</div>

	<!-- Right Panel: Tool Settings + Viewer -->
	<div class="flex-1 flex flex-col gap-4 min-w-0">
		<!-- Tool Selector (compact) -->
		<div class="flex-shrink-0">
			<ToolSelector />
		</div>

		<!-- Main Content Area -->
		<div class="flex-1 min-h-0">
			{#if selectedItem && needsViewer && selectedItem.status !== 'completed'}
				<div class="h-full" transition:fade={{ duration: 200 }}>
					<PDFViewer 
						item={selectedItem}
						onClose={() => selectedItemId = null}
					/>
				</div>
			{:else if selectedItem?.status === 'completed'}
				<!-- Completed state -->
				<div class="h-full flex items-center justify-center glass rounded-2xl">
					<div class="text-center p-8">
						<div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
							<Check class="h-8 w-8 text-green-400" />
						</div>
						<h3 class="text-xl font-semibold text-surface-200 mb-2">Processing Complete</h3>
						<p class="text-surface-500 mb-6">
							{selectedItem.name}
							{#if selectedItem.processedSize}
								<br />
								<span class="{selectedItem.processedSize < selectedItem.originalSize ? 'text-green-400' : 'text-amber-400'}">
									{formatBytes(selectedItem.originalSize)} → {formatBytes(selectedItem.processedSize)}
								</span>
							{/if}
						</p>
						<button
							onclick={() => handleDownload(selectedItem)}
							class="flex items-center gap-2 mx-auto px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-accent-start to-accent-end text-white shadow-lg shadow-accent-start/30 hover:opacity-90 transition-all"
						>
							<Download class="h-4 w-4" />
							Download
						</button>
					</div>
				</div>
			{:else if !hasItems}
				<!-- Empty state -->
				<div class="h-full flex items-center justify-center glass rounded-2xl">
					<div class="text-center p-8 max-w-md">
						<FileText class="h-16 w-16 mx-auto mb-4 text-surface-600" />
						<h3 class="text-xl font-semibold text-surface-200 mb-2">
							{currentTool?.label || 'PDF Tools'}
						</h3>
						<p class="text-surface-500">
							{currentTool?.desc || 'Add PDF files to get started'}
						</p>
					</div>
				</div>
			{:else}
				<!-- Multi-file or non-viewer tool -->
				<div class="h-full glass rounded-2xl p-6 overflow-y-auto">
					<div class="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
						{#each pdfs.items as item, index (item.id)}
							<div 
								class="relative group rounded-xl overflow-hidden bg-surface-800/50 border border-surface-700 hover:border-surface-600 transition-all"
								class:ring-2={selectedItemId === item.id}
								class:ring-accent-start={selectedItemId === item.id}
							>
								<!-- Thumbnail area -->
								<div class="aspect-[4/3] bg-surface-900 flex items-center justify-center">
									{#if item.thumbnail}
										<img src={item.thumbnail} alt={item.name} class="w-full h-full object-contain" />
									{:else if item.isImage}
										<img src={item.originalUrl} alt={item.name} class="w-full h-full object-contain" />
									{:else}
										<FileText class="h-8 w-8 text-surface-600" />
									{/if}

									{#if item.status === 'processing'}
										<div class="absolute inset-0 bg-black/50 flex items-center justify-center">
											<Loader2 class="h-6 w-6 text-white animate-spin" />
										</div>
									{/if}

									{#if item.status === 'completed'}
										<div class="absolute top-2 right-2">
											<div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
												<Check class="h-4 w-4 text-white" />
											</div>
										</div>
									{/if}
								</div>

								<!-- Info -->
								<div class="p-2">
									<p class="text-xs text-surface-300 truncate" title={item.name}>{item.name}</p>
									<p class="text-[10px] text-surface-500">{formatBytes(item.originalSize)}</p>
								</div>

								<!-- Hover actions -->
								<div class="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
									<button
										onclick={() => removeItem(item.id)}
										class="p-1 bg-black/50 rounded text-white hover:bg-red-500 transition-colors"
										aria-label="Remove {item.name}"
									>
										<X class="h-3.5 w-3.5" />
									</button>
								</div>

								<!-- Order badge for merge -->
								{#if pdfs.settings.tool === 'merge' || pdfs.settings.tool === 'images-to-pdf'}
									<div class="absolute bottom-2 right-2 w-5 h-5 bg-accent-start rounded-full flex items-center justify-center text-[10px] font-bold text-white">
										{index + 1}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
