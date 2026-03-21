<script lang="ts">
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { formatBytes } from '$lib/stores/pdfs.svelte';
	import type * as pdfjsLib from 'pdfjs-dist';
	import { getPdfjs } from '$lib/utils/pdf';
	import {
		rotateSinglePage,
		deleteSinglePage,
		extractSinglePage,
		duplicatePage,
		insertBlankPage,
		movePage,
		downloadFile,
	} from '$lib/utils/pdf';
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
		Maximize2,
		AlignCenter,
		Search,
		BookOpen,
		ChevronDown,
		RotateCw,
		RotateCcw,
		Trash2,
	} from 'lucide-svelte';
	import { onMount, onDestroy, tick } from 'svelte';
	import { fly } from 'svelte/transition';

	interface Props {
		file: File;
		onFileChange?: (newFile: File) => void;
		onSelectionChange?: (pages: number[]) => void;
		selectionMode?: boolean;
		allowMultiSelect?: boolean;
		onClose?: () => void;
	}

	const {
		file,
		onFileChange,
		onSelectionChange,
		selectionMode = false,
		allowMultiSelect = false,
		onClose,
	}: Props = $props();

	let currentFile = $state(file);

	// Constants
	const THUMBNAILS_PER_PAGE = 50;
	const THUMBNAIL_BATCH_SIZE = 20;

	// View state
	let currentPage = $state(1);
	let totalPages = $state(0);
	let zoom = $state(1);
	let viewMode = $state<'single' | 'thumbnails'>('single');
	let selectedPages = new SvelteSet<number>();
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let sidebarVisible = $state(true);
	let sidebarTab = $state<'pages' | 'outline'>('pages');

	// Pagination for thumbnail grid
	let thumbnailPage = $state(0);
	const totalThumbnailPages = $derived(Math.ceil(totalPages / THUMBNAILS_PER_PAGE));
	const thumbnailStartPage = $derived(thumbnailPage * THUMBNAILS_PER_PAGE + 1);
	const thumbnailEndPage = $derived(
		Math.min((thumbnailPage + 1) * THUMBNAILS_PER_PAGE, totalPages)
	);

	const THUMBNAIL_CACHE_MAX = 50;
	let thumbnailCache = $state<Map<number, string>>(new Map());
	let pageWidth = $state(0);
	let pageHeight = $state(0);
	let naturalPageWidth = $state(0);
	let naturalPageHeight = $state(0);

	// Canvas + text layer DOM refs
	let mainCanvas = $state<HTMLCanvasElement | null>(null);
	let textLayerContainer = $state<HTMLDivElement | null>(null);
	let annotationLayerContainer = $state<HTMLDivElement | null>(null);

	// Track which thumbnails are currently loading
	let loadingThumbnails = new SvelteSet<number>();

	// PDF document reference
	let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;

	// Active render task — cancelled before starting a new one
	let activeRenderTask: pdfjsLib.RenderTask | null = null;
	let activeTextLayer: { cancel: () => void } | null = null;

	// Sidebar scroll container ref
	let sidebarScrollContainer: HTMLDivElement | null = null;

	// Main content container ref (for fit-width/fit-page)
	let mainContentRef: HTMLDivElement | null = null;

	// ── Search ──
	let searchVisible = $state(false);
	let searchQuery = $state('');
	let searchInput: HTMLInputElement | null = null;
	const textIndex = new SvelteMap<number, string>(); // pageNum → full text
	let searchResults = $state<Array<{ pageNum: number; count: number }>>([]);
	let currentMatchPage = $state(0); // index into searchResults
	const totalMatches = $derived(searchResults.reduce((s, r) => s + r.count, 0));
	const currentMatchNum = $derived(
		searchResults.slice(0, currentMatchPage).reduce((s, r) => s + r.count, 0) + 1
	);

	// ── Outline ──
	interface OutlineNode {
		title: string;
		dest: string | unknown[] | null;
		url: string | null;
		items: OutlineNode[];
		expanded?: boolean;
	}
	let outlineItems = $state<OutlineNode[]>([]);
	let outlineLoaded = $state(false);

	// ── Context menu ──
	let contextMenu = $state<{
		visible: boolean;
		x: number;
		y: number;
		pageNum: number;
	}>({ visible: false, x: 0, y: 0, pageNum: 0 });
	let contextMenuProcessing = $state(false);

	// ── Drag-to-reorder ──
	let draggedPage = $state<number | null>(null);
	let dragOverPage = $state<number | null>(null);

	// Pages to display in current view
	const visiblePages = $derived.by(() => {
		const pages: number[] = [];
		for (let i = thumbnailStartPage; i <= thumbnailEndPage; i++) {
			pages.push(i);
		}
		return pages;
	});

	// All pages for sidebar
	const allPages = $derived.by(() => {
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
			const arrayBuffer = await currentFile.arrayBuffer();
			const pdfjs = await getPdfjs();
			pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
			totalPages = pdfDoc.numPages;

			loadThumbnailRange(1, Math.min(THUMBNAIL_BATCH_SIZE, totalPages));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load PDF';
			console.error('PDF load error:', err);
		} finally {
			isLoading = false;
		}
	}

	async function loadOutline() {
		if (!pdfDoc || outlineLoaded) return;
		outlineLoaded = true;
		try {
			const outline = await pdfDoc.getOutline();
			outlineItems = outline ? (outline as OutlineNode[]) : [];
		} catch {
			outlineItems = [];
		}
	}

	async function loadThumbnail(pageNum: number): Promise<string | null> {
		if (!pdfDoc || thumbnailCache.has(pageNum) || loadingThumbnails.has(pageNum)) {
			return thumbnailCache.get(pageNum) || null;
		}

		loadingThumbnails = new SvelteSet([...loadingThumbnails, pageNum]);

		try {
			const page = await pdfDoc.getPage(pageNum);
			const scale = 0.2;
			const viewport = page.getViewport({ scale });

			const canvas = document.createElement('canvas');
			canvas.width = viewport.width;
			canvas.height = viewport.height;
			const ctx = canvas.getContext('2d');

			if (ctx) {
				await page.render({ canvasContext: ctx, viewport, canvas }).promise;
				const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
				canvas.width = 0;
				canvas.height = 0;
				const updated = new SvelteMap(thumbnailCache);
				updated.delete(pageNum);
				updated.set(pageNum, dataUrl);
				if (updated.size > THUMBNAIL_CACHE_MAX) {
					const oldest = updated.keys().next().value!;
					updated.delete(oldest);
				}
				thumbnailCache = updated;
				return dataUrl;
			}
		} catch (err) {
			console.error(`Failed to load thumbnail for page ${pageNum}:`, err);
		} finally {
			const newLoading = new SvelteSet(loadingThumbnails);
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
		if (!mainCanvas) return;

		// Cancel any in-progress render
		activeRenderTask?.cancel();
		activeRenderTask = null;
		activeTextLayer?.cancel();
		activeTextLayer = null;

		try {
			const page = await pdfDoc.getPage(pageNum);
			const scale = zoom * 1.5;
			const viewport = page.getViewport({ scale });

			const naturalViewport = page.getViewport({ scale: 1 });
			naturalPageWidth = naturalViewport.width;
			naturalPageHeight = naturalViewport.height;

			pageWidth = viewport.width;
			pageHeight = viewport.height;

			// Render canvas
			mainCanvas.width = viewport.width;
			mainCanvas.height = viewport.height;
			const ctx = mainCanvas.getContext('2d');

			if (ctx) {
				const renderTask = page.render({ canvasContext: ctx, viewport, canvas: mainCanvas });
				activeRenderTask = renderTask;
				try {
					await renderTask.promise;
				} catch (e: unknown) {
					if (e instanceof Error && e.name === 'RenderingCancelledException') return;
					throw e;
				}
				activeRenderTask = null;
			}

			// Render text layer
			if (textLayerContainer) {
				// eslint-disable-next-line svelte/no-dom-manipulating
				textLayerContainer.innerHTML = '';
				textLayerContainer.style.width = viewport.width + 'px';
				textLayerContainer.style.height = viewport.height + 'px';

				const pdfjs = await getPdfjs();
				const textLayer = new pdfjs.TextLayer({
					textContentSource: page.streamTextContent(),
					container: textLayerContainer,
					viewport,
				});

				let cancelled = false;
				activeTextLayer = {
					cancel() {
						cancelled = true;
					},
				};

				try {
					await textLayer.render();
					if (!cancelled && searchQuery && textLayerContainer) {
						applySearchHighlights(textLayerContainer, searchQuery);
					}
				} catch {
					// ignore
				}
				activeTextLayer = null;
			}

			// Build text index for this page (for search)
			if (!textIndex.has(pageNum)) {
				const content = await page.getTextContent();
				const text = content.items
					.filter((it) => 'str' in it)
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					.map((it) => (it as any).str as string)
					.join(' ');
				textIndex.set(pageNum, text);
			}
		} catch (err) {
			console.error(`Failed to render page ${pageNum}:`, err);
		}
	}

	function applySearchHighlights(container: HTMLElement, query: string) {
		if (!query.trim()) return;
		const lower = query.toLowerCase();
		const spans = container.querySelectorAll<HTMLSpanElement>('span');
		for (const span of spans) {
			const text = span.textContent ?? '';
			if (text.toLowerCase().includes(lower)) {
				span.style.backgroundColor = 'rgba(255, 220, 0, 0.5)';
				span.style.borderRadius = '2px';
			} else {
				span.style.backgroundColor = '';
				span.style.borderRadius = '';
			}
		}
	}

	function clearSearchHighlights() {
		if (!textLayerContainer) return;
		const spans = textLayerContainer.querySelectorAll<HTMLSpanElement>('span');
		for (const span of spans) {
			span.style.backgroundColor = '';
			span.style.borderRadius = '';
		}
	}

	async function buildTextIndexForAllPages() {
		if (!pdfDoc) return;
		const promises: Promise<void>[] = [];
		for (let i = 1; i <= totalPages; i++) {
			if (!textIndex.has(i)) {
				promises.push(
					(async (pageNum) => {
						const page = await pdfDoc!.getPage(pageNum);
						const content = await page.getTextContent();
						const text = content.items
							.filter((it) => 'str' in it)
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							.map((it) => (it as any).str as string)
							.join(' ');
						textIndex.set(pageNum, text);
					})(i)
				);
			}
		}
		await Promise.all(promises);
	}

	async function performSearch(query: string) {
		if (!query.trim() || !pdfDoc) {
			searchResults = [];
			clearSearchHighlights();
			return;
		}

		await buildTextIndexForAllPages();

		const lower = query.toLowerCase();
		const results: Array<{ pageNum: number; count: number }> = [];

		for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
			const text = textIndex.get(pageNum) ?? '';
			let count = 0;
			let idx = 0;
			while ((idx = text.toLowerCase().indexOf(lower, idx)) !== -1) {
				count++;
				idx += lower.length;
			}
			if (count > 0) results.push({ pageNum, count });
		}

		searchResults = results;
		currentMatchPage = 0;

		if (results.length > 0) {
			goToPage(results[0].pageNum);
		}
	}

	function nextSearchMatch() {
		if (searchResults.length === 0) return;
		currentMatchPage = (currentMatchPage + 1) % searchResults.length;
		goToPage(searchResults[currentMatchPage].pageNum);
	}

	function prevSearchMatch() {
		if (searchResults.length === 0) return;
		currentMatchPage = (currentMatchPage - 1 + searchResults.length) % searchResults.length;
		goToPage(searchResults[currentMatchPage].pageNum);
	}

	async function navigateToOutlineItem(node: OutlineNode) {
		if (!pdfDoc || !node.dest) return;
		try {
			let dest: unknown[];
			if (typeof node.dest === 'string') {
				dest = (await pdfDoc.getDestination(node.dest)) ?? [];
			} else {
				dest = node.dest as unknown[];
			}
			if (dest.length > 0) {
				const ref = dest[0] as { num: number; gen: number };
				const pageIndex = await pdfDoc.getPageIndex(ref);
				goToPage(pageIndex + 1);
			}
		} catch {
			// ignore
		}
	}

	function goToPage(pageNum: number) {
		if (pageNum >= 1 && pageNum <= totalPages) {
			currentPage = pageNum;
			loadThumbnailRange(Math.max(1, pageNum - 10), Math.min(totalPages, pageNum + 10));
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

	function handleSidebarScroll(e: Event) {
		const container = e.target as HTMLDivElement;
		const scrollTop = container.scrollTop;
		const clientHeight = container.clientHeight;

		const thumbnailEl = container.querySelector('[data-page]');
		const thumbnailHeight = thumbnailEl?.getBoundingClientRect().height ?? 160;

		const startPage = Math.floor(scrollTop / thumbnailHeight) + 1;
		const endPage = Math.min(
			totalPages,
			Math.ceil((scrollTop + clientHeight) / thumbnailHeight) + 2
		);

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
	}

	function zoomOut() {
		zoom = Math.max(zoom - 0.25, 0.5);
	}

	function fitWidth() {
		if (!mainContentRef || !naturalPageWidth) return;
		const containerWidth = mainContentRef.clientWidth - 32;
		zoom = Math.max(0.5, Math.min(3, containerWidth / (naturalPageWidth * 1.5)));
	}

	function fitPage() {
		if (!mainContentRef || !naturalPageWidth || !naturalPageHeight) return;
		const containerWidth = mainContentRef.clientWidth - 32;
		const containerHeight = mainContentRef.clientHeight - 32;
		const scaleW = containerWidth / (naturalPageWidth * 1.5);
		const scaleH = containerHeight / (naturalPageHeight * 1.5);
		zoom = Math.max(0.5, Math.min(3, Math.min(scaleW, scaleH)));
	}

	function togglePageSelection(pageNum: number) {
		if (!selectionMode) return;

		const newSelection = new SvelteSet(selectedPages);
		if (newSelection.has(pageNum)) {
			newSelection.delete(pageNum);
		} else {
			if (!allowMultiSelect) {
				newSelection.clear();
			}
			newSelection.add(pageNum);
		}
		selectedPages = newSelection;
		onSelectionChange?.(Array.from(selectedPages).sort((a, b) => a - b));
	}

	function selectAll() {
		selectedPages = new SvelteSet(Array.from({ length: totalPages }, (_, i) => i + 1));
		onSelectionChange?.(Array.from(selectedPages).sort((a, b) => a - b));
	}

	function selectNone() {
		selectedPages = new SvelteSet();
		onSelectionChange?.([]);
	}

	function selectRange(start: number, end: number) {
		const newSelection = new SvelteSet(selectedPages);
		for (let i = start; i <= end; i++) {
			newSelection.add(i);
		}
		selectedPages = newSelection;
		onSelectionChange?.(Array.from(selectedPages).sort((a, b) => a - b));
	}

	function goToThumbnailPage(page: number) {
		thumbnailPage = Math.max(0, Math.min(page, totalThumbnailPages - 1));
		loadThumbnailRange(thumbnailStartPage, thumbnailEndPage);
	}

	// Context menu
	function handleThumbnailContextMenu(e: MouseEvent, pageNum: number) {
		e.preventDefault();
		contextMenu = { visible: true, x: e.clientX, y: e.clientY, pageNum };
	}

	function closeContextMenu() {
		contextMenu = { ...contextMenu, visible: false };
	}

	async function handleContextMenuAction(
		action: 'rotate-cw' | 'rotate-ccw' | 'delete' | 'extract' | 'duplicate' | 'insert-blank'
	) {
		const pageNum = contextMenu.pageNum;
		closeContextMenu();
		contextMenuProcessing = true;
		try {
			let newBlob: Blob;
			switch (action) {
				case 'rotate-cw':
					newBlob = await rotateSinglePage(currentFile, pageNum, 90);
					break;
				case 'rotate-ccw':
					newBlob = await rotateSinglePage(currentFile, pageNum, -90);
					break;
				case 'delete':
					newBlob = await deleteSinglePage(currentFile, pageNum);
					break;
				case 'extract': {
					const extracted = await extractSinglePage(currentFile, pageNum);
					downloadFile(extracted, `${currentFile.name.replace(/\.pdf$/i, '')}-page${pageNum}.pdf`);
					contextMenuProcessing = false;
					return;
				}
				case 'duplicate':
					newBlob = await duplicatePage(currentFile, pageNum);
					break;
				case 'insert-blank':
					newBlob = await insertBlankPage(currentFile, pageNum);
					break;
			}

			const newFile = new File([newBlob!], currentFile.name, { type: 'application/pdf' });
			currentFile = newFile;
			onFileChange?.(newFile);

			// Reload viewer
			pdfDoc?.destroy();
			pdfDoc = null;
			textIndex.clear();
			thumbnailCache = new Map();
			outlineLoaded = false;
			outlineItems = [];
			await loadPDF();
		} catch (err) {
			console.error('Context menu action failed:', err);
		} finally {
			contextMenuProcessing = false;
		}
	}

	// Direct page action (from hover controls — no context menu)
	async function doPageAction(action: 'rotate-cw' | 'rotate-ccw' | 'delete', pageNum: number) {
		contextMenuProcessing = true;
		try {
			let newBlob: Blob;
			if (action === 'rotate-cw') newBlob = await rotateSinglePage(currentFile, pageNum, 90);
			else if (action === 'rotate-ccw') newBlob = await rotateSinglePage(currentFile, pageNum, -90);
			else newBlob = await deleteSinglePage(currentFile, pageNum);

			const newFile = new File([newBlob], currentFile.name, { type: 'application/pdf' });
			currentFile = newFile;
			onFileChange?.(newFile);
			pdfDoc?.destroy();
			pdfDoc = null;
			textIndex.clear();
			thumbnailCache = new Map();
			outlineLoaded = false;
			outlineItems = [];
			await loadPDF();
		} catch (err) {
			console.error('Page action failed:', err);
		} finally {
			contextMenuProcessing = false;
		}
	}

	// Drag-to-reorder handlers
	function handleDragStart(e: DragEvent, pageNum: number) {
		draggedPage = pageNum;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(pageNum));
		}
	}

	function handleDragOver(e: DragEvent, pageNum: number) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dragOverPage = pageNum;
	}

	function handleDragLeave() {
		dragOverPage = null;
	}

	async function handleDrop(e: DragEvent, toPage: number) {
		e.preventDefault();
		dragOverPage = null;
		if (draggedPage === null || draggedPage === toPage) {
			draggedPage = null;
			return;
		}
		const from = draggedPage;
		draggedPage = null;

		contextMenuProcessing = true;
		try {
			const newBlob = await movePage(currentFile, from, toPage);
			const newFile = new File([newBlob], currentFile.name, { type: 'application/pdf' });
			currentFile = newFile;
			onFileChange?.(newFile);
			pdfDoc?.destroy();
			pdfDoc = null;
			textIndex.clear();
			thumbnailCache = new Map();
			outlineLoaded = false;
			outlineItems = [];
			await loadPDF();
		} catch (err) {
			console.error('Move page failed:', err);
		} finally {
			contextMenuProcessing = false;
		}
	}

	function handleDragEnd() {
		draggedPage = null;
		dragOverPage = null;
	}

	function handleKeydown(e: KeyboardEvent) {
		// Search shortcut
		if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
			e.preventDefault();
			openSearch();
			return;
		}

		// Close context menu on Escape
		if (e.key === 'Escape') {
			if (contextMenu.visible) {
				closeContextMenu();
				return;
			}
			if (searchVisible) {
				closeSearch();
				return;
			}
			if (onClose) onClose();
			return;
		}

		// Search navigation
		if (searchVisible) {
			if (e.key === 'Enter') {
				e.preventDefault();
				if (e.shiftKey) prevSearchMatch();
				else nextSearchMatch();
			}
			return;
		}

		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			e.preventDefault();
			nextPage();
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			e.preventDefault();
			prevPage();
		} else if (e.key === '+' || e.key === '=') {
			e.preventDefault();
			zoomIn();
		} else if (e.key === '-') {
			e.preventDefault();
			zoomOut();
		}
	}

	async function openSearch() {
		searchVisible = true;
		await tick();
		searchInput?.focus();

		// Switch sidebar to pages tab if on outline
		if (sidebarTab === 'outline') sidebarTab = 'pages';
	}

	function closeSearch() {
		searchVisible = false;
		searchQuery = '';
		searchResults = [];
		clearSearchHighlights();
	}

	// Reactive: re-run search when query changes (debounced via timeout)
	let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		const q = searchQuery;
		if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
		searchDebounceTimer = setTimeout(() => {
			if (searchVisible) performSearch(q);
		}, 300);
	});

	// Load thumbnails when switching to thumbnail view
	$effect(() => {
		if (viewMode === 'thumbnails' && totalPages > 0) {
			loadThumbnailRange(thumbnailStartPage, thumbnailEndPage);
		}
	});

	// Load outline when sidebar tab switches to outline
	$effect(() => {
		if (sidebarTab === 'outline') {
			loadOutline();
		}
	});

	onMount(() => {
		loadPDF();
	});

	onDestroy(() => {
		activeRenderTask?.cancel();
		activeTextLayer?.cancel();
		pdfDoc?.destroy();
	});

	// Sole trigger for page renders — tracks mainCanvas, pdfDoc, zoom, AND currentPage
	$effect(() => {
		if (mainCanvas && pdfDoc && zoom && currentPage) {
			renderPage(currentPage);
		}
	});
