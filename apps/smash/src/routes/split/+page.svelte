<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { Toast, toast } from '@neutron/ui';
	import { splitPDF, getOutputFilename, generateThumbnail, getPageCount } from '$lib/utils/pdf';
	import { formatBytes } from '$lib/stores/pdfs.svelte';
	import {
		Scissors,
		Upload,
		FileText,
		Download,
		Trash2,
		Loader2,
		CheckCircle,
		Settings,
	} from 'lucide-svelte';
	import { fade, fly, slide } from 'svelte/transition';

	interface PDFFile {
		id: string;
		file: File;
		originalUrl: string;
		thumbnail?: string;
		pageCount?: number;
	}

	type SplitMode = 'extract' | 'every-n';

	let pdfFile = $state<PDFFile | null>(null);
	let isProcessing = $state(false);
	let splitMode = $state<SplitMode>('extract');
	let pageRange = $state('');
	let everyN = $state(1);
	let resultBlobs = $state<Blob[]>([]);
	let progress = $state(0);
	let fileInput: HTMLInputElement;
	let isDragging = $state(false);

	const hasFile = $derived(pdfFile !== null);

	function generateId(): string {
		return `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	async function handleFiles(newFiles: File[]) {
		const file = newFiles.find((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
		if (!file) {
			toast.error('Please select a PDF file');
			return;
		}

		if (pdfFile) {
			URL.revokeObjectURL(pdfFile.originalUrl);
		}

		const newPdf: PDFFile = {
			id: generateId(),
			file,
			originalUrl: URL.createObjectURL(file),
		};

		try {
			newPdf.thumbnail = await generateThumbnail(file);
			newPdf.pageCount = await getPageCount(file);
		} catch (e) {
			console.warn('Failed to get PDF metadata:', e);
		}

		pdfFile = newPdf;
		resultBlobs = [];
		toast.success('PDF loaded');
	}

	function removeFile() {
		if (pdfFile) {
			URL.revokeObjectURL(pdfFile.originalUrl);
			pdfFile = null;
			resultBlobs = [];
		}
	}

	function parsePageRange(rangeStr: string, maxPages: number): number[] {
		const pages = new Set<number>();
		const parts = rangeStr.split(',').map((s) => s.trim());

		for (const part of parts) {
			if (part.includes('-')) {
				const [start, end] = part.split('-').map((s) => parseInt(s.trim(), 10));
				if (!isNaN(start) && !isNaN(end)) {
					for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
						pages.add(i);
					}
				}
			} else {
				const page = parseInt(part, 10);
				if (!isNaN(page) && page >= 1 && page <= maxPages) {
					pages.add(page);
				}
			}
		}

		return Array.from(pages).sort((a, b) => a - b);
	}

	async function handleSplit() {
		if (!pdfFile) return;

		isProcessing = true;
		progress = 0;
		resultBlobs = [];

		try {
			let results: Blob[];

			if (splitMode === 'every-n') {
				results = await splitPDF(pdfFile.file, {
					mode: 'every-n',
					everyN,
					onProgress: (p) => {
						progress = p;
					},
				});
			} else {
				const pages = parsePageRange(pageRange, pdfFile.pageCount || 0);
				if (pages.length === 0) {
					throw new Error('No valid pages selected');
				}
				results = await splitPDF(pdfFile.file, {
					mode: 'extract',
					pages,
					onProgress: (p) => {
						progress = p;
					},
				});
			}

			resultBlobs = results;
			toast.success(`Split into ${results.length} file(s)`);
		} catch (error) {
			console.error('Split error:', error);
			toast.error(error instanceof Error ? error.message : 'Split failed');
		} finally {
			isProcessing = false;
		}
	}

	function downloadResult(index: number) {
		const blob = resultBlobs[index];
		if (!blob || !pdfFile) return;

		const filename = getOutputFilename(pdfFile.file.name, 'split', index);
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	async function downloadAll() {
		if (resultBlobs.length === 0 || !pdfFile) return;

		if (resultBlobs.length === 1) {
			downloadResult(0);
			return;
		}

		const { default: JSZip } = await import('jszip');
		const zip = new JSZip();

		for (let i = 0; i < resultBlobs.length; i++) {
			const filename = getOutputFilename(pdfFile.file.name, 'split', i);
			zip.file(filename, resultBlobs[i]);
		}

		const blob = await zip.generateAsync({ type: 'blob' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `split-${pdfFile.file.name.replace('.pdf', '')}-${Date.now()}.zip`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		toast.success(`Downloaded ${resultBlobs.length} files as ZIP`);
	}

	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		if (
			e.clientX < rect.left ||
			e.clientX > rect.right ||
			e.clientY < rect.top ||
			e.clientY > rect.bottom
		) {
			isDragging = false;
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const droppedFiles = e.dataTransfer?.files;
		if (droppedFiles && droppedFiles.length > 0) {
			await handleFiles(Array.from(droppedFiles));
		}
	}

	function openFilePicker() {
		fileInput?.click();
	}

	async function handleFileInput(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			await handleFiles(Array.from(target.files));
		}
		target.value = '';
	}
</script>

<svelte:head>
	<title>Split PDF - Smash</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />

	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -right-1/4 -top-1/2 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-pink-500/10 to-rose-500/10 blur-3xl"
		></div>
	</div>

	<main class="flex-1 px-4 pb-12 pt-28 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-4xl">
			<!-- Header -->
			<div class="mb-8 text-center" in:fade={{ duration: 200 }}>
				<div
					class="mb-4 inline-flex items-center gap-2 rounded-full bg-pink-500/10 px-4 py-1.5 text-sm font-medium text-pink-400"
				>
					<Scissors class="h-4 w-4" />
					Split PDF
				</div>
				<h1 class="text-surface-100 text-3xl font-bold">Extract or split pages from PDF</h1>
				<p class="text-surface-500 mt-2">Choose specific pages or split every N pages</p>
			</div>

			<div class="grid gap-6 lg:grid-cols-2">
				<!-- Left: File -->
				<div>
					{#if !hasFile}
						<!-- Drop Zone -->
						<div
							role="button"
							tabindex="0"
							ondragenter={handleDragEnter}
							ondragleave={handleDragLeave}
							ondragover={handleDragOver}
							ondrop={handleDrop}
							onclick={openFilePicker}
							onkeydown={(e) => e.key === 'Enter' && openFilePicker()}
							class="relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed py-16 transition-all duration-300 {isDragging
								? 'border-accent-start bg-accent-start/10 scale-[1.02]'
								: 'border-surface-700 hover:border-surface-600 bg-surface-900/50'}"
						>
							<input
								bind:this={fileInput}
								type="file"
								accept=".pdf,application/pdf"
								class="hidden"
								onchange={handleFileInput}
							/>
							<div class="flex flex-col items-center justify-center gap-4 px-6">
								<div
									class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20"
								>
									<Upload class="h-8 w-8 text-pink-400" />
								</div>
								<p class="text-surface-200 text-lg font-medium">
									Drop a PDF here or click to browse
								</p>
							</div>
						</div>
					{:else if pdfFile}
						<!-- File Card -->
						<div class="glass rounded-2xl p-4" in:fly={{ y: 20, duration: 200 }}>
							<div class="flex items-start gap-4">
								<div class="bg-surface-800 h-24 w-20 flex-shrink-0 overflow-hidden rounded-lg">
									{#if pdfFile.thumbnail}
										<img src={pdfFile.thumbnail} alt="" class="h-full w-full object-cover" />
									{:else}
										<div class="flex h-full w-full items-center justify-center">
											<FileText class="text-surface-500 h-10 w-10" />
										</div>
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-surface-200 truncate font-medium">{pdfFile.file.name}</p>
									<p class="text-surface-500 mt-1 text-sm">{formatBytes(pdfFile.file.size)}</p>
									<p class="text-surface-500 text-sm">{pdfFile.pageCount} pages</p>
									<button
										onclick={removeFile}
										class="mt-2 flex items-center gap-1 text-sm text-red-400 hover:text-red-300"
									>
										<Trash2 class="h-3 w-3" />
										Remove
									</button>
								</div>
							</div>

							{#if isProcessing}
								<div class="mt-4">
									<div class="bg-surface-700 h-2 overflow-hidden rounded-full">
										<div
											class="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all"
											style="width: {progress}%"
										></div>
									</div>
									<p class="text-surface-400 mt-1 text-center text-sm">Processing... {progress}%</p>
								</div>
							{/if}
						</div>

						<!-- Results -->
						{#if resultBlobs.length > 0}
							<div
								class="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 p-4"
								in:fly={{ y: 10, duration: 200 }}
							>
								<div class="mb-3 flex items-center justify-between">
									<p class="flex items-center gap-2 font-medium text-green-400">
										<CheckCircle class="h-4 w-4" />
										{resultBlobs.length} file{resultBlobs.length !== 1 ? 's' : ''} created
									</p>
									<button
										onclick={downloadAll}
										class="flex items-center gap-2 rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600"
									>
										<Download class="h-3 w-3" />
										Download All
									</button>
								</div>
								<div class="max-h-40 space-y-1 overflow-y-auto">
									{#each resultBlobs as blob, i}
										<div class="flex items-center justify-between py-1 text-sm">
											<span class="text-surface-400">Part {i + 1} ({formatBytes(blob.size)})</span>
											<button
												onclick={() => downloadResult(i)}
												class="text-accent-start hover:text-accent-end"
											>
												<Download class="h-4 w-4" />
											</button>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					{/if}
				</div>

				<!-- Right: Settings -->
				<div class="glass rounded-2xl p-6" in:fly={{ y: 20, delay: 100, duration: 200 }}>
					<h3 class="text-surface-100 mb-6 flex items-center gap-2 text-lg font-semibold">
						<Settings class="text-accent-start h-5 w-5" />
						Split Options
					</h3>

					<!-- Mode Selection -->
					<div class="space-y-4">
						<div>
							<label class="text-surface-300 mb-3 block text-sm font-medium">Split Method</label>
							<div class="grid grid-cols-2 gap-2">
								<button
									onclick={() => (splitMode = 'extract')}
									class="rounded-xl px-4 py-3 text-left transition-all {splitMode === 'extract'
										? 'bg-accent-start text-white'
										: 'bg-surface-800 text-surface-400 hover:text-surface-200 hover:bg-surface-700'}"
								>
									<span class="block font-medium">Extract Pages</span>
									<span class="text-xs opacity-70">Select specific pages</span>
								</button>
								<button
									onclick={() => (splitMode = 'every-n')}
									class="rounded-xl px-4 py-3 text-left transition-all {splitMode === 'every-n'
										? 'bg-accent-start text-white'
										: 'bg-surface-800 text-surface-400 hover:text-surface-200 hover:bg-surface-700'}"
								>
									<span class="block font-medium">Split Every N</span>
									<span class="text-xs opacity-70">Create multiple files</span>
								</button>
							</div>
						</div>

						{#if splitMode === 'extract'}
							<div in:slide={{ duration: 150 }}>
								<label class="text-surface-300 mb-2 block text-sm font-medium">Page Range</label>
								<input
									type="text"
									bind:value={pageRange}
									placeholder="e.g., 1-5, 8, 12-15"
									class="bg-surface-800 border-surface-700 text-surface-100 placeholder:text-surface-600 focus:border-accent-start w-full rounded-xl border px-4 py-2.5 focus:outline-none"
								/>
								<p class="text-surface-500 mt-1 text-xs">
									{#if pdfFile}
										Document has {pdfFile.pageCount} pages
									{:else}
										Enter page numbers or ranges
									{/if}
								</p>
							</div>
						{:else}
							<div in:slide={{ duration: 150 }}>
								<label class="text-surface-300 mb-2 block text-sm font-medium">Split every</label>
								<div class="flex items-center gap-2">
									<input
										type="number"
										bind:value={everyN}
										min="1"
										max={pdfFile?.pageCount || 100}
										class="bg-surface-800 border-surface-700 text-surface-100 focus:border-accent-start w-24 rounded-xl border px-4 py-2.5 focus:outline-none"
									/>
									<span class="text-surface-400">page{everyN !== 1 ? 's' : ''}</span>
								</div>
								<p class="text-surface-500 mt-1 text-xs">
									{#if pdfFile && everyN > 0}
										Will create ~{Math.ceil((pdfFile.pageCount || 1) / everyN)} files
									{/if}
								</p>
							</div>
						{/if}
					</div>

					<!-- Split Button -->
					<button
						onclick={handleSplit}
						disabled={!hasFile || isProcessing || (splitMode === 'extract' && !pageRange)}
						class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-pink-500/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-pink-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
					>
						{#if isProcessing}
							<Loader2 class="h-5 w-5 animate-spin" />
							Splitting...
						{:else}
							<Scissors class="h-5 w-5" />
							Split PDF
						{/if}
					</button>
				</div>
			</div>
		</div>
	</main>

	<Footer />
</div>

<Toast />
