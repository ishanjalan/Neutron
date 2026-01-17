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
		Plus,
	} from 'lucide-svelte';
	import { fade, fly, slide } from 'svelte/transition';

	// State
	let selectedItemId = $state<string | null>(null);
	let showDropZone = $state(false);
	let isProcessing = $state(false);

	// Derived
	const hasItems = $derived(pdfs.items.length > 0);
	const selectedItem = $derived(
		selectedItemId ? pdfs.items.find((i) => i.id === selectedItemId) : null
	);
	const pendingCount = $derived(pdfs.items.filter((i) => i.status === 'pending').length);
	const completedCount = $derived(pdfs.items.filter((i) => i.status === 'completed').length);
	const processingCount = $derived(pdfs.items.filter((i) => i.status === 'processing').length);
	const isAnyProcessing = $derived(pdfs.items.some((i) => i.status === 'processing'));
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
	const currentProcessingItem = $derived(pdfs.items.find((i) => i.status === 'processing'));

	// Current tool info
	const currentTool = $derived(TOOLS.find((t) => t.value === pdfs.settings.tool));
	const isSingleFileTool = $derived(!['merge', 'images-to-pdf'].includes(pdfs.settings.tool));
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

	function handleDownload(item: (typeof pdfs.items)[0]) {
		if (item.processedBlob) {
			const filename = getOutputFilename(item.name, pdfs.settings.tool);
			downloadFile(item.processedBlob, filename);
		} else if (item.processedBlobs && item.processedBlobs.length > 0) {
			const baseName = item.name.replace(/\.[^/.]+$/, '');
			const ext = pdfs.settings.tool === 'pdf-to-images' ? `.${pdfs.settings.imageFormat}` : '.pdf';
			downloadMultipleFiles(item.processedBlobs, baseName, ext);
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'completed':
				return Check;
			case 'processing':
				return Loader2;
			case 'error':
				return AlertCircle;
			default:
				return FileText;
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'completed':
				return 'text-green-400';
			case 'processing':
				return 'text-accent-start';
			case 'error':
				return 'text-red-400';
			default:
				return 'text-surface-400';
		}
	}
</script>

