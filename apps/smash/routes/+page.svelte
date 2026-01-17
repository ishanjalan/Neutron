<script lang="ts">
	import { base } from '$app/paths';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import ToolSelector from '$lib/components/ToolSelector.svelte';
	import Workspace from '$lib/components/Workspace.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import KeyboardShortcuts from '$lib/components/KeyboardShortcuts.svelte';
	import Toast, { toast } from '$lib/components/Toast.svelte';
	import { pdfs, formatBytes, TOOLS, type PDFItem, type PDFTool } from '$lib/stores/pdfs.svelte';
	import { downloadAllAsZip } from '$lib/utils/download';
	import { onMount, onDestroy } from 'svelte';
	import {
		Shield,
		Zap,
		Sparkles,
		Minimize2,
		Layers,
		Scissors,
		RotateCw,
		Trash2,
		ArrowUpDown,
		Image,
		FileText,
		Hash,
		Stamp,
		Lock,
		Unlock,
		ArrowRight,
		Keyboard
	} from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';

	let showClearConfirm = $state(false);
	let showShortcuts = $state(false);
	let dropZoneRef: HTMLElement;

	// Undo support for clear all
	let deletedItems: PDFItem[] = $state([]);
	let undoTimeout: ReturnType<typeof setTimeout> | null = null;

	const hasItems = $derived(pdfs.items.length > 0);
	const hasUndownloaded = $derived(
		pdfs.items.some(i => i.status === 'completed' && (i.processedBlob || i.processedBlobs))
	);

	// Icon map for tools
	const iconMap: Record<string, typeof Minimize2> = {
		Minimize2,
		Layers,
		Scissors,
		Image,
		FileText,
		RotateCw,
		Trash2,
		ArrowUpDown,
		Hash,
		Stamp,
		Lock,
		Unlock
	};

	// Tool cards with gradients and popular flags
	const toolCards = [
		{
			value: 'compress' as PDFTool,
			title: 'Compress PDF',
			description: 'Reduce file size while keeping text sharp',
			icon: Minimize2,
			gradient: 'from-violet-500 to-purple-500',
			popular: true
		},
		{
			value: 'merge' as PDFTool,
			title: 'Merge PDFs',
			description: 'Combine multiple PDFs into one document',
			icon: Layers,
			gradient: 'from-blue-500 to-cyan-500',
			popular: true
		},
		{
			value: 'split' as PDFTool,
			title: 'Split PDF',
			description: 'Extract pages or split into multiple files',
			icon: Scissors,
			gradient: 'from-pink-500 to-rose-500',
			popular: true
		},
		{
			value: 'protect' as PDFTool,
			title: 'Protect PDF',
			description: 'Add AES-256 password encryption',
			icon: Lock,
			gradient: 'from-green-500 to-emerald-500',
			popular: false
		},
		{
			value: 'unlock' as PDFTool,
			title: 'Unlock PDF',
			description: 'Remove password protection',
			icon: Unlock,
			gradient: 'from-amber-500 to-orange-500',
			popular: false
		},
		{
			value: 'rotate' as PDFTool,
			title: 'Rotate Pages',
			description: 'Rotate PDF pages 90°, 180°, or 270°',
			icon: RotateCw,
			gradient: 'from-cyan-500 to-blue-500',
			popular: false
		},
		{
			value: 'delete-pages' as PDFTool,
			title: 'Delete Pages',
			description: 'Remove unwanted pages from your PDF',
			icon: Trash2,
			gradient: 'from-red-500 to-pink-500',
			popular: false
		},
		{
			value: 'reorder' as PDFTool,
			title: 'Reorder Pages',
			description: 'Drag and drop to rearrange pages',
			icon: ArrowUpDown,
			gradient: 'from-orange-500 to-red-500',
			popular: false
		},
		{
			value: 'pdf-to-images' as PDFTool,
			title: 'PDF to Images',
			description: 'Convert pages to PNG, JPG, or WebP',
			icon: Image,
			gradient: 'from-teal-500 to-green-500',
			popular: false
		},
		{
			value: 'images-to-pdf' as PDFTool,
			title: 'Images to PDF',
			description: 'Create a PDF from your images',
			icon: FileText,
			gradient: 'from-indigo-500 to-violet-500',
			popular: false
		},
		{
			value: 'add-page-numbers' as PDFTool,
			title: 'Page Numbers',
			description: 'Add page numbers to your document',
			icon: Hash,
			gradient: 'from-slate-500 to-gray-500',
			popular: false
		},
		{
			value: 'watermark' as PDFTool,
			title: 'Watermark',
			description: 'Add text watermark to all pages',
			icon: Stamp,
			gradient: 'from-fuchsia-500 to-purple-500',
			popular: false
		}
	];

	const features = [
		{
			icon: Zap,
			title: 'Lightning Fast',
			description: 'Instant processing with no uploads or wait times'
		},
		{
			icon: Shield,
			title: '100% Private',
			description: 'Your files never leave your computer'
		},
		{
			icon: Sparkles,
			title: 'All-in-One',
			description: 'Everything you need in one place'
		}
	];

	// Unsaved work warning
	function handleBeforeUnload(e: BeforeUnloadEvent) {
		if (hasUndownloaded) {
			e.preventDefault();
			return 'You have processed files that haven\'t been downloaded.';
		}
	}

	onMount(() => {
		window.addEventListener('beforeunload', handleBeforeUnload);
	});

	onDestroy(() => {
		window.removeEventListener('beforeunload', handleBeforeUnload);
		if (undoTimeout) clearTimeout(undoTimeout);
	});

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
		const completedItems = pdfs.items.filter(
			(i) => i.status === 'completed' && (i.processedBlob || i.processedBlobs)
		);
		if (completedItems.length > 0) {
			await downloadAllAsZip(completedItems, pdfs.settings.tool);
			showNotification(`Downloaded ${completedItems.length} files as ZIP`, 'success');
		}
	}

	// Clipboard paste support
	async function handlePaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items;
		if (!items) return;

		const files: File[] = [];
		for (const item of items) {
			if (item.type === 'application/pdf' || item.type.startsWith('image/')) {
				const file = item.getAsFile();
				if (file) {
					files.push(file);
				}
			}
		}

		if (files.length > 0) {
			await pdfs.addFiles(files);
			showNotification(`Added ${files.length} file(s) from clipboard`, 'success');
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

		if (e.key === '?') {
			e.preventDefault();
			showShortcuts = true;
			return;
		}

		if (e.key >= '1' && e.key <= '9') {
			e.preventDefault();
			const index = parseInt(e.key) - 1;
			if (index < TOOLS.length) {
				pdfs.setTool(TOOLS[index].value);
				showNotification(`Switched to ${TOOLS[index].label}`, 'info');
			}
			return;
		}

		if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
			e.preventDefault();
			handleDownloadAll();
			return;
		}

		if (e.key === 'Escape') {
			if (showClearConfirm) {
				showClearConfirm = false;
			} else if (showShortcuts) {
				showShortcuts = false;
			} else if (hasItems) {
				showClearConfirm = true;
			}
			return;
		}
	}

	function selectToolAndScroll(tool: PDFTool) {
		pdfs.setTool(tool);
		// Scroll to drop zone
		setTimeout(() => {
			dropZoneRef?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}, 100);
	}
