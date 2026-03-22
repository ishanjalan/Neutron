<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import { Footer } from '@neutron/ui';
	import { Toast, toast } from '@neutron/ui';
	import { downloadBlob } from '@neutron/utils';
	import {
		addPageNumbers,
		getOutputFilename,
		generateThumbnail,
		getPageCount,
	} from '$lib/utils/pdf';
	import { formatBytes } from '$lib/stores/pdfs.svelte';
	import {
		Hash,
		Upload,
		FileText,
		Download,
		Trash2,
		Loader2,
		CheckCircle,
	} from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';

	interface PDFFile {
		id: string;
		file: File;
		originalUrl: string;
		thumbnail?: string;
		pageCount?: number;
	}

	type Position = 'bottom-center' | 'bottom-right' | 'top-center' | 'top-right';

	let pdfFile = $state<PDFFile | null>(null);
	let isProcessing = $state(false);
	let resultBlob = $state<Blob | null>(null);
	let progress = $state(0);
	let fileInput: HTMLInputElement;
	let isDragging = $state(false);

	// Settings
	let position = $state<Position>('bottom-center');
	let startAt = $state(1);
	let fontSize = $state(12);

	const hasFile = $derived(pdfFile !== null);
	const canProcess = $derived(hasFile && startAt >= 1 && fontSize >= 6 && fontSize <= 72);

	function generateId(): string {
		return `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	async function handleFiles(newFiles: File[]) {
		const file = newFiles.find((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
		if (!file) {
			toast.error('Please select a PDF file');
			return;
		}
		if (pdfFile) URL.revokeObjectURL(pdfFile.originalUrl);

		const newPdf: PDFFile = { id: generateId(), file, originalUrl: URL.createObjectURL(file) };
		try {
			newPdf.thumbnail = await generateThumbnail(file);
			newPdf.pageCount = await getPageCount(file);
		} catch (e) {
			console.warn('Failed to get PDF metadata:', e);
		}

		pdfFile = newPdf;
		resultBlob = null;
		toast.success('PDF loaded');
	}

	function removeFile() {
		if (pdfFile) {
			URL.revokeObjectURL(pdfFile.originalUrl);
			pdfFile = null;
			resultBlob = null;
		}
	}

	async function handleProcess() {
		if (!pdfFile || !canProcess) return;

		isProcessing = true;
		progress = 0;
		resultBlob = null;

		try {
			const result = await addPageNumbers(pdfFile.file, {
				position,
				startAt,
				fontSize,
				onProgress: (p) => {
					progress = p;
				},
			});
			resultBlob = result;
			toast.success('Page numbers added!');
		} catch (error) {
			console.error('Add page numbers error:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to add page numbers');
		} finally {
			isProcessing = false;
		}
	}

	function downloadResult() {
		if (!resultBlob || !pdfFile) return;
		const filename = getOutputFilename(pdfFile.file.name, 'numbered');
		downloadBlob(resultBlob, filename);
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
		)
			isDragging = false;
	}
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}
	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (e.dataTransfer?.files) await handleFiles(Array.from(e.dataTransfer.files));
	}
	function openFilePicker() {
		fileInput?.click();
	}
	async function handleFileInput(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files) await handleFiles(Array.from(target.files));
		target.value = '';
	}
</script>

<svelte:head>
	<title>Add Page Numbers — Smash</title>
	<meta
		name="description"
		content="Add page numbers to any PDF. Choose position, starting number, and font size. Free, private, no upload."
	/>
	<meta property="og:title" content="Add Page Numbers — Smash" />
	<meta
		property="og:description"
		content="Add page numbers to any PDF. Choose position, starting number, and font size. Free, private, no upload."
	/>
	<link rel="canonical" href="https://ishanjalan.github.io/Smash/add-page-numbers" />
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />
	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-violet-500/10 to-purple-500/10 blur-3xl"
		></div>
	</div>

	<main class="flex-1 px-4 pt-28 pb-12 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-4xl">
			<div class="mb-8 text-center" in:fade={{ duration: 200 }}>
				<div
					class="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-400"
				>
					<Hash class="h-4 w-4" /> Add Page Numbers
				</div>
				<h1 class="text-surface-100 text-3xl font-bold">Add page numbers to your PDF</h1>
				<p class="text-surface-500 mt-2">Choose position, starting number, and font size</p>
			</div>

			<div class="grid gap-6 lg:grid-cols-2">
				<div>
					{#if !hasFile}
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
									class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20"
								>
									<Upload class="h-8 w-8 text-violet-400" />
								</div>
								<p class="text-surface-200 text-lg font-medium">
									Drop a PDF here or click to browse
								</p>
							</div>
						</div>
					{:else if pdfFile}
						<div class="glass rounded-2xl p-4" in:fly={{ y: 20, duration: 200 }}>
							<div class="flex items-start gap-4">
								<div class="bg-surface-800 h-24 w-20 flex-shrink-0 overflow-hidden rounded-lg">
									{#if pdfFile.thumbnail}<img
											src={pdfFile.thumbnail}
											alt=""
											class="h-full w-full object-cover"
										/>{:else}<div class="flex h-full w-full items-center justify-center">
											<FileText class="text-surface-500 h-10 w-10" />
										</div>{/if}
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-surface-200 truncate font-medium">{pdfFile.file.name}</p>
									<p class="text-surface-500 mt-1 text-sm">
										{formatBytes(pdfFile.file.size)} • {pdfFile.pageCount} pages
									</p>
									<button
										onclick={removeFile}
										class="mt-2 flex items-center gap-1 text-sm text-red-400 hover:text-red-300"
										><Trash2 class="h-3 w-3" /> Remove</button
									>
								</div>
							</div>
							{#if isProcessing}
								<div class="mt-4">
									<div class="bg-surface-700 h-2 overflow-hidden rounded-full">
										<div
											class="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all"
											style="width: {progress}%"
										></div>
									</div>
								</div>
							{/if}
						</div>

						{#if resultBlob}
							<div
								class="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4"
								in:fly={{ y: 10, duration: 200 }}
							>
								<div class="flex items-center justify-between">
									<div>
										<p class="flex items-center gap-2 font-medium text-violet-400">
											<CheckCircle class="h-4 w-4" /> Page numbers added!
										</p>
										<p class="text-surface-500 text-xs">Numbers added to all pages</p>
									</div>
									<button
										onclick={downloadResult}
										class="flex items-center gap-2 rounded-lg bg-violet-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-600"
										><Download class="h-3 w-3" /> Download</button
									>
								</div>
							</div>
						{/if}
					{/if}
				</div>

				<div class="glass rounded-2xl p-6" in:fly={{ y: 20, delay: 100, duration: 200 }}>
					<h3 class="text-surface-100 mb-6 flex items-center gap-2 text-lg font-semibold">
						<Hash class="text-accent-start h-5 w-5" /> Numbering Settings
					</h3>
					<div class="space-y-5">
						<div>
							<label class="text-surface-300 mb-2 block text-sm font-medium">Position</label>
							<div class="grid grid-cols-2 gap-2">
								{#each ['bottom-center', 'bottom-right', 'top-center', 'top-right'] as pos (pos)}
									<button
										onclick={() => (position = pos as Position)}
										class="rounded-lg border px-3 py-2 text-sm font-medium transition-all {position ===
										pos
											? 'border-violet-500 bg-violet-500/10 text-violet-400'
											: 'border-surface-700 bg-surface-800 text-surface-400 hover:border-surface-600 hover:text-surface-200'}"
									>
										{pos
											.split('-')
											.map((w) => w[0].toUpperCase() + w.slice(1))
											.join(' ')}
									</button>
								{/each}
							</div>
						</div>

						<div>
							<label class="text-surface-300 mb-2 block text-sm font-medium"
								>Start number: <span class="text-surface-100 font-semibold">{startAt}</span></label
							>
							<input
								type="number"
								bind:value={startAt}
								min="1"
								max="9999"
								class="bg-surface-800 border-surface-700 text-surface-100 focus:border-accent-start w-full rounded-xl border px-4 py-2.5 focus:outline-none"
							/>
						</div>

						<div>
							<label class="text-surface-300 mb-2 block text-sm font-medium"
								>Font size: <span class="text-surface-100 font-semibold">{fontSize}pt</span></label
							>
							<input
								type="range"
								bind:value={fontSize}
								min="6"
								max="36"
								step="1"
								class="w-full accent-violet-500"
							/>
							<div class="text-surface-600 mt-1 flex justify-between text-xs">
								<span>6pt</span><span>36pt</span>
							</div>
						</div>
					</div>

					<button
						onclick={handleProcess}
						disabled={!canProcess || isProcessing}
						class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
					>
						{#if isProcessing}<Loader2 class="h-5 w-5 animate-spin" /> Adding numbers...{:else}<Hash
								class="h-5 w-5"
							/> Add Page Numbers{/if}
					</button>
				</div>
			</div>
		</div>
	</main>
	<Footer currentApp="smash" />
</div>
<Toast />
