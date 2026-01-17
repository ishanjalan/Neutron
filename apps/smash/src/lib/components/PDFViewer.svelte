<script lang="ts">
	import { pdfs, formatBytes, type PDFItem } from '$lib/stores/pdfs.svelte';
	import * as pdfjsLib from 'pdfjs-dist';
	import {
		ZoomIn,
		ZoomOut,
		ChevronLeft,
		ChevronRight,
		Grid3X3,
		List,
		Check,
		X,
		Loader2,
		FileText,
		ChevronsLeft,
		ChevronsRight,
		Sidebar,
	} from 'lucide-svelte';
	import { onMount, onDestroy, tick } from 'svelte';
	import { fly } from 'svelte/transition';

	interface Props {
		item: PDFItem;
		onClose?: () => void;
	}

	const { item, onClose }: Props = $props();

	// Constants
	const THUMBNAILS_PER_PAGE = 50; // Pagination for thumbnail grid
	const THUMBNAIL_BATCH_SIZE = 20; // How many thumbnails to load at once

	// View state
	let currentPage = $state(1);
	let totalPages = $state(0);
	let zoom = $state(1);
	let viewMode = $state<'single' | 'thumbnails'>('single');
	let selectedPages = $state<Set<number>>(new Set());
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let sidebarVisible = $state(true);

	// Pagination for thumbnail grid
	let thumbnailPage = $state(0);
	const totalThumbnailPages = $derived(Math.ceil(totalPages / THUMBNAILS_PER_PAGE));
	const thumbnailStartPage = $derived(thumbnailPage * THUMBNAILS_PER_PAGE + 1);
	const thumbnailEndPage = $derived(
		Math.min((thumbnailPage + 1) * THUMBNAILS_PER_PAGE, totalPages)
	);

	// Page data - only store loaded thumbnails
	let thumbnailCache = $state<Map<number, string>>(new Map());
	let currentPageCanvas = $state<string | null>(null);
	let pageWidth = $state(0);
	let pageHeight = $state(0);

	// Track which thumbnails are currently loading
	let loadingThumbnails = $state<Set<number>>(new Set());

	// PDF document reference
	let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;

	// Sidebar scroll container ref
	let sidebarScrollContainer: HTMLDivElement | null = null;

	// Tool-specific behavior
	const isPageSelectionTool = $derived(
		['split', 'delete-pages', 'reorder', 'rotate'].includes(pdfs.settings.tool)
	);
	const allowMultiSelect = $derived(
		['split', 'delete-pages', 'rotate'].includes(pdfs.settings.tool)
	);

	// Pages to display in current view
	const visiblePages = $derived(() => {
		const pages: number[] = [];
		for (let i = thumbnailStartPage; i <= thumbnailEndPage; i++) {
			pages.push(i);
		}
		return pages;
	});

	// All pages for sidebar
	const allPages = $derived(() => {
		const pages: number[] = [];
		for (let i = 1; i <= totalPages; i++) {
			pages.push(i);
		}
		return pages;
	});

	async function loadPDF() {
		isLoading = true;
		error = null;

		try {
			const arrayBuffer = await item.file.arrayBuffer();
			pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
			totalPages = pdfDoc.numPages;

			// Update item with page count
			pdfs.updateItem(item.id, { pageCount: totalPages });

			// Load first page preview
			await renderPage(1);

			// Pre-load initial thumbnails for sidebar
			loadThumbnailRange(1, Math.min(THUMBNAIL_BATCH_SIZE, totalPages));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load PDF';
			console.error('PDF load error:', err);
		} finally {
			isLoading = false;
		}
	}

	async function loadThumbnail(pageNum: number): Promise<string | null> {
		if (!pdfDoc || thumbnailCache.has(pageNum) || loadingThumbnails.has(pageNum)) {
			return thumbnailCache.get(pageNum) || null;
		}

		loadingThumbnails = new Set([...loadingThumbnails, pageNum]);

		try {
			const page = await pdfDoc.getPage(pageNum);
			const scale = 0.2;
			const viewport = page.getViewport({ scale });

			const canvas = document.createElement('canvas');
			canvas.width = viewport.width;
			canvas.height = viewport.height;
			const ctx = canvas.getContext('2d');

			if (ctx) {
				await page.render({ canvasContext: ctx, viewport }).promise;
				const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
				thumbnailCache = new Map([...thumbnailCache, [pageNum, dataUrl]]);
				return dataUrl;
			}
		} catch (err) {
			console.error(`Failed to load thumbnail for page ${pageNum}:`, err);
		} finally {
			const newLoading = new Set(loadingThumbnails);
			newLoading.delete(pageNum);
			loadingThumbnails = newLoading;
		}
		return null;
	}

	async function loadThumbnailRange(start: number, end: number) {
		const promises: Promise<string | null>[] = [];
		for (let i = start; i <= end; i++) {
			if (!thumbnailCache.has(i)) {
				promises.push(loadThumbnail(i));
			}
		}
		await Promise.all(promises);
	}

	async function renderPage(pageNum: number) {
		if (!pdfDoc || pageNum < 1 || pageNum > totalPages) return;

		try {
			const page = await pdfDoc.getPage(pageNum);
			const scale = zoom * 1.5;
			const viewport = page.getViewport({ scale });

			pageWidth = viewport.width;
			pageHeight = viewport.height;

			const canvas = document.createElement('canvas');
			canvas.width = viewport.width;
			canvas.height = viewport.height;
			const ctx = canvas.getContext('2d');

			if (ctx) {
				await page.render({ canvasContext: ctx, viewport }).promise;
				currentPageCanvas = canvas.toDataURL('image/png');
			}
		} catch (err) {
			console.error(`Failed to render page ${pageNum}:`, err);
		}
	}

	function goToPage(pageNum: number) {
		if (pageNum >= 1 && pageNum <= totalPages) {
			currentPage = pageNum;
			renderPage(pageNum);

			// Load nearby thumbnails for sidebar
			loadThumbnailRange(Math.max(1, pageNum - 10), Math.min(totalPages, pageNum + 10));

			// Scroll thumbnail into view
			scrollToCurrentPage();
		}
	}

	async function scrollToCurrentPage() {
		await tick();
		if (sidebarScrollContainer) {
			const thumbnail = sidebarScrollContainer.querySelector(`[data-page="${currentPage}"]`);
			if (thumbnail) {
				thumbnail.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}
	}

	// Handle sidebar scroll to load visible thumbnails
	function handleSidebarScroll(e: Event) {
		const container = e.target as HTMLDivElement;
		const scrollTop = container.scrollTop;
		const clientHeight = container.clientHeight;

		// Calculate which pages are currently visible
		const thumbnailHeight = 160; // approximate height of each thumbnail item
		const startPage = Math.floor(scrollTop / thumbnailHeight) + 1;
		const endPage = Math.min(
			totalPages,
			Math.ceil((scrollTop + clientHeight) / thumbnailHeight) + 2
		);

		// Load thumbnails that are about to be visible
		loadThumbnailRange(Math.max(1, startPage - 2), Math.min(totalPages, endPage + 2));
	}

	function toggleSidebar() {
		sidebarVisible = !sidebarVisible;
	}

	function nextPage() {
		goToPage(currentPage + 1);
	}

	function prevPage() {
		goToPage(currentPage - 1);
	}

	function zoomIn() {
		zoom = Math.min(zoom + 0.25, 3);
		renderPage(currentPage);
	}

	function zoomOut() {
		zoom = Math.max(zoom - 0.25, 0.5);
		renderPage(currentPage);
	}

	function togglePageSelection(pageNum: number) {
		if (!isPageSelectionTool) return;

		const newSelection = new Set(selectedPages);
		if (newSelection.has(pageNum)) {
			newSelection.delete(pageNum);
		} else {
			if (!allowMultiSelect) {
				newSelection.clear();
			}
			newSelection.add(pageNum);
		}
		selectedPages = newSelection;
		pdfs.updateItem(item.id, { selectedPages: Array.from(selectedPages).sort((a, b) => a - b) });
	}

	function selectAll() {
		selectedPages = new Set(Array.from({ length: totalPages }, (_, i) => i + 1));
		pdfs.updateItem(item.id, { selectedPages: Array.from(selectedPages) });
	}

	function selectNone() {
		selectedPages = new Set();
		pdfs.updateItem(item.id, { selectedPages: [] });
	}

	function selectRange(start: number, end: number) {
		const newSelection = new Set(selectedPages);
		for (let i = start; i <= end; i++) {
			newSelection.add(i);
		}
		selectedPages = newSelection;
		pdfs.updateItem(item.id, { selectedPages: Array.from(selectedPages).sort((a, b) => a - b) });
	}

	function goToThumbnailPage(page: number) {
		thumbnailPage = Math.max(0, Math.min(page, totalThumbnailPages - 1));
		// Load thumbnails for this page
		loadThumbnailRange(thumbnailStartPage, thumbnailEndPage);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			e.preventDefault();
			nextPage();
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			e.preventDefault();
			prevPage();
		} else if (e.key === 'Escape' && onClose) {
			onClose();
		} else if (e.key === '+' || e.key === '=') {
			e.preventDefault();
			zoomIn();
		} else if (e.key === '-') {
			e.preventDefault();
			zoomOut();
		}
	}

	// Load thumbnails when switching to thumbnail view or changing page
	$effect(() => {
		if (viewMode === 'thumbnails' && totalPages > 0) {
			loadThumbnailRange(thumbnailStartPage, thumbnailEndPage);
		}
	});

	onMount(() => {
		loadPDF();
	});

	onDestroy(() => {
		pdfDoc?.destroy();
	});

	$effect(() => {
		if (pdfDoc && zoom) {
			renderPage(currentPage);
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="bg-surface-950 border-surface-800 flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border"
>
	<!-- Toolbar -->
	<div
		class="bg-surface-900/80 border-surface-800 flex items-center justify-between border-b px-4 py-2"
	>
		<!-- Left: File info + sidebar toggle -->
		<div class="flex items-center gap-3">
			<!-- Sidebar toggle -->
			<button
				onclick={toggleSidebar}
				class="rounded-lg p-1.5 transition-colors {sidebarVisible
					? 'bg-surface-700 text-surface-200'
					: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700'}"
				title="{sidebarVisible ? 'Hide' : 'Show'} sidebar"
			>
				<Sidebar class="h-4 w-4" />
			</button>

			{#if onClose}
				<button
					onclick={onClose}
					class="text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg p-1.5 transition-colors"
					title="Close"
				>
					<X class="h-4 w-4" />
				</button>
			{/if}
			<div class="flex items-center gap-2">
				<FileText class="text-accent-start h-4 w-4" />
				<span class="text-surface-200 max-w-[200px] truncate text-sm font-medium" title={item.name}>
					{item.name}
				</span>
				<span class="text-surface-500 text-xs">
					{formatBytes(item.originalSize)}
				</span>
			</div>
		</div>

		<!-- Center: Navigation -->
		<div class="flex items-center gap-2">
			<button
				onclick={prevPage}
				disabled={currentPage <= 1}
				class="text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
				title="Previous page"
			>
				<ChevronLeft class="h-4 w-4" />
			</button>

			<div class="flex items-center gap-1 text-sm">
				<input
					type="number"
					min="1"
					max={totalPages}
					value={currentPage}
					onchange={(e) => goToPage(parseInt(e.currentTarget.value) || 1)}
					class="bg-surface-800 border-surface-700 text-surface-200 focus:border-accent-start w-14 rounded border px-2 py-1 text-center text-sm focus:outline-none"
				/>
				<span class="text-surface-500">/ {totalPages.toLocaleString()}</span>
			</div>

			<button
				onclick={nextPage}
				disabled={currentPage >= totalPages}
				class="text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
				title="Next page"
			>
				<ChevronRight class="h-4 w-4" />
			</button>
		</div>

		<!-- Right: View controls -->
		<div class="flex items-center gap-1">
			<button
				onclick={zoomOut}
				disabled={zoom <= 0.5}
				class="text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg p-1.5 transition-colors disabled:opacity-30"
				title="Zoom out"
			>
				<ZoomOut class="h-4 w-4" />
			</button>
			<span class="text-surface-500 w-12 text-center text-xs">{Math.round(zoom * 100)}%</span>
			<button
				onclick={zoomIn}
				disabled={zoom >= 3}
				class="text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg p-1.5 transition-colors disabled:opacity-30"
				title="Zoom in"
			>
				<ZoomIn class="h-4 w-4" />
			</button>

			<div class="bg-surface-700 mx-2 h-5 w-px"></div>

			<button
				onclick={() => (viewMode = 'single')}
				class="rounded-lg p-1.5 transition-colors {viewMode === 'single'
					? 'bg-accent-start text-white'
					: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700'}"
				title="Single page view"
			>
				<List class="h-4 w-4" />
			</button>
			<button
				onclick={() => (viewMode = 'thumbnails')}
				class="rounded-lg p-1.5 transition-colors {viewMode === 'thumbnails'
					? 'bg-accent-start text-white'
					: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700'}"
				title="Thumbnail view"
			>
				<Grid3X3 class="h-4 w-4" />
			</button>
		</div>
	</div>

	<!-- Selection toolbar (for page operations) -->
	{#if isPageSelectionTool && viewMode === 'thumbnails'}
		<div
			class="bg-surface-800/50 border-surface-700/50 flex items-center justify-between border-b px-4 py-2"
			transition:fly={{ y: -10, duration: 150 }}
		>
			<div class="text-surface-400 text-sm">
				{selectedPages.size.toLocaleString()} of {totalPages.toLocaleString()} pages selected
			</div>
			<div class="flex items-center gap-2">
				<button
					onclick={() => selectRange(thumbnailStartPage, thumbnailEndPage)}
					class="text-surface-400 hover:text-surface-200 bg-surface-700 hover:bg-surface-600 rounded px-2 py-1 text-xs transition-colors"
				>
					Select This Page
				</button>
				<button
					onclick={selectAll}
					class="text-surface-400 hover:text-surface-200 bg-surface-700 hover:bg-surface-600 rounded px-2 py-1 text-xs transition-colors"
				>
					Select All
				</button>
				<button
					onclick={selectNone}
					class="text-surface-400 hover:text-surface-200 bg-surface-700 hover:bg-surface-600 rounded px-2 py-1 text-xs transition-colors"
				>
					Clear
				</button>
			</div>
		</div>
	{/if}

	<!-- Main content area -->
	<div class="flex min-h-0 flex-1 overflow-hidden">
		<!-- macOS Preview-style sidebar with thumbnails -->
		{#if sidebarVisible}
			<div
				class="bg-surface-900/70 border-surface-800 flex w-44 flex-shrink-0 flex-col overflow-hidden border-r"
				transition:fly={{ x: -176, duration: 200 }}
			>
				<div
					bind:this={sidebarScrollContainer}
					onscroll={handleSidebarScroll}
					class="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 py-3"
				>
					<div class="flex flex-col items-center gap-3">
						{#each allPages() as pageNum}
							{@const thumb = thumbnailCache.get(pageNum)}
							<button
								data-page={pageNum}
								onclick={() => {
									goToPage(pageNum);
									if (isPageSelectionTool) togglePageSelection(pageNum);
								}}
								class="group flex w-full flex-col items-center gap-1.5"
							>
								<!-- Thumbnail container with selection highlight -->
								<div
									class="relative overflow-hidden rounded-md transition-all duration-150
										{currentPage === pageNum
										? 'ring-accent-start shadow-accent-start/30 shadow-lg ring-[3px]'
										: selectedPages.has(pageNum)
											? 'shadow-lg shadow-green-500/30 ring-[3px] ring-green-500'
											: 'ring-surface-700 hover:ring-surface-500 ring-1 hover:shadow-md'}"
								>
									{#if thumb}
										<img src={thumb} alt="Page {pageNum}" class="w-28 bg-white" draggable="false" />
									{:else}
										<div
											class="bg-surface-800 flex aspect-[3/4] w-28 animate-pulse items-center justify-center"
										>
											<Loader2 class="text-surface-600 h-4 w-4 animate-spin" />
										</div>
									{/if}

									<!-- Selection checkmark for page tools -->
									{#if isPageSelectionTool && selectedPages.has(pageNum)}
										<div
											class="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 shadow-md"
										>
											<Check class="h-3 w-3 text-white" />
										</div>
									{/if}
								</div>

								<!-- Page number below thumbnail (macOS Preview style) -->
								<span
									class="text-[11px] font-medium transition-colors
										{currentPage === pageNum ? 'text-accent-start' : 'text-surface-500 group-hover:text-surface-300'}"
								>
									{pageNum}
								</span>
							</button>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- Main view -->
		<div class="bg-surface-950 flex-1 overflow-auto p-4">
			{#if isLoading}
				<div class="flex h-full items-center justify-center">
					<div class="text-surface-500 flex flex-col items-center gap-3">
						<Loader2 class="h-8 w-8 animate-spin" />
						<span>Loading PDF...</span>
					</div>
				</div>
			{:else if error}
				<div class="flex h-full items-center justify-center">
					<div class="text-center">
						<p class="mb-2 text-red-400">{error}</p>
						<button
							onclick={loadPDF}
							class="bg-surface-800 text-surface-200 hover:bg-surface-700 rounded-lg px-4 py-2 text-sm transition-colors"
						>
							Retry
						</button>
					</div>
				</div>
			{:else if viewMode === 'single'}
				<!-- Single page view -->
				<div class="flex min-h-full items-center justify-center">
					{#if currentPageCanvas}
						<div
							class="overflow-hidden rounded-lg bg-white shadow-2xl shadow-black/50"
							style="max-width: {pageWidth}px"
						>
							<img
								src={currentPageCanvas}
								alt="Page {currentPage}"
								class="h-auto w-full"
								draggable="false"
							/>
						</div>
					{/if}
				</div>
			{:else}
				<!-- Thumbnail grid view with pagination -->
				<div class="space-y-4">
					<!-- Pagination header -->
					{#if totalThumbnailPages > 1}
						<div class="bg-surface-900/50 flex items-center justify-between rounded-lg p-3">
							<button
								onclick={() => goToThumbnailPage(0)}
								disabled={thumbnailPage === 0}
								class="text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
								title="First page"
							>
								<ChevronsLeft class="h-4 w-4" />
							</button>
							<button
								onclick={() => goToThumbnailPage(thumbnailPage - 1)}
								disabled={thumbnailPage === 0}
								class="text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
								title="Previous"
							>
								<ChevronLeft class="h-4 w-4" />
							</button>

							<div class="text-surface-400 text-sm">
								Showing pages <span class="text-surface-200 font-medium"
									>{thumbnailStartPage.toLocaleString()}</span
								>
								-
								<span class="text-surface-200 font-medium">{thumbnailEndPage.toLocaleString()}</span
								>
								of {totalPages.toLocaleString()}
							</div>

							<button
								onclick={() => goToThumbnailPage(thumbnailPage + 1)}
								disabled={thumbnailPage >= totalThumbnailPages - 1}
								class="text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
								title="Next"
							>
								<ChevronRight class="h-4 w-4" />
							</button>
							<button
								onclick={() => goToThumbnailPage(totalThumbnailPages - 1)}
								disabled={thumbnailPage >= totalThumbnailPages - 1}
								class="text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
								title="Last page"
							>
								<ChevronsRight class="h-4 w-4" />
							</button>
						</div>
					{/if}

					<!-- Thumbnail grid -->
					<div
						class="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10"
					>
						{#each visiblePages() as pageNum}
							{@const thumb = thumbnailCache.get(pageNum)}
							<button
								onclick={() => {
									if (isPageSelectionTool) {
										togglePageSelection(pageNum);
									} else {
										goToPage(pageNum);
										viewMode = 'single';
									}
								}}
								class="relative aspect-[3/4] overflow-hidden rounded-lg border-2 bg-white transition-all
									{selectedPages.has(pageNum)
									? 'scale-[1.02] border-green-500 ring-2 ring-green-500/30'
									: 'border-surface-700 hover:border-surface-500'}"
							>
								{#if thumb}
									<img src={thumb} alt="Page {pageNum}" class="h-full w-full object-contain" />
								{:else}
									<div
										class="bg-surface-200 flex h-full w-full animate-pulse items-center justify-center"
									>
										<Loader2 class="text-surface-400 h-4 w-4 animate-spin" />
									</div>
								{/if}
								<div
									class="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white"
								>
									{pageNum}
								</div>
								{#if isPageSelectionTool}
									<div class="absolute left-1 top-1">
										{#if selectedPages.has(pageNum)}
											<div
												class="flex h-5 w-5 items-center justify-center rounded bg-green-500 shadow-lg"
											>
												<Check class="h-3 w-3 text-white" />
											</div>
										{:else}
											<div class="h-5 w-5 rounded border-2 border-white/60 bg-black/20"></div>
										{/if}
									</div>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Bottom status bar -->
	<div
		class="bg-surface-900/80 border-surface-800 text-surface-500 flex items-center justify-between border-t px-4 py-2 text-xs"
	>
		<div>
			{totalPages.toLocaleString()} page{totalPages !== 1 ? 's' : ''} • {formatBytes(
				item.originalSize
			)}
		</div>
		<div class="flex items-center gap-4">
			{#if isPageSelectionTool && selectedPages.size > 0}
				<span class="text-accent-start font-medium">
					{selectedPages.size.toLocaleString()} page{selectedPages.size !== 1 ? 's' : ''} selected
				</span>
			{/if}
			<span>Use arrow keys to navigate</span>
		</div>
	</div>
</div>