</script>

<svelte:window onkeydown={handleKeydown} onpaste={handlePaste} />

<div class="flex min-h-screen flex-col">
	<Header />

	<!-- Background decoration -->
	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-accent-start/10 to-accent-end/10 blur-3xl"
		></div>
		<div
			class="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-accent-end/10 to-accent-start/10 blur-3xl"
		></div>
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-12">
		<div class="mx-auto max-w-6xl">
			{#if hasItems}
				<!-- Workspace Mode -->
				<div 
					class="h-[calc(100vh-180px)]"
					in:fade={{ duration: 200 }}
				>
					<Workspace />
				</div>
			{:else}
				<!-- Landing Mode -->
				
				<!-- Hero Section -->
				<div class="text-center mb-16" in:fade={{ duration: 300 }}>
					<div
						class="mb-4 inline-flex items-center gap-2 rounded-full bg-accent-start/10 px-4 py-1.5 text-sm font-medium text-accent-start"
					>
						<Sparkles class="h-4 w-4" />
						100% Free • Works Offline • No Account Needed
					</div>
					
					<h1 class="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
						<span class="text-surface-100">The</span> <span class="gradient-text">PDF toolkit</span>
						<br class="hidden sm:block" />
						<span class="text-surface-100">you actually want</span>
					</h1>
					
					<p class="mx-auto max-w-2xl text-lg text-surface-500 leading-relaxed">
						Compress, merge, split, protect, and convert PDFs with professional tools —
						all running locally in your browser. <span class="font-semibold text-surface-300">Fast. Private. Free.</span>
					</p>
				</div>

				<!-- Tool Cards -->
				<div class="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 mb-16">
					{#each toolCards as tool, i}
						<button
							onclick={() => selectToolAndScroll(tool.value)}
							class="group relative glass rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-accent-start/10 {pdfs.settings.tool === tool.value ? 'ring-2 ring-accent-start' : ''}"
							in:fly={{ y: 30, delay: 50 * i, duration: 400 }}
						>
							<!-- Popular badge -->
							{#if tool.popular}
								<div class="absolute -top-2 -right-2 rounded-full bg-gradient-to-r from-accent-start to-accent-end px-2.5 py-0.5 text-xs font-semibold text-white shadow-lg">
									Popular
								</div>
							{/if}

							<div class="flex items-start gap-4">
								<div
									class="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br {tool.gradient} shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
								>
									<tool.icon class="h-7 w-7 text-white" strokeWidth={2} />
								</div>
								
								<div class="flex-1 min-w-0">
									<h3 class="text-lg font-semibold text-surface-100 group-hover:text-white transition-colors flex items-center gap-2">
										{tool.title}
										<ArrowRight class="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent-start" />
									</h3>
									<p class="mt-1 text-sm text-surface-500 leading-relaxed">
										{tool.description}
									</p>
								</div>
							</div>
						</button>
					{/each}
				</div>

				<!-- Drop Zone Section -->
				<div class="mb-16" bind:this={dropZoneRef}>
					<div class="text-center mb-6">
						<h2 class="text-xl font-semibold text-surface-200 mb-2">
							Drop your files to get started
						</h2>
						<p class="text-sm text-surface-500">
							Currently selected: <span class="font-medium text-accent-start">{toolCards.find(t => t.value === pdfs.settings.tool)?.title}</span>
						</p>
					</div>
					<DropZone />
				</div>

				<!-- Features Section -->
				<div class="grid gap-6 sm:grid-cols-3 mb-16">
					{#each features as feature, i}
						<div
							class="text-center"
							in:fly={{ y: 20, delay: 400 + 100 * i, duration: 300 }}
						>
							<div
								class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-start/20 to-accent-end/20 text-accent-start"
							>
								<feature.icon class="h-6 w-6" />
							</div>
							<h3 class="text-base font-semibold text-surface-100">
								{feature.title}
							</h3>
							<p class="mt-1 text-sm text-surface-500">{feature.description}</p>
						</div>
					{/each}
				</div>

				<!-- Stats Bar -->
				<div class="glass rounded-2xl p-6" in:fade={{ delay: 600, duration: 300 }}>
					<div class="grid grid-cols-3 gap-6 text-center">
						<div>
							<p class="text-2xl font-bold text-surface-100">12</p>
							<p class="text-sm text-surface-500">Tools</p>
						</div>
						<div>
							<p class="text-2xl font-bold text-surface-100">Unlimited</p>
							<p class="text-sm text-surface-500">Files</p>
						</div>
						<div>
							<p class="text-2xl font-bold text-surface-100">Zero</p>
							<p class="text-sm text-surface-500">Data Collection</p>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</main>

	{#if !hasItems}
		<Footer />
	{/if}
</div>

<!-- Keyboard shortcut hint -->
<div class="fixed bottom-4 right-4 z-40">
	<button
		onclick={() => (showShortcuts = true)}
		class="glass flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-surface-500 hover:text-surface-300 transition-colors"
	>
		<Keyboard class="h-4 w-4" />
		<span class="hidden sm:inline">Press ? for shortcuts</span>
	</button>
</div>

<!-- Modals -->
<ConfirmModal
	bind:show={showClearConfirm}
	title="Clear all files?"
	message="This will remove all files from the list. You can undo this action within 5 seconds."
	confirmText="Clear All"
	onconfirm={() => {
		if (undoTimeout) clearTimeout(undoTimeout);
		deletedItems = pdfs.clearAllForUndo();
		
		toast.info(`Cleared ${deletedItems.length} files`, {
			duration: 5000,
			action: { 
				label: 'Undo', 
				onClick: () => {
					if (undoTimeout) clearTimeout(undoTimeout);
					pdfs.restoreItems(deletedItems);
					toast.success(`Restored ${deletedItems.length} files`);
					deletedItems = [];
				}
			}
		});
		
		undoTimeout = setTimeout(() => {
			deletedItems.forEach(item => {
				if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
				if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
			});
			deletedItems = [];
		}, 5000);
	}}
/>

<KeyboardShortcuts bind:show={showShortcuts} />

<Toast />
