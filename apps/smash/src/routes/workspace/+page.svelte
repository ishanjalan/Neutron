<script lang="ts">
	import { onMount } from 'svelte';
	import { pdfs, formatBytes, TOOLS, type PDFItem } from '$lib/stores/pdfs.svelte';
	import { processFiles, downloadFile, getOutputFilename } from '$lib/utils/pdf';
	import { downloadAllAsZip } from '@neutron/utils';
	import PDFViewer from '$lib/components/PDFViewer.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import BatchSummary from '$lib/components/BatchSummary.svelte';
	import WorkspaceToolPanel from '$lib/components/WorkspaceToolPanel.svelte';
	import WorkspaceToolbar from '$lib/components/WorkspaceToolbar.svelte';
	import {
		FileText,
		X,
		Download,
		Plus,
		Check,
		Loader2,
		AlertCircle,
		ChevronRight,
		ChevronDown,
		Layers,
	} from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import { resolve } from '$app/paths';
	import { downloadMultipleFiles } from '$lib/utils/download';

	interface Props {
		data: { initialTool: string | null };
	}

	const { data }: Props = $props();

	let selectedItemId = $state<string | null>(null);
	let fileInput: HTMLInputElement;
	let showFileList = $state(false); // collapsible file list for multi-file tools

	const hasItems = $derived(pdfs.items.length > 0);
	const selectedItem = $derived(
		selectedItemId ? (pdfs.items.find((i) => i.id === selectedItemId) ?? null) : null
	);
	const pendingCount = $derived(pdfs.items.filter((i) => i.status === 'pending').length);
	const completedCount = $derived(pdfs.items.filter((i) => i.status === 'completed').length);
	const isAnyProcessing = $derived(pdfs.items.some((i) => i.status === 'processing'));
	const isSingleFileTool = $derived(!['merge', 'images-to-pdf'].includes(pdfs.settings.tool));
	const needsViewer = $derived(
		[
			'split',
			'delete-pages',
			'reorder',
			'rotate',
			'compress',
			'protect',
			'unlock',
			'ocr',
			'add-page-numbers',
			'watermark',
			'edit-metadata',
			'reverse-pages',
			'remove-blank-pages',
			'pdf-to-images',
		].includes(pdfs.settings.tool)
	);
	const currentTool = $derived(TOOLS.find((t) => t.value === pdfs.settings.tool));

	// Auto-select first item for single-file tools
	$effect(() => {
		if (hasItems && !selectedItemId && isSingleFileTool) {
			selectedItemId = pdfs.items[0].id;
		}
		// Clear selection if item no longer exists
		if (selectedItemId && !pdfs.items.find((i) => i.id === selectedItemId)) {
			selectedItemId = pdfs.items.length > 0 ? pdfs.items[0].id : null;
		}
	});

	// Set initial tool from URL param
	onMount(() => {
		if (data.initialTool) {
			pdfs.setTool(data.initialTool as any);
		}
	});

	function openFilePicker() {
		const accepts = currentTool?.accepts ?? '.pdf';
		fileInput.accept = accepts;
		fileInput.multiple = !isSingleFileTool || pdfs.settings.tool === 'compress';
		fileInput.click();
	}

	async function handleFileInputChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			await pdfs.addFiles(input.files);
		}
		input.value = '';
	}

	function removeItem(id: string) {
		pdfs.removeItem(id);
		if (selectedItemId === id) {
			selectedItemId = pdfs.items.length > 0 ? pdfs.items[0].id : null;
		}
	}

	function handleDownload(item: PDFItem) {
		if (item.processedBlob) {
			const filename = getOutputFilename(item.name, pdfs.settings.tool);
			downloadFile(item.processedBlob, filename);
		} else if (item.processedBlobs && item.processedBlobs.length > 0) {
			const baseName = item.name.replace(/\.[^/.]+$/, '');
			const ext = pdfs.settings.tool === 'pdf-to-images' ? `.${pdfs.settings.imageFormat}` : '.pdf';
			downloadMultipleFiles(item.processedBlobs, baseName, ext);
		}
	}

	async function handleDownloadAll() {
		const completed = pdfs.items.filter((i) => i.status === 'completed' && i.processedBlob);
		if (completed.length === 0) return;
		if (completed.length === 1) {
			handleDownload(completed[0]);
			return;
		}
		const files = completed.map((item) => ({
			blob: item.processedBlob!,
			name: getOutputFilename(item.name, pdfs.settings.tool),
		}));
		await downloadAllAsZip(files, 'smash-output.zip');
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

<!-- Hidden file input -->
<input bind:this={fileInput} type="file" class="hidden" onchange={handleFileInputChange} />

<div class="bg-surface-950 flex h-screen flex-col overflow-hidden">
	<!-- ── Top bar ── -->
	<header
		class="bg-surface-900/80 border-surface-800 flex h-12 flex-shrink-0 items-center justify-between border-b px-4"
	>
		<div class="flex items-center gap-3">
			<!-- Logo -->
			<a href={resolve('/')} class="flex items-center gap-2">
				<div
					class="from-accent-start to-accent-end flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br shadow-sm"
				>
					<FileText class="h-4 w-4 text-white" />
				</div>
				<span class="text-surface-200 text-sm font-bold">Smash</span>
			</a>

			<!-- Active tool badge -->
			{#if currentTool}
				<div class="text-surface-600">›</div>
				<span class="text-surface-400 text-xs">{currentTool.label}</span>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			<!-- File count -->
			{#if hasItems}
				<span class="text-surface-500 text-xs"
					>{pdfs.items.length} file{pdfs.items.length !== 1 ? 's' : ''}</span
				>
			{/if}

			<!-- Open file -->
			<button
				onclick={openFilePicker}
				class="text-surface-300 hover:text-surface-100 hover:bg-surface-800 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
			>
				<Plus class="h-3.5 w-3.5" />
				Open
			</button>

			<!-- Download -->
			{#if completedCount > 0}
				<button
					onclick={handleDownloadAll}
					class="from-accent-start to-accent-end flex items-center gap-1.5 rounded-lg bg-gradient-to-r px-3 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90"
				>
					<Download class="h-3.5 w-3.5" />
					Download{completedCount > 1 ? ` (${completedCount})` : ''}
				</button>
			{/if}

			<!-- Clear all -->
			{#if hasItems}
				<button
					onclick={() => {
						pdfs.clearAll();
						selectedItemId = null;
					}}
					class="text-surface-500 hover:text-surface-300 hover:bg-surface-800 rounded-lg p-1.5 transition-colors"
					title="Clear all files"
				>
					<X class="h-3.5 w-3.5" />
				</button>
			{/if}
		</div>
	</header>

	<!-- ── Main content ── -->
	<div class="flex min-h-0 flex-1">
		<!-- ═══ Left/Center: PDF Viewer or File Grid or Empty State ═══ -->
		<div class="flex min-w-0 flex-1 flex-col overflow-hidden">
			<!-- Multi-file tool: show file list with thumbnails -->
			{#if !isSingleFileTool && hasItems}
				<!-- Collapsible file list header -->
				<div class="border-surface-800 bg-surface-900/60 border-b px-4 py-2">
					<button
						onclick={() => (showFileList = !showFileList)}
						class="text-surface-400 hover:text-surface-200 flex items-center gap-2 text-xs font-medium transition-colors"
					>
						<Layers class="h-3.5 w-3.5" />
						{pdfs.items.length} file{pdfs.items.length !== 1 ? 's' : ''}
						<ChevronDown
							class="h-3.5 w-3.5 transition-transform {showFileList ? 'rotate-180' : ''}"
						/>
					</button>
				</div>

				{#if showFileList}
					<div class="border-surface-800 border-b p-3" transition:fly={{ y: -8, duration: 150 }}>
						<div class="flex flex-wrap gap-2">
							{#each pdfs.items as item (item.id)}
								<div
									class="bg-surface-800/80 border-surface-700 flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs"
								>
									{#if item.thumbnail}
										<img src={item.thumbnail} alt="" class="h-6 w-5 rounded object-cover" />
									{:else}
										<FileText class="text-surface-500 h-4 w-4" />
									{/if}
									<span class="text-surface-300 max-w-[120px] truncate" title={item.name}
										>{item.name}</span
									>
									<button
										onclick={() => removeItem(item.id)}
										class="text-surface-500 transition-colors hover:text-red-400"
										aria-label="Remove {item.name}"
									>
										<X class="h-3 w-3" />
									</button>
								</div>
							{/each}
							<button
								onclick={openFilePicker}
								class="border-surface-600 text-surface-500 hover:text-surface-300 hover:border-surface-500 flex items-center gap-1 rounded-lg border border-dashed px-2 py-1.5 text-xs transition-colors"
							>
								<Plus class="h-3.5 w-3.5" />
								Add
							</button>
						</div>
					</div>
				{/if}

				<!-- Multi-file empty/ready area -->
				<div class="flex flex-1 items-center justify-center p-8">
					<div class="max-w-sm text-center">
						<div
							class="bg-accent-start/10 border-accent-start/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border"
						>
							<Layers class="text-accent-start h-8 w-8" />
						</div>
						<h3 class="text-surface-200 mb-2 text-lg font-semibold">{currentTool?.label}</h3>
						<p class="text-surface-500 mb-6 text-sm">
							{pdfs.items.length} file{pdfs.items.length !== 1 ? 's' : ''} ready.
							{#if pdfs.settings.tool === 'merge'}
								Files will be merged in the order shown above.
							{:else if pdfs.settings.tool === 'images-to-pdf'}
								Images will become pages in the order shown above.
							{/if}
						</p>
					</div>
				</div>

				<!-- Single-file tool with a selected item to view -->
			{:else if selectedItem && needsViewer}
				<div class="flex-1 overflow-hidden" transition:fade={{ duration: 150 }}>
					<PDFViewer item={selectedItem} />
				</div>

				<!-- Completed single item -->
			{:else if selectedItem?.status === 'completed'}
				<div
					class="flex flex-1 items-center justify-center p-8"
					transition:fade={{ duration: 150 }}
				>
					<div class="text-center">
						<div
							class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20"
						>
							<Check class="h-8 w-8 text-green-400" />
						</div>
						<h3 class="text-surface-200 mb-2 text-xl font-semibold">Done</h3>
						<p class="text-surface-400 mb-1 text-sm">{selectedItem.name}</p>
						{#if selectedItem.processedSize}
							<p class="text-surface-500 mb-6 text-xs">
								{formatBytes(selectedItem.originalSize)}
								<ChevronRight class="inline h-3 w-3" />
								<span
									class={selectedItem.processedSize < selectedItem.originalSize
										? 'text-green-400'
										: 'text-amber-400'}
								>
									{formatBytes(selectedItem.processedSize)}
								</span>
							</p>
						{/if}
						<button
							onclick={() => handleDownload(selectedItem)}
							class="from-accent-start to-accent-end shadow-accent-start/30 mx-auto flex items-center gap-2 rounded-xl bg-gradient-to-r px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90"
						>
							<Download class="h-4 w-4" />
							Download
						</button>
					</div>
				</div>

				<!-- Processing -->
			{:else if selectedItem?.status === 'processing'}
				<div class="flex flex-1 items-center justify-center p-8">
					<div class="text-center">
						<Loader2 class="text-accent-start mx-auto mb-4 h-10 w-10 animate-spin" />
						<p class="text-surface-300 text-sm font-medium">
							{selectedItem.progressStage ?? 'Processing'}…
						</p>
						{#if selectedItem.progress > 0}
							<div class="bg-surface-800 mx-auto mt-4 h-2 w-48 overflow-hidden rounded-full">
								<div
									class="from-accent-start to-accent-end h-full bg-gradient-to-r transition-all"
									style="width: {selectedItem.progress}%"
								></div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Error -->
			{:else if selectedItem?.status === 'error'}
				<div class="flex flex-1 items-center justify-center p-8">
					<div class="text-center">
						<AlertCircle class="mx-auto mb-4 h-10 w-10 text-red-400" />
						<p class="text-surface-200 mb-2 text-sm font-medium">Processing failed</p>
						<p class="text-surface-500 mb-4 max-w-xs text-xs">{selectedItem.error}</p>
					</div>
				</div>

				<!-- Empty state (no files) -->
			{:else}
				<div
					class="flex flex-1 flex-col items-center justify-center p-8"
					transition:fade={{ duration: 200 }}
				>
					<div class="w-full max-w-md">
						<DropZone />
					</div>
					{#if !hasItems}
						<p class="text-surface-600 mt-4 text-xs">
							All processing happens locally — files never leave your device
						</p>
					{/if}
				</div>
			{/if}

			<!-- File list strip for single-file tools (when multiple pending files exist) -->
			{#if isSingleFileTool && pdfs.items.length > 1}
				<div
					class="border-surface-800 bg-surface-900/60 flex h-14 flex-shrink-0 items-center gap-2 overflow-x-auto border-t px-4"
				>
					{#each pdfs.items as item (item.id)}
						<button
							onclick={() => {
								selectedItemId = item.id;
							}}
							class="flex flex-shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-all
								{selectedItemId === item.id
								? 'bg-accent-start/20 border-accent-start/30 text-surface-200 border'
								: 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'}"
						>
							{#if item.status === 'completed'}
								<Check class="h-3 w-3 text-green-400" />
							{:else if item.status === 'processing'}
								<Loader2 class="text-accent-start h-3 w-3 animate-spin" />
							{:else if item.status === 'error'}
								<AlertCircle class="h-3 w-3 text-red-400" />
							{:else}
								<FileText class="h-3 w-3 {getStatusColor(item.status)}" />
							{/if}
							<span class="max-w-[140px] truncate" title={item.name}>{item.name}</span>
						</button>
					{/each}
					<button
						onclick={openFilePicker}
						class="text-surface-500 hover:text-surface-300 flex flex-shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors"
					>
						<Plus class="h-3.5 w-3.5" />
						Add
					</button>
				</div>
			{/if}

			<!-- Batch summary when completed -->
			{#if completedCount > 1}
				<div class="border-surface-800 border-t p-3">
					<BatchSummary compact={true} />
				</div>
			{/if}
		</div>

		<!-- ═══ Right: Tool Panel ═══ -->
		<div
			class="border-surface-800 bg-surface-900/40 flex w-72 flex-shrink-0 flex-col overflow-hidden border-l"
		>
			<WorkspaceToolPanel />
		</div>
	</div>

	<!-- ── Bottom toolbar ── -->
	<div class="border-surface-800 h-14 flex-shrink-0 border-t">
		<WorkspaceToolbar />
	</div>
</div>
