<script lang="ts">
	import { onMount } from 'svelte';
	import { pdfs, formatBytes, TOOLS, type PDFItem } from '$lib/stores/pdfs.svelte';
	import { processFiles, downloadFile, getOutputFilename } from '$lib/utils/pdf';
	import { downloadAllAsZip } from '@neutron/utils';
	import PDFViewer from '$lib/components/PDFViewer.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import WorkspaceToolPanel from '$lib/components/WorkspaceToolPanel.svelte';
	import WorkspaceToolbar from '$lib/components/WorkspaceToolbar.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import {
		FileText,
		X,
		Download,
		Plus,
		Check,
		Loader2,
		AlertCircle,
		ChevronRight,
		Layers,
	} from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import { resolve } from '$app/paths';
	import { downloadMultipleFiles } from '$lib/utils/download';

	interface Props {
		data: { initialTool: string | null };
	}

	const { data }: Props = $props();

	let selectedItemId = $state<string | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);
	let commandPaletteOpen = $state(false);

	const hasItems = $derived(pdfs.items.length > 0);
	const selectedItem = $derived(
		selectedItemId ? (pdfs.items.find((i) => i.id === selectedItemId) ?? null) : null
	);
	const pendingCount = $derived(pdfs.items.filter((i) => i.status === 'pending').length);
	const completedCount = $derived(pdfs.items.filter((i) => i.status === 'completed').length);
	const isAnyProcessing = $derived(pdfs.items.some((i) => i.status === 'processing'));
	const isSingleFileTool = $derived(!['merge', 'images-to-pdf'].includes(pdfs.settings.tool));
	const currentTool = $derived(TOOLS.find((t) => t.value === pdfs.settings.tool));

	// Auto-select first item
	$effect(() => {
		if (hasItems && !selectedItemId) {
			selectedItemId = pdfs.items[0].id;
		}
		if (selectedItemId && !pdfs.items.find((i) => i.id === selectedItemId)) {
			selectedItemId = pdfs.items.length > 0 ? pdfs.items[0].id : null;
		}
	});

	onMount(() => {
		if (data.initialTool) {
			pdfs.setTool(data.initialTool as any);
		}
	});

	function openFilePicker() {
		if (!fileInput) return;
		fileInput.accept = currentTool?.accepts ?? '.pdf';
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

	function handleDownload(item: PDFItem) {
		if (item.processedBlob) {
			downloadFile(item.processedBlob, getOutputFilename(item.name, pdfs.settings.tool));
		} else if (item.processedBlobs?.length) {
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
</script>

<!-- Hidden file input -->
<input bind:this={fileInput} type="file" class="hidden" onchange={handleFileInputChange} />

<svelte:window
	onkeydown={(e) => {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			commandPaletteOpen = true;
		}
	}}
/>

<CommandPalette
	open={commandPaletteOpen}
	onClose={() => (commandPaletteOpen = false)}
	onDownload={handleDownloadAll}
	onClear={() => {
		pdfs.clearAll();
		selectedItemId = null;
	}}
	onOpenFile={openFilePicker}
/>

<div class="bg-surface-950 flex h-screen flex-col overflow-hidden">

	<!-- ── Title bar ── -->
	<header class="bg-surface-900 border-surface-800 flex h-11 flex-shrink-0 items-center justify-between border-b px-3">
		<div class="flex items-center gap-2.5">
			<a href={resolve('/')} class="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
				<div class="from-accent-start to-accent-end flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br">
					<FileText class="h-3.5 w-3.5 text-white" />
				</div>
				<span class="text-surface-300 text-sm font-semibold">Smash</span>
			</a>
			{#if selectedItem}
				<span class="text-surface-700">·</span>
				<span class="text-surface-500 max-w-[200px] truncate text-xs" title={selectedItem.name}>{selectedItem.name}</span>
			{/if}
		</div>

		<div class="flex items-center gap-1.5">
			<!-- Keyboard shortcut hint -->
			<button
				onclick={() => (commandPaletteOpen = true)}
				class="text-surface-600 hover:text-surface-400 hover:bg-surface-800 rounded px-1.5 py-1 font-mono text-[10px] transition-colors"
				title="Command palette"
			>⌘K</button>

			<!-- Add file -->
			<button
				onclick={openFilePicker}
				class="text-surface-400 hover:text-surface-200 hover:bg-surface-800 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
			>
				<Plus class="h-3.5 w-3.5" />
				Open
			</button>

			<!-- Download — prominent when something is ready -->
			{#if completedCount > 0}
				<button
					onclick={handleDownloadAll}
					class="from-accent-start to-accent-end flex items-center gap-1.5 rounded-lg bg-gradient-to-r px-3 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90"
				>
					<Download class="h-3.5 w-3.5" />
					Download{completedCount > 1 ? ` (${completedCount})` : ''}
				</button>
			{/if}

			{#if hasItems}
				<button
					onclick={() => { pdfs.clearAll(); selectedItemId = null; }}
					class="text-surface-600 hover:text-surface-400 hover:bg-surface-800 rounded-lg p-1.5 transition-colors"
					title="Close document"
				>
					<X class="h-3.5 w-3.5" />
				</button>
			{/if}
		</div>
	</header>

	<!-- ── Tool toolbar ── -->
	<div class="bg-surface-900/60 border-surface-800 h-[52px] flex-shrink-0 border-b">
		<WorkspaceToolbar />
	</div>

	<!-- ── Main content ── -->
	<div class="flex min-h-0 flex-1 overflow-hidden">

		{#if !hasItems}
			<!-- Empty state: centred drop zone -->
			<div class="flex flex-1 flex-col items-center justify-center p-12" transition:fade={{ duration: 200 }}>
				<div class="w-full max-w-sm">
					<DropZone />
				</div>
				<p class="text-surface-600 mt-5 text-xs">All processing happens locally — files never leave your device</p>
			</div>

		{:else if !isSingleFileTool}
			<!-- Merge / Images-to-PDF: file list -->
			<div class="flex flex-1 flex-col overflow-hidden">
				<div class="border-surface-800/60 bg-surface-900/40 flex-1 overflow-y-auto p-4">
					<div class="mx-auto max-w-md space-y-2">
						<p class="text-surface-500 mb-4 text-xs">
							{#if pdfs.settings.tool === 'merge'}Files will be merged in this order.{:else}Images will become pages in this order.{/if}
						</p>
						{#each pdfs.items as item (item.id)}
							<div class="bg-surface-800/60 border-surface-700/60 flex items-center gap-3 rounded-xl border px-3 py-2.5">
								<FileText class="text-surface-500 h-4 w-4 flex-shrink-0" />
								<span class="text-surface-300 flex-1 truncate text-sm">{item.name}</span>
								<span class="text-surface-600 text-xs">{formatBytes(item.originalSize)}</span>
								<button
									onclick={() => pdfs.removeItem(item.id)}
									class="text-surface-600 hover:text-red-400 rounded p-0.5 transition-colors"
									aria-label="Remove"
								><X class="h-3.5 w-3.5" /></button>
							</div>
						{/each}
						<button
							onclick={openFilePicker}
							class="border-surface-700 text-surface-600 hover:text-surface-400 hover:border-surface-500 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm transition-colors"
						>
							<Plus class="h-4 w-4" />
							Add files
						</button>
					</div>
				</div>
			</div>

		{:else if selectedItem}
			<!-- Single-file view: always show the viewer -->
			<div class="flex min-w-0 flex-1 flex-col overflow-hidden">

				<!-- Processing / completion banner (non-blocking) -->
				{#if selectedItem.status === 'processing'}
					<div class="bg-surface-800/80 border-surface-700/50 border-b px-4 py-2 flex items-center gap-3">
						<Loader2 class="text-accent-start h-3.5 w-3.5 animate-spin flex-shrink-0" />
						<span class="text-surface-300 text-xs">{selectedItem.progressStage ?? 'Processing'}…</span>
						{#if selectedItem.progress > 0}
							<div class="bg-surface-700 h-1 flex-1 overflow-hidden rounded-full">
								<div class="from-accent-start to-accent-end h-full bg-gradient-to-r transition-all" style="width: {selectedItem.progress}%"></div>
							</div>
						{/if}
					</div>
				{:else if selectedItem.status === 'completed'}
					<div class="bg-green-500/10 border-green-500/20 border-b px-4 py-2 flex items-center gap-3">
						<Check class="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
						<span class="text-green-300 text-xs font-medium">Done</span>
						{#if selectedItem.processedSize}
							<span class="text-surface-500 text-xs">
								{formatBytes(selectedItem.originalSize)}
								<ChevronRight class="inline h-3 w-3" />
								<span class={selectedItem.processedSize < selectedItem.originalSize ? 'text-green-400' : 'text-amber-400'}>
									{formatBytes(selectedItem.processedSize)}
								</span>
							</span>
						{/if}
						<div class="flex-1"></div>
						<button
							onclick={() => handleDownload(selectedItem)}
							class="from-accent-start to-accent-end flex items-center gap-1.5 rounded-lg bg-gradient-to-r px-3 py-1 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
						>
							<Download class="h-3 w-3" />
							Download
						</button>
					</div>
				{:else if selectedItem.status === 'error'}
					<div class="bg-red-500/10 border-red-500/20 border-b px-4 py-2 flex items-center gap-3">
						<AlertCircle class="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
						<span class="text-red-300 text-xs">{selectedItem.error ?? 'Processing failed'}</span>
					</div>
				{/if}

				<!-- PDF Viewer fills remaining space -->
				<div class="flex-1 overflow-hidden">
					<PDFViewer
						file={selectedItem.file}
						selectionMode={['split', 'delete-pages', 'reorder', 'rotate'].includes(pdfs.settings.tool)}
						allowMultiSelect={['split', 'delete-pages', 'rotate'].includes(pdfs.settings.tool)}
						onFileChange={(newFile) => pdfs.updateItem(selectedItem.id, { file: newFile, originalUrl: URL.createObjectURL(newFile) })}
						onSelectionChange={(pages) => pdfs.updateItem(selectedItem.id, { selectedPages: pages })}
					/>
				</div>

				<!-- File tab strip (multiple files) -->
				{#if pdfs.items.length > 1}
					<div class="border-surface-800 bg-surface-900/80 flex h-10 flex-shrink-0 items-center gap-1 overflow-x-auto border-t px-2">
						{#each pdfs.items as item (item.id)}
							<button
								onclick={() => (selectedItemId = item.id)}
								class="flex flex-shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-all
									{selectedItemId === item.id
									? 'bg-surface-700 text-surface-100'
									: 'text-surface-500 hover:text-surface-300 hover:bg-surface-800/60'}"
							>
								{#if item.status === 'completed'}
									<Check class="h-2.5 w-2.5 text-green-400" />
								{:else if item.status === 'processing'}
									<Loader2 class="text-accent-start h-2.5 w-2.5 animate-spin" />
								{:else if item.status === 'error'}
									<AlertCircle class="h-2.5 w-2.5 text-red-400" />
								{:else}
									<FileText class="text-surface-600 h-2.5 w-2.5" />
								{/if}
								<span class="max-w-[120px] truncate">{item.name}</span>
							</button>
						{/each}
						<button
							onclick={openFilePicker}
							class="text-surface-600 hover:text-surface-400 ml-1 flex flex-shrink-0 items-center gap-1 rounded px-1.5 py-1 text-xs transition-colors"
						>
							<Plus class="h-3 w-3" />
						</button>
					</div>
				{/if}
			</div>
		{/if}

		<!-- ── Right: Inspector ── -->
		{#if hasItems}
			<div class="border-surface-800 bg-surface-900/30 flex w-64 flex-shrink-0 flex-col overflow-hidden border-l">
				<WorkspaceToolPanel />
			</div>
		{/if}
	</div>
</div>