<div class="flex h-full flex-col gap-4 lg:flex-row">
	<!-- Left Panel: File List -->
	<div class="glass flex w-full flex-shrink-0 flex-col overflow-hidden rounded-2xl lg:w-72">
		<!-- Header -->
		<div class="border-surface-700/50 border-b p-3">
			<div class="mb-2 flex items-center justify-between">
				<h2 class="text-surface-200 text-sm font-semibold">Files</h2>
				<span class="text-surface-500 text-xs"
					>{pdfs.items.length} file{pdfs.items.length !== 1 ? 's' : ''}</span
				>
			</div>

			<!-- Add more files button -->
			<button
				onclick={() => (showDropZone = !showDropZone)}
				class="text-surface-400 hover:text-surface-200 border-surface-700 hover:border-surface-500 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm transition-colors"
			>
				<Plus class="h-4 w-4" />
				Add Files
			</button>
		</div>

		<!-- Drop zone (collapsible) -->
		{#if showDropZone || !hasItems}
			<div class="border-surface-700/50 border-b p-3" transition:slide={{ duration: 200 }}>
				<DropZone />
			</div>
		{/if}

		<!-- File list -->
		<div class="flex-1 space-y-1 overflow-y-auto p-2" role="listbox" aria-label="File list">
			{#each pdfs.items as item (item.id)}
				{@const StatusIcon = getStatusIcon(item.status)}
				<div
					role="option"
					tabindex="0"
					aria-selected={selectedItemId === item.id}
					onclick={() => selectItem(item.id)}
					onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && selectItem(item.id)}
					class="group relative flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left transition-all
						{selectedItemId === item.id
						? 'bg-accent-start/20 border-accent-start/30 border'
						: 'hover:bg-surface-800/50 border border-transparent'}"
				>
					<!-- Status icon -->
					<div class="flex-shrink-0 {getStatusColor(item.status)}">
						<StatusIcon class="h-4 w-4 {item.status === 'processing' ? 'animate-spin' : ''}" />
					</div>

					<!-- File info -->
					<div class="min-w-0 flex-1">
						<p class="text-surface-200 truncate text-sm" title={item.name}>{item.name}</p>
						<p class="text-surface-500 text-xs">
							{formatBytes(item.originalSize)}
							{#if item.processedSize}
								<ChevronRight class="inline h-3 w-3" />
								<span
									class={item.processedSize < item.originalSize
										? 'text-green-400'
										: 'text-amber-400'}
								>
									{formatBytes(item.processedSize)}
								</span>
							{/if}
						</p>
					</div>

					<!-- Actions -->
					<div
						class="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
					>
						{#if item.status === 'completed'}
							<button
								onclick={(e) => {
									e.stopPropagation();
									handleDownload(item);
								}}
								class="text-surface-400 p-1 transition-colors hover:text-green-400"
								title="Download"
								aria-label="Download {item.name}"
							>
								<Download class="h-3.5 w-3.5" />
							</button>
						{/if}
						<button
							onclick={(e) => {
								e.stopPropagation();
								removeItem(item.id);
							}}
							class="text-surface-400 p-1 transition-colors hover:text-red-400"
							title="Remove"
							aria-label="Remove {item.name}"
						>
							<X class="h-3.5 w-3.5" />
						</button>
					</div>
				</div>
			{/each}

			{#if !hasItems}
				<div class="text-surface-500 flex flex-col items-center justify-center py-8">
					<FileText class="mb-2 h-8 w-8" />
					<p class="text-sm">No files added</p>
				</div>
			{/if}
		</div>

		<!-- Batch Progress Bar (shown when processing multiple files) -->
		{#if isAnyProcessing && totalItems > 1}
			<div
				class="border-surface-700/50 space-y-2 border-t p-3"
				transition:slide={{ duration: 200 }}
			>
				<div class="flex items-center justify-between text-xs">
					<span class="text-surface-400">
						Processing {completedCount + processingCount} of {totalItems} files
					</span>
					<span class="text-accent-start font-medium">{batchProgress()}%</span>
				</div>
				<div class="bg-surface-800 h-2 overflow-hidden rounded-full">
					<div
						class="from-accent-start to-accent-end h-full bg-gradient-to-r transition-all duration-300 ease-out"
						style="width: {batchProgress()}%"
					></div>
				</div>
				{#if currentProcessingItem}
					<p class="text-surface-500 truncate text-xs">
						{currentProcessingItem.progressStage || 'Processing'}: {currentProcessingItem.name}
					</p>
				{/if}
			</div>
		{/if}

		<!-- Process button -->
		{#if pendingCount > 0 && !isAnyProcessing}
			<div class="border-surface-700/50 border-t p-3">
				<button
					onclick={handleProcess}
					disabled={isProcessing || isAnyProcessing}
					class="from-accent-start to-accent-end shadow-accent-start/30 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<Play class="h-4 w-4" fill="currentColor" />
					Process {pendingCount} File{pendingCount !== 1 ? 's' : ''}
				</button>
			</div>
		{/if}

		<!-- Batch summary -->
		{#if completedCount > 0}
			<div class="border-surface-700/50 border-t p-3">
				<BatchSummary compact={true} />
			</div>
		{/if}
	</div>

	<!-- Right Panel: Tool Settings + Viewer -->
	<div class="flex min-w-0 flex-1 flex-col gap-4">
		<!-- Tool Selector (compact) -->
		<div class="flex-shrink-0">
			<ToolSelector />
		</div>

		<!-- Main Content Area -->
		<div class="min-h-0 flex-1">
			{#if selectedItem && needsViewer && selectedItem.status !== 'completed'}
				<div class="h-full" transition:fade={{ duration: 200 }}>
					<PDFViewer item={selectedItem} onClose={() => (selectedItemId = null)} />
				</div>
			{:else if selectedItem?.status === 'completed'}
				<!-- Completed state -->
				<div class="glass flex h-full items-center justify-center rounded-2xl">
					<div class="p-8 text-center">
						<div
							class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20"
						>
							<Check class="h-8 w-8 text-green-400" />
						</div>
						<h3 class="text-surface-200 mb-2 text-xl font-semibold">Processing Complete</h3>
						<p class="text-surface-500 mb-6">
							{selectedItem.name}
							{#if selectedItem.processedSize}
								<br />
								<span
									class={selectedItem.processedSize < selectedItem.originalSize
										? 'text-green-400'
										: 'text-amber-400'}
								>
									{formatBytes(selectedItem.originalSize)} → {formatBytes(
										selectedItem.processedSize
									)}
								</span>
							{/if}
						</p>
						<button
							onclick={() => handleDownload(selectedItem)}
							class="from-accent-start to-accent-end shadow-accent-start/30 mx-auto flex items-center gap-2 rounded-xl bg-gradient-to-r px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90"
						>
							<Download class="h-4 w-4" />
							Download
						</button>
					</div>
				</div>
			{:else if !hasItems}
				<!-- Empty state -->
				<div class="glass flex h-full items-center justify-center rounded-2xl">
					<div class="max-w-md p-8 text-center">
						<FileText class="text-surface-600 mx-auto mb-4 h-16 w-16" />
						<h3 class="text-surface-200 mb-2 text-xl font-semibold">
							{currentTool?.label || 'PDF Tools'}
						</h3>
						<p class="text-surface-500">
							{currentTool?.desc || 'Add PDF files to get started'}
						</p>
					</div>
				</div>
			{:else}
				<!-- Multi-file or non-viewer tool -->
				<div class="glass h-full overflow-y-auto rounded-2xl p-6">
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
						{#each pdfs.items as item, index (item.id)}
							<div
								class="bg-surface-800/50 border-surface-700 hover:border-surface-600 group relative overflow-hidden rounded-xl border transition-all"
								class:ring-2={selectedItemId === item.id}
								class:ring-accent-start={selectedItemId === item.id}
							>
								<!-- Thumbnail area -->
								<div class="bg-surface-900 flex aspect-[4/3] items-center justify-center">
									{#if item.thumbnail}
										<img
											src={item.thumbnail}
											alt={item.name}
											class="h-full w-full object-contain"
										/>
									{:else if item.isImage}
										<img
											src={item.originalUrl}
											alt={item.name}
											class="h-full w-full object-contain"
										/>
									{:else}
										<FileText class="text-surface-600 h-8 w-8" />
									{/if}

									{#if item.status === 'processing'}
										<div class="absolute inset-0 flex items-center justify-center bg-black/50">
											<Loader2 class="h-6 w-6 animate-spin text-white" />
										</div>
									{/if}

									{#if item.status === 'completed'}
										<div class="absolute right-2 top-2">
											<div
												class="flex h-6 w-6 items-center justify-center rounded-full bg-green-500"
											>
												<Check class="h-4 w-4 text-white" />
											</div>
										</div>
									{/if}
								</div>

								<!-- Info -->
								<div class="p-2">
									<p class="text-surface-300 truncate text-xs" title={item.name}>{item.name}</p>
									<p class="text-surface-500 text-[10px]">{formatBytes(item.originalSize)}</p>
								</div>

								<!-- Hover actions -->
								<div
									class="absolute left-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
								>
									<button
										onclick={() => removeItem(item.id)}
										class="rounded bg-black/50 p-1 text-white transition-colors hover:bg-red-500"
										aria-label="Remove {item.name}"
									>
										<X class="h-3.5 w-3.5" />
									</button>
								</div>

								<!-- Order badge for merge -->
								{#if pdfs.settings.tool === 'merge' || pdfs.settings.tool === 'images-to-pdf'}
									<div
										class="bg-accent-start absolute bottom-2 right-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
									>
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
