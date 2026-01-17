<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Toast, { toast } from '$lib/components/Toast.svelte';
	import { reorderPages, getOutputFilename, getPageCount } from '$lib/utils/pdf';
	import { formatBytes } from '$lib/stores/pdfs.svelte';
	import * as pdfjsLib from 'pdfjs-dist';
	import { base } from '$app/paths';
	import { ArrowUpDown, Upload, FileText, Download, Trash2, Loader2, CheckCircle, GripVertical } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';

	if (typeof window !== 'undefined') {
		pdfjsLib.GlobalWorkerOptions.workerSrc = `${base}/pdf.worker.min.mjs`;
	}

	interface PageItem {
		pageNum: number;
		thumbnail: string;
	}

	interface PDFFile {
		id: string;
		file: File;
		originalUrl: string;
		pageCount?: number;
		pages: PageItem[];
	}

	let pdfFile = $state<PDFFile | null>(null);
	let isProcessing = $state(false);
	let isLoadingThumbnails = $state(false);
	let resultBlob = $state<Blob | null>(null);
	let progress = $state(0);
	let fileInput: HTMLInputElement;
	let isDragging = $state(false);
	let draggedPage = $state<number | null>(null);

	const hasFile = $derived(pdfFile !== null);
	const pageOrder = $derived(pdfFile?.pages.map(p => p.pageNum) || []);

	function generateId(): string {
		return `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	async function generatePageThumbnails(file: File): Promise<PageItem[]> {
		const arrayBuffer = await file.arrayBuffer();
		const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
		const pages: PageItem[] = [];

		for (let i = 1; i <= pdf.numPages; i++) {
			const page = await pdf.getPage(i);
			const scale = 0.3;
			const viewport = page.getViewport({ scale });
			const canvas = document.createElement('canvas');
			canvas.width = viewport.width;
			canvas.height = viewport.height;
			const ctx = canvas.getContext('2d')!;
			await page.render({ canvasContext: ctx, viewport }).promise;
			pages.push({ pageNum: i, thumbnail: canvas.toDataURL('image/jpeg', 0.6) });
		}

		return pages;
	}

	async function handleFiles(newFiles: File[]) {
		const file = newFiles.find(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
		if (!file) { toast.error('Please select a PDF file'); return; }
		if (pdfFile) URL.revokeObjectURL(pdfFile.originalUrl);

		isLoadingThumbnails = true;
		const newPdf: PDFFile = { id: generateId(), file, originalUrl: URL.createObjectURL(file), pages: [] };

		try {
			newPdf.pageCount = await getPageCount(file);
			newPdf.pages = await generatePageThumbnails(file);
		} catch (e) { console.warn('Failed to load PDF:', e); toast.error('Failed to load PDF'); isLoadingThumbnails = false; return; }

		pdfFile = newPdf;
		resultBlob = null;
		isLoadingThumbnails = false;
		toast.success('PDF loaded - drag pages to reorder');
	}

	function removeFile() {
		if (pdfFile) { URL.revokeObjectURL(pdfFile.originalUrl); pdfFile = null; resultBlob = null; }
	}

	async function handleReorder() {
		if (!pdfFile || pdfFile.pages.length === 0) return;

		isProcessing = true;
		progress = 0;

		try {
			const result = await reorderPages(pdfFile.file, {
				newOrder: pdfFile.pages.map(p => p.pageNum),
				onProgress: (p) => { progress = p; }
			});
			resultBlob = result;
			toast.success('Pages reordered!');
		} catch (error) {
			console.error('Reorder error:', error);
			toast.error(error instanceof Error ? error.message : 'Reorder failed');
		} finally {
			isProcessing = false;
		}
	}

	function downloadResult() {
		if (!resultBlob || !pdfFile) return;
		const filename = getOutputFilename(pdfFile.file.name, 'reorder');
		const url = URL.createObjectURL(resultBlob);
		const a = document.createElement('a');
		a.href = url; a.download = filename;
		document.body.appendChild(a); a.click(); document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function handlePageDragStart(e: DragEvent, pageNum: number) {
		draggedPage = pageNum;
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	function handlePageDragOver(e: DragEvent, targetPageNum: number) {
		e.preventDefault();
		if (draggedPage !== null && draggedPage !== targetPageNum && pdfFile) {
			const draggedIndex = pdfFile.pages.findIndex(p => p.pageNum === draggedPage);
			const targetIndex = pdfFile.pages.findIndex(p => p.pageNum === targetPageNum);
			if (draggedIndex !== -1 && targetIndex !== -1) {
				const newPages = [...pdfFile.pages];
				const [removed] = newPages.splice(draggedIndex, 1);
				newPages.splice(targetIndex, 0, removed);
				pdfFile = { ...pdfFile, pages: newPages };
			}
		}
	}

	function handlePageDragEnd() { draggedPage = null; resultBlob = null; }

	function handleDragEnter(e: DragEvent) { e.preventDefault(); isDragging = true; }
	function handleDragLeave(e: DragEvent) { e.preventDefault(); const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) isDragging = false; }
	function handleDragOver(e: DragEvent) { e.preventDefault(); }
	async function handleDrop(e: DragEvent) { e.preventDefault(); isDragging = false; if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) await handleFiles(Array.from(e.dataTransfer.files)); }
	function openFilePicker() { fileInput?.click(); }
	async function handleFileInput(e: Event) { const target = e.target as HTMLInputElement; if (target.files) await handleFiles(Array.from(target.files)); target.value = ''; }
</script>

<svelte:head><title>Reorder Pages - Smash</title></svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />
	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div class="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-orange-500/10 to-red-500/10 blur-3xl"></div>
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-12">
		<div class="mx-auto max-w-5xl">
			<div class="text-center mb-8" in:fade={{ duration: 200 }}>
				<div class="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-400 mb-4">
					<ArrowUpDown class="h-4 w-4" />
					Reorder Pages
				</div>
				<h1 class="text-3xl font-bold text-surface-100">Drag and drop to reorder</h1>
				<p class="mt-2 text-surface-500">Rearrange pages by dragging them to a new position</p>
			</div>

			{#if !hasFile}
				<div role="button" tabindex="0" ondragenter={handleDragEnter} ondragleave={handleDragLeave} ondragover={handleDragOver} ondrop={handleDrop} onclick={openFilePicker} onkeydown={(e) => e.key === 'Enter' && openFilePicker()} class="relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer py-16 {isDragging ? 'border-accent-start bg-accent-start/10 scale-[1.02]' : 'border-surface-700 hover:border-surface-600 bg-surface-900/50'}">
					<input bind:this={fileInput} type="file" accept=".pdf,application/pdf" class="hidden" onchange={handleFileInput} />
					<div class="flex flex-col items-center justify-center gap-4 px-6">
						<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20"><Upload class="h-8 w-8 text-orange-400" /></div>
						<p class="text-lg font-medium text-surface-200">Drop a PDF here or click to browse</p>
					</div>
				</div>
			{:else if isLoadingThumbnails}
				<div class="flex flex-col items-center justify-center py-16">
					<Loader2 class="h-12 w-12 text-accent-start animate-spin mb-4" />
					<p class="text-surface-400">Loading page thumbnails...</p>
				</div>
			{:else if pdfFile}
				<div class="glass rounded-2xl p-4 mb-4">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<FileText class="h-6 w-6 text-surface-400" />
							<div>
								<p class="font-medium text-surface-200">{pdfFile.file.name}</p>
								<p class="text-sm text-surface-500">{formatBytes(pdfFile.file.size)} • {pdfFile.pageCount} pages</p>
							</div>
						</div>
						<button onclick={removeFile} class="p-2 text-surface-500 hover:text-red-400"><Trash2 class="h-5 w-5" /></button>
					</div>
				</div>

				<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-6">
					{#each pdfFile.pages as page (page.pageNum)}
						<div
							class="relative group cursor-grab active:cursor-grabbing rounded-xl overflow-hidden border-2 {draggedPage === page.pageNum ? 'opacity-50 border-accent-start' : 'border-transparent hover:border-surface-600'} transition-all"
							draggable="true"
							ondragstart={(e) => handlePageDragStart(e, page.pageNum)}
							ondragover={(e) => handlePageDragOver(e, page.pageNum)}
							ondragend={handlePageDragEnd}
							animate:flip={{ duration: 200 }}
						>
							<img src={page.thumbnail} alt="Page {page.pageNum}" class="w-full aspect-[3/4] object-cover bg-surface-800" />
							<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
								<GripVertical class="h-5 w-5 text-white" />
							</div>
							<div class="absolute top-1 left-1 bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded">{pdfFile.pages.indexOf(page) + 1}</div>
						</div>
					{/each}
				</div>

				{#if isProcessing}
					<div class="mb-4"><div class="h-2 bg-surface-700 rounded-full overflow-hidden"><div class="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all" style="width: {progress}%"></div></div></div>
				{/if}

				{#if resultBlob}
					<div class="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30" in:fly={{ y: 10, duration: 200 }}>
						<div class="flex items-center justify-between">
							<p class="text-green-400 font-medium flex items-center gap-2"><CheckCircle class="h-4 w-4" /> Reorder complete!</p>
							<button onclick={downloadResult} class="flex items-center gap-2 rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600"><Download class="h-3 w-3" /> Download</button>
						</div>
					</div>
				{/if}

				<button onclick={handleReorder} disabled={isProcessing} class="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
					{#if isProcessing}<Loader2 class="h-5 w-5 animate-spin" /> Saving...{:else}<ArrowUpDown class="h-5 w-5" /> Save New Order{/if}
				</button>
			{/if}
		</div>
	</main>
	<Footer />
</div>
<Toast />
