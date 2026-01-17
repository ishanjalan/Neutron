<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Toast, { toast } from '$lib/components/Toast.svelte';
	import { pdfToImages, getOutputFilename, generateThumbnail, getPageCount } from '$lib/utils/pdf';
	import { formatBytes } from '$lib/stores/pdfs.svelte';
	import { Image, Upload, FileText, Download, Trash2, Loader2, CheckCircle, Settings } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';

	interface PDFFile {
		id: string;
		file: File;
		originalUrl: string;
		thumbnail?: string;
		pageCount?: number;
	}

	type ImageFormat = 'png' | 'jpg' | 'webp';

	let pdfFile = $state<PDFFile | null>(null);
	let isProcessing = $state(false);
	let imageFormat = $state<ImageFormat>('png');
	let imageDPI = $state(150);
	let imageQuality = $state(90);
	let resultBlobs = $state<Blob[]>([]);
	let progress = $state(0);
	let fileInput: HTMLInputElement;
	let isDragging = $state(false);

	const hasFile = $derived(pdfFile !== null);

	function generateId(): string {
		return `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	async function handleFiles(newFiles: File[]) {
		const file = newFiles.find(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
		if (!file) { toast.error('Please select a PDF file'); return; }
		if (pdfFile) URL.revokeObjectURL(pdfFile.originalUrl);

		const newPdf: PDFFile = { id: generateId(), file, originalUrl: URL.createObjectURL(file) };
		try {
			newPdf.thumbnail = await generateThumbnail(file);
			newPdf.pageCount = await getPageCount(file);
		} catch (e) { console.warn('Failed to get PDF metadata:', e); }

		pdfFile = newPdf;
		resultBlobs = [];
		toast.success('PDF loaded');
	}

	function removeFile() {
		if (pdfFile) { URL.revokeObjectURL(pdfFile.originalUrl); pdfFile = null; resultBlobs = []; }
	}

	async function handleConvert() {
		if (!pdfFile) return;

		isProcessing = true;
		progress = 0;
		resultBlobs = [];

		try {
			const results = await pdfToImages(pdfFile.file, {
				format: imageFormat,
				dpi: imageDPI,
				quality: imageQuality,
				onProgress: (p) => { progress = p; }
			});
			resultBlobs = results;
			toast.success(`Converted ${results.length} page(s) to images`);
		} catch (error) {
			console.error('Convert error:', error);
			toast.error(error instanceof Error ? error.message : 'Conversion failed');
		} finally {
			isProcessing = false;
		}
	}

	function downloadResult(index: number) {
		const blob = resultBlobs[index];
		if (!blob || !pdfFile) return;
		const baseName = getOutputFilename(pdfFile.file.name, 'pdf-to-images', index);
		const filename = `${baseName}.${imageFormat}`;
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url; a.download = filename;
		document.body.appendChild(a); a.click(); document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	async function downloadAll() {
		if (resultBlobs.length === 0 || !pdfFile) return;
		const { default: JSZip } = await import('jszip');
		const zip = new JSZip();
		for (let i = 0; i < resultBlobs.length; i++) {
			const baseName = getOutputFilename(pdfFile.file.name, 'pdf-to-images', i);
			zip.file(`${baseName}.${imageFormat}`, resultBlobs[i]);
		}
		const blob = await zip.generateAsync({ type: 'blob' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url; a.download = `${pdfFile.file.name.replace('.pdf', '')}-images.zip`;
		document.body.appendChild(a); a.click(); document.body.removeChild(a);
		URL.revokeObjectURL(url);
		toast.success(`Downloaded ${resultBlobs.length} images as ZIP`);
	}

	function handleDragEnter(e: DragEvent) { e.preventDefault(); isDragging = true; }
	function handleDragLeave(e: DragEvent) { e.preventDefault(); const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) isDragging = false; }
	function handleDragOver(e: DragEvent) { e.preventDefault(); }
	async function handleDrop(e: DragEvent) { e.preventDefault(); isDragging = false; if (e.dataTransfer?.files) await handleFiles(Array.from(e.dataTransfer.files)); }
	function openFilePicker() { fileInput?.click(); }
	async function handleFileInput(e: Event) { const target = e.target as HTMLInputElement; if (target.files) await handleFiles(Array.from(target.files)); target.value = ''; }
</script>

<svelte:head><title>PDF to Images - Smash</title></svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />
	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div class="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-teal-500/10 to-green-500/10 blur-3xl"></div>
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-12">
		<div class="mx-auto max-w-4xl">
			<div class="text-center mb-8" in:fade={{ duration: 200 }}>
				<div class="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-4 py-1.5 text-sm font-medium text-teal-400 mb-4">
					<Image class="h-4 w-4" /> PDF to Images
				</div>
				<h1 class="text-3xl font-bold text-surface-100">Convert PDF pages to images</h1>
				<p class="mt-2 text-surface-500">Export each page as PNG, JPG, or WebP</p>
			</div>

			<div class="grid gap-6 lg:grid-cols-2">
				<div>
					{#if !hasFile}
						<div role="button" tabindex="0" ondragenter={handleDragEnter} ondragleave={handleDragLeave} ondragover={handleDragOver} ondrop={handleDrop} onclick={openFilePicker} onkeydown={(e) => e.key === 'Enter' && openFilePicker()} class="relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer py-16 {isDragging ? 'border-accent-start bg-accent-start/10 scale-[1.02]' : 'border-surface-700 hover:border-surface-600 bg-surface-900/50'}">
							<input bind:this={fileInput} type="file" accept=".pdf,application/pdf" class="hidden" onchange={handleFileInput} />
							<div class="flex flex-col items-center justify-center gap-4 px-6">
								<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-green-500/20"><Upload class="h-8 w-8 text-teal-400" /></div>
								<p class="text-lg font-medium text-surface-200">Drop a PDF here or click to browse</p>
							</div>
						</div>
					{:else if pdfFile}
						<div class="glass rounded-2xl p-4" in:fly={{ y: 20, duration: 200 }}>
							<div class="flex items-start gap-4">
								<div class="h-24 w-20 rounded-lg bg-surface-800 overflow-hidden flex-shrink-0">
									{#if pdfFile.thumbnail}<img src={pdfFile.thumbnail} alt="" class="w-full h-full object-cover" />{:else}<div class="w-full h-full flex items-center justify-center"><FileText class="h-10 w-10 text-surface-500" /></div>{/if}
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-medium text-surface-200 truncate">{pdfFile.file.name}</p>
									<p class="text-sm text-surface-500 mt-1">{formatBytes(pdfFile.file.size)} • {pdfFile.pageCount} pages</p>
									<button onclick={removeFile} class="mt-2 text-sm text-red-400 hover:text-red-300 flex items-center gap-1"><Trash2 class="h-3 w-3" /> Remove</button>
								</div>
							</div>
							{#if isProcessing}<div class="mt-4"><div class="h-2 bg-surface-700 rounded-full overflow-hidden"><div class="h-full bg-gradient-to-r from-teal-500 to-green-500 transition-all" style="width: {progress}%"></div></div><p class="text-sm text-surface-400 mt-1 text-center">Converting page {Math.ceil((progress / 100) * (pdfFile.pageCount || 1))} of {pdfFile.pageCount}...</p></div>{/if}
						</div>
						{#if resultBlobs.length > 0}
							<div class="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30" in:fly={{ y: 10, duration: 200 }}>
								<div class="flex items-center justify-between mb-3">
									<p class="text-green-400 font-medium flex items-center gap-2"><CheckCircle class="h-4 w-4" /> {resultBlobs.length} images created</p>
									<button onclick={downloadAll} class="flex items-center gap-2 rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600"><Download class="h-3 w-3" /> Download All</button>
								</div>
								<div class="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
									{#each resultBlobs as blob, i}
										<button onclick={() => downloadResult(i)} class="relative group rounded-lg overflow-hidden bg-surface-800">
											<img src={URL.createObjectURL(blob)} alt="Page {i + 1}" class="w-full aspect-[3/4] object-cover" />
											<div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Download class="h-5 w-5 text-white" /></div>
											<div class="absolute bottom-0.5 left-0.5 bg-black/70 text-white text-[10px] px-1 rounded">{i + 1}</div>
										</button>
									{/each}
								</div>
							</div>
						{/if}
					{/if}
				</div>

				<div class="glass rounded-2xl p-6" in:fly={{ y: 20, delay: 100, duration: 200 }}>
					<h3 class="flex items-center gap-2 text-lg font-semibold text-surface-100 mb-6"><Settings class="h-5 w-5 text-accent-start" /> Export Settings</h3>
					<div class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-surface-300 mb-2">Format</label>
							<div class="grid grid-cols-3 gap-2">
								{#each ['png', 'jpg', 'webp'] as fmt}
									<button onclick={() => imageFormat = fmt as ImageFormat} class="px-3 py-2 rounded-xl text-center uppercase text-sm font-bold transition-all {imageFormat === fmt ? 'bg-accent-start text-white' : 'bg-surface-800 text-surface-400 hover:text-surface-200 hover:bg-surface-700'}">{fmt}</button>
								{/each}
							</div>
						</div>
						<div>
							<label class="block text-sm font-medium text-surface-300 mb-2">DPI (Resolution)</label>
							<div class="grid grid-cols-3 gap-2">
								{#each [72, 150, 300] as dpi}
									<button onclick={() => imageDPI = dpi} class="px-3 py-2 rounded-xl text-center text-sm transition-all {imageDPI === dpi ? 'bg-accent-start text-white' : 'bg-surface-800 text-surface-400 hover:text-surface-200 hover:bg-surface-700'}"><span class="font-bold">{dpi}</span> DPI</button>
								{/each}
							</div>
						</div>
						{#if imageFormat !== 'png'}
							<div>
								<label class="block text-sm font-medium text-surface-300 mb-2">Quality: {imageQuality}%</label>
								<input type="range" min="10" max="100" step="5" bind:value={imageQuality} class="w-full accent-accent-start" />
							</div>
						{/if}
					</div>
					<button onclick={handleConvert} disabled={!hasFile || isProcessing} class="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-green-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
						{#if isProcessing}<Loader2 class="h-5 w-5 animate-spin" /> Converting...{:else}<Image class="h-5 w-5" /> Convert to Images{/if}
					</button>
				</div>
			</div>
		</div>
	</main>
	<Footer />
</div>
<Toast />