</script>

<svelte:window
	onkeydown={handleKeydown}
	onclick={(e) => {
		if (contextMenu.visible) {
			const target = e.target as Element;
			if (!target.closest('[data-context-menu]')) closeContextMenu();
		}
	}}
/>

<div
	class="bg-surface-950 border-surface-800 flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border"
>
	<!-- Toolbar -->
	<div
		class="bg-surface-900/80 border-surface-800 flex items-center justify-between border-b px-4 py-2"
	>
		<!-- Left: File info + sidebar toggle -->
		<div class="flex items-center gap-3">
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
				<span class="text-surface-200 max-w-[200px] truncate text-sm font-medium" title={file.name}>
					{file.name}
				</span>
				<span class="text-surface-500 text-xs">
					{formatBytes(file.size)}
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
			<!-- Search button -->
			<button
				onclick={openSearch}
				class="rounded-lg p-1.5 transition-colors {searchVisible
					? 'bg-surface-700 text-surface-200'
					: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700'}"
				title="Search (⌘F)"
			>
				<Search class="h-4 w-4" />
			</button>

			<div class="bg-surface-700 mx-1 h-5 w-px"></div>

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

			<button
				onclick={fitWidth}
				disabled={!naturalPageWidth}
				class="text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg p-1.5 transition-colors disabled:opacity-30"
				title="Fit width"
			>
				<AlignCenter class="h-4 w-4" />
			</button>
			<button
				onclick={fitPage}
				disabled={!naturalPageWidth}
				class="text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg p-1.5 transition-colors disabled:opacity-30"
				title="Fit page"
			>
				<Maximize2 class="h-4 w-4" />
			</button>

			<div class="bg-surface-700 mx-1 h-5 w-px"></div>

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

	<!-- Search bar -->
	{#if searchVisible}
		<div
			class="bg-surface-800/80 border-surface-700/50 flex items-center gap-2 border-b px-4 py-2"
			transition:fly={{ y: -8, duration: 150 }}
		>
			<Search class="text-surface-500 h-3.5 w-3.5 flex-shrink-0" />
			<input
				bind:this={searchInput}
				bind:value={searchQuery}
				placeholder="Search in document…"
				class="text-surface-200 placeholder-surface-600 flex-1 bg-transparent text-sm outline-none"
			/>
			{#if searchResults.length > 0}
				<span class="text-surface-500 text-xs">{currentMatchNum} of {totalMatches}</span>
				<button
					onclick={prevSearchMatch}
					class="text-surface-400 hover:text-surface-200 rounded p-0.5"
					title="Previous match (⇧Enter)"
				>
					<ChevronLeft class="h-3.5 w-3.5" />
				</button>
				<button
					onclick={nextSearchMatch}
					class="text-surface-400 hover:text-surface-200 rounded p-0.5"
					title="Next match (Enter)"
				>
					<ChevronRight class="h-3.5 w-3.5" />
				</button>
			{:else if searchQuery.trim()}
				<span class="text-surface-600 text-xs">No results</span>
			{/if}
			<button onclick={closeSearch} class="text-surface-400 hover:text-surface-200 rounded p-0.5">
				<X class="h-3.5 w-3.5" />
			</button>
		</div>
	{/if}

	<!-- Selection toolbar (for page operations) -->
	{#if selectionMode && viewMode === 'thumbnails'}
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
		<!-- Sidebar with tabs -->
		{#if sidebarVisible}
			<div
				class="bg-surface-900/70 border-surface-800 flex w-44 flex-shrink-0 flex-col overflow-hidden border-r"
				transition:fly={{ x: -176, duration: 200 }}
			>
				<!-- Sidebar tabs -->
				<div class="border-surface-800 flex border-b">
					<button
						onclick={() => (sidebarTab = 'pages')}
						class="flex-1 py-2 text-[10px] font-medium transition-colors {sidebarTab === 'pages'
							? 'text-accent-start border-accent-start border-b-2'
							: 'text-surface-500 hover:text-surface-300'}"
					>
						Pages
					</button>
					<button
						onclick={() => (sidebarTab = 'outline')}
						class="flex-1 py-2 text-[10px] font-medium transition-colors {sidebarTab === 'outline'
							? 'text-accent-start border-accent-start border-b-2'
							: 'text-surface-500 hover:text-surface-300'}"
					>
						Outline
					</button>
				</div>

				{#if sidebarTab === 'pages'}
					<!-- Pages tab: thumbnails -->
					<div
						bind:this={sidebarScrollContainer}
						onscroll={handleSidebarScroll}
						class="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 py-3"
					>
						<div class="flex flex-col items-center gap-3">
							{#each allPages as pageNum (pageNum)}
								{@const thumb = thumbnailCache.get(pageNum)}
								<div
									data-page={pageNum}
									draggable="true"
									ondragstart={(e) => handleDragStart(e, pageNum)}
									ondragover={(e) => handleDragOver(e, pageNum)}
									ondragleave={handleDragLeave}
									ondrop={(e) => handleDrop(e, pageNum)}
									ondragend={handleDragEnd}
									role="listitem"
									class="group flex w-full cursor-grab flex-col items-center gap-1.5 active:cursor-grabbing"
								>
									<div
										class="relative overflow-hidden rounded-md transition-all duration-150
											{dragOverPage === pageNum && draggedPage !== pageNum
											? 'ring-accent-start shadow-lg ring-[3px]'
											: draggedPage === pageNum
												? 'ring-surface-600 opacity-40 ring-1'
												: currentPage === pageNum
													? 'ring-accent-start shadow-accent-start/30 shadow-lg ring-[3px]'
													: selectedPages.has(pageNum)
														? 'shadow-lg ring-[3px] shadow-green-500/30 ring-green-500'
														: 'ring-surface-700 hover:ring-surface-500 ring-1 hover:shadow-md'}"
									>
										<button
											onclick={() => {
												goToPage(pageNum);
												if (selectionMode) togglePageSelection(pageNum);
											}}
											oncontextmenu={(e) => handleThumbnailContextMenu(e, pageNum)}
											class="block"
										>
											{#if thumb}
												<img
													src={thumb}
													alt="Page {pageNum}"
													class="w-28 bg-white"
													draggable="false"
												/>
											{:else}
												<div
													class="bg-surface-800 flex aspect-[3/4] w-28 animate-pulse items-center justify-center"
												>
													<Loader2 class="text-surface-600 h-4 w-4 animate-spin" />
												</div>
											{/if}
										</button>

										<!-- Hover action bar -->
										<div
											class="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-0.5 bg-black/75 py-1 opacity-0 backdrop-blur-sm transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100"
										>
											<button
												onclick={(e) => {
													e.stopPropagation();
													doPageAction('rotate-ccw', pageNum);
												}}
												class="rounded p-1 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
												title="Rotate CCW"
											>
												<RotateCcw class="h-3 w-3" />
											</button>
											<button
												onclick={(e) => {
													e.stopPropagation();
													doPageAction('rotate-cw', pageNum);
												}}
												class="rounded p-1 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
												title="Rotate CW"
											>
												<RotateCw class="h-3 w-3" />
											</button>
											<div class="mx-0.5 h-3 w-px bg-white/25"></div>
											<button
												onclick={(e) => {
													e.stopPropagation();
													doPageAction('delete', pageNum);
												}}
												class="rounded p-1 text-white/70 transition-colors hover:bg-red-500/20 hover:text-red-400"
												title="Delete page"
											>
												<Trash2 class="h-3 w-3" />
											</button>
										</div>

										{#if selectionMode && selectedPages.has(pageNum)}
											<div
												class="absolute top-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 shadow-md"
											>
												<Check class="h-3 w-3 text-white" />
											</div>
										{/if}
									</div>

									<span
										class="text-[11px] font-medium transition-colors
											{currentPage === pageNum ? 'text-accent-start' : 'text-surface-500 group-hover:text-surface-300'}"
									>
										{pageNum}
									</span>
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<!-- Outline tab -->
					<div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 py-3">
						{#if !outlineLoaded}
							<div class="flex items-center justify-center py-8">
								<Loader2 class="text-surface-600 h-4 w-4 animate-spin" />
							</div>
						{:else if outlineItems.length === 0}
							<div class="py-8 text-center">
								<BookOpen class="text-surface-700 mx-auto mb-2 h-6 w-6" />
								<p class="text-surface-600 text-[10px]">No bookmarks</p>
							</div>
						{:else}
							<div class="space-y-0.5">
								{#each outlineItems as node (node.title)}
									{@render OutlineItem({ node, depth: 0, onNavigate: navigateToOutlineItem })}
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Main view -->
		<div bind:this={mainContentRef} class="bg-surface-950 flex-1 overflow-auto p-4">
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
				<!-- Single page view: canvas + text layer -->
				<div class="flex min-h-full items-center justify-center">
					<div
						class="relative overflow-hidden rounded-lg bg-white shadow-2xl shadow-black/50"
						style="width: {pageWidth}px; height: {pageHeight}px;"
					>
						<canvas bind:this={mainCanvas} class="block"></canvas>
						<div
							bind:this={textLayerContainer}
							class="pdf-text-layer selectable absolute inset-0"
						></div>
					</div>
				</div>
			{:else}
				<!-- Thumbnail grid view with pagination -->
				<div class="space-y-4">
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

					<div
						class="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10"
					>
						{#each visiblePages as pageNum (pageNum)}
							{@const thumb = thumbnailCache.get(pageNum)}
							<button
								onclick={() => {
									if (selectionMode) {
										togglePageSelection(pageNum);
									} else {
										goToPage(pageNum);
										viewMode = 'single';
									}
								}}
								oncontextmenu={(e) => handleThumbnailContextMenu(e, pageNum)}
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
									class="absolute right-1 bottom-1 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white"
								>
									{pageNum}
								</div>
								{#if selectionMode}
									<div class="absolute top-1 left-1">
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
			{totalPages.toLocaleString()} page{totalPages !== 1 ? 's' : ''} • {formatBytes(file.size)}
		</div>
		<div class="flex items-center gap-4">
			{#if contextMenuProcessing}
				<span class="text-accent-start flex items-center gap-1">
					<Loader2 class="h-3 w-3 animate-spin" />
					Processing…
				</span>
			{/if}
			{#if selectionMode && selectedPages.size > 0}
				<span class="text-accent-start font-medium">
					{selectedPages.size.toLocaleString()} page{selectedPages.size !== 1 ? 's' : ''} selected
				</span>
			{/if}
			<span
				>Arrow keys to navigate • ⌘F search • Drag thumbnails to reorder • Hover for quick actions</span
			>
		</div>
	</div>
</div>

<!-- Context menu (rendered outside main container for z-index) -->
{#if contextMenu.visible}
	<div
		data-context-menu
		class="bg-surface-800 border-surface-600 fixed z-50 min-w-[180px] rounded-xl border py-1.5 shadow-2xl"
		style="left: {contextMenu.x}px; top: {contextMenu.y}px"
		transition:fly={{ y: 4, duration: 100 }}
	>
		{#each [{ action: 'rotate-cw', label: 'Rotate Clockwise' }, { action: 'rotate-ccw', label: 'Rotate Counter-clockwise' }, null, { action: 'duplicate', label: 'Duplicate Page' }, { action: 'insert-blank', label: 'Insert Blank Page After' }, null, { action: 'extract', label: 'Extract Page', accent: false }, null, { action: 'delete', label: 'Delete Page', danger: true }] as item, i (i)}
			{#if item === null}
				<div class="bg-surface-700 mx-2 my-1 h-px"></div>
			{:else}
				<button
					onclick={() => handleContextMenuAction((item as any).action)}
					class="w-full px-3 py-1.5 text-left text-sm transition-colors {(item as any).danger
						? 'text-red-400 hover:bg-red-500/10'
						: 'text-surface-200 hover:bg-surface-700'}"
				>
					{(item as any).label}
				</button>
			{/if}
		{/each}
	</div>
{/if}

<!-- Outline item component (recursive) -->
{#snippet OutlineItem({
	node,
	depth,
	onNavigate,
}: {
	node: OutlineNode;
	depth: number;
	onNavigate: (n: OutlineNode) => void;
})}
	<div>
		<button
			onclick={() => onNavigate(node)}
			class="text-surface-400 hover:text-surface-200 hover:bg-surface-800 flex w-full items-center gap-1 rounded px-2 py-1 text-left text-[10px] transition-colors"
			style="padding-left: {8 + depth * 10}px"
		>
			{#if node.items && node.items.length > 0}
				<ChevronDown class="h-2.5 w-2.5 flex-shrink-0 opacity-50" />
			{:else}
				<span class="h-2.5 w-2.5 flex-shrink-0"></span>
			{/if}
			<span class="truncate">{node.title}</span>
		</button>
		{#if node.items && node.items.length > 0}
			{#each node.items as child (child.title)}
				{@render OutlineItem({ node: child, depth: depth + 1, onNavigate })}
			{/each}
		{/if}
	</div>
{/snippet}

<!-- Text layer CSS (must be :global because spans are injected dynamically) -->
<style>
	:global(.pdf-text-layer) {
		position: absolute;
		inset: 0;
		overflow: clip;
		line-height: 1;
		text-size-adjust: none;
		forced-color-adjust: none;
		pointer-events: none;
	}

	:global(.pdf-text-layer.selectable) {
		pointer-events: auto;
	}

	:global(.pdf-text-layer span),
	:global(.pdf-text-layer br) {
		color: transparent;
		position: absolute;
		white-space: pre;
		cursor: text;
		transform-origin: 0% 0%;
	}

	:global(.pdf-text-layer span::selection) {
		background-color: rgba(0, 100, 255, 0.25);
		color: transparent;
	}
</style>
