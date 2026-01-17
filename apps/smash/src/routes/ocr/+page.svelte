<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { Toast, toast } from '@neutron/ui';
	import {
		performOCR,
		LANGUAGE_OPTIONS,
		OUTPUT_MODE_OPTIONS,
		estimateProcessingTime,
		type OCRLanguage,
		type OCROutputMode,
		type OCRResult,
	} from '$lib/utils/ocr';
	import { generateThumbnail, getPageCount } from '$lib/utils/pdf';
	import { formatBytes } from '$lib/stores/pdfs.svelte';
	import {
		FileSearch,
		Upload,
		FileText,
		Download,
		Trash2,
		Loader2,
		CheckCircle,
		AlertCircle,
		Settings,
		Languages,
		FileOutput,
		Clock,
		BarChart3,
	} from 'lucide-svelte';
	import { fade, fly, slide } from 'svelte/transition';

	// Types
	interface PDFFile {
		id: string;
		file: File;
		originalUrl: string;
		thumbnail?: string;
		pageCount?: number;
		status: 'pending' | 'processing' | 'completed' | 'error';
		progress: number;
		progressStage?: string;
		error?: string;
		ocrResult?: OCRResult;
	}

	// State
	let files = $state<PDFFile[]>([]);
	let isProcessing = $state(false);
	let language = $state<OCRLanguage>('eng');
	let outputMode = $state<OCROutputMode>('searchable-pdf');
	let fileInput: HTMLInputElement;
	let isDragging = $state(false);

	// Derived state
	const hasFiles = $derived(files.length > 0);
	const pendingCount = $derived(files.filter((f) => f.status === 'pending').length);
	const completedCount = $derived(files.filter((f) => f.status === 'completed').length);
	const totalPages = $derived(files.reduce((sum, f) => sum + (f.pageCount || 1), 0));
	const estimatedTime = $derived(estimateProcessingTime(totalPages));

	function generateId(): string {
		return `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	async function handleFiles(newFiles: File[]) {
		const pdfFiles = newFiles.filter(
			(f) => f.type === 'application/pdf' || f.name.endsWith('.pdf')
		);
		if (pdfFiles.length === 0) {
			toast.error('Please select PDF files');
			return;
		}

		const newPdfFiles: PDFFile[] = [];

		for (const file of pdfFiles) {
			const pdfFile: PDFFile = {
				id: generateId(),
				file,
				originalUrl: URL.createObjectURL(file),
				status: 'pending',
				progress: 0,
			};

			// Get metadata
			try {
				pdfFile.thumbnail = await generateThumbnail(file);
				pdfFile.pageCount = await getPageCount(file);
			} catch (e) {
				console.warn('Failed to get PDF metadata:', e);
			}

			newPdfFiles.push(pdfFile);
		}

		files = [...files, ...newPdfFiles];
		toast.success(`Added ${pdfFiles.length} PDF(s)`);
	}

	function removeFile(id: string) {
		const file = files.find((f) => f.id === id);
		if (file) {
			URL.revokeObjectURL(file.originalUrl);
		}
		files = files.filter((f) => f.id !== id);
	}

	async function handleOCR() {
		if (files.length === 0) return;

		isProcessing = true;

		const pendingFiles = files.filter((f) => f.status === 'pending' || f.status === 'error');

		for (const pdfFile of pendingFiles) {
			files = files.map((f) =>
				f.id === pdfFile.id
					? { ...f, status: 'processing' as const, progress: 0, progressStage: 'Initializing...' }
					: f
			);

			try {
				const result = await performOCR(pdfFile.file, {
					language,
					outputMode,
					onProgress: (progress, stage) => {
						files = files.map((f) =>
							f.id === pdfFile.id ? { ...f, progress, progressStage: stage } : f
						);
					},
				});

				files = files.map((f) =>
					f.id === pdfFile.id
						? {
								...f,
								status: 'completed' as const,
								progress: 100,
								ocrResult: result,
								progressStage: `Done in ${(result.processingTimeMs / 1000).toFixed(1)}s (${result.confidence.toFixed(0)}% confidence)`,
							}
						: f
				);
			} catch (error) {
				console.error('OCR error:', error);
				files = files.map((f) =>
					f.id === pdfFile.id
						? {
								...f,
								status: 'error' as const,
								error: error instanceof Error ? error.message : 'OCR failed',
							}
						: f
				);
			}
		}

		isProcessing = false;

		if (completedCount > 0) {
			toast.success(`Processed ${completedCount} PDF(s) with OCR`);
		}
	}

	function downloadSearchablePdf(pdfFile: PDFFile) {
		if (!pdfFile.ocrResult?.searchablePdf) return;
		const url = URL.createObjectURL(pdfFile.ocrResult.searchablePdf);
		const a = document.createElement('a');
		a.href = url;
		a.download = pdfFile.file.name.replace('.pdf', '-searchable.pdf');
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function downloadText(pdfFile: PDFFile) {
		if (!pdfFile.ocrResult?.text) return;
		const blob = new Blob([pdfFile.ocrResult.text], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = pdfFile.file.name.replace('.pdf', '-text.txt');
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const droppedFiles = Array.from(e.dataTransfer?.files || []);
		handleFiles(droppedFiles);
	}

	function handleInputChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const selectedFiles = Array.from(input.files || []);
		handleFiles(selectedFiles);
		input.value = '';
	}
</script>

<svelte:head>
	<title>OCR - Extract Text from PDFs - Smash</title>
</svelte:head>

<div class="bg-surface-950 text-surface-200 flex min-h-screen flex-col">
	<Header />

	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -right-1/4 -top-1/2 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-sky-500/10 to-cyan-500/10 blur-3xl"
		></div>
		<div
			class="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-cyan-500/10 to-sky-500/10 blur-3xl"
		></div>
	</div>

	<main class="flex-1 px-4 pb-12 pt-28 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-5xl">
			<!-- Header -->
			<div class="mb-8 text-center" in:fade={{ duration: 200 }}>
				<div
					class="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-4 py-1.5 text-sm font-medium text-sky-400"
				>
					<FileSearch class="h-4 w-4" />
					OCR - Text Recognition
				</div>
				<h1 class="text-surface-100 text-3xl font-bold">
					Extract <span
						class="bg-gradient-to-r from-sky-400 to-cyan-400 bg-clip-text text-transparent"
						>searchable text</span
					> from scanned PDFs
				</h1>
				<p class="text-surface-500 mt-2">
					Use AI-powered OCR to make scanned documents searchable and selectable
				</p>
			</div>

			<div class="grid gap-6 lg:grid-cols-2">
				<!-- Left: Drop zone and file list -->
				<div>
					<!-- Drop Zone -->
					<div
						class="relative rounded-2xl border-2 border-dashed transition-all duration-200 {isDragging
							? 'border-sky-400 bg-sky-500/10'
							: 'border-surface-700 bg-surface-900/50 hover:border-surface-600'} {hasFiles
							? 'p-4'
							: 'p-8'}"
						ondragover={handleDragOver}
						ondragleave={handleDragLeave}
						ondrop={handleDrop}
						role="button"
						tabindex="0"
						onclick={() => fileInput?.click()}
						onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
					>
						<input
							bind:this={fileInput}
							type="file"
							accept=".pdf,application/pdf"
							multiple
							class="hidden"
							onchange={handleInputChange}
						/>

						{#if !hasFiles}
							<div class="text-center">
								<div
									class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10"
								>
									<Upload class="h-8 w-8 text-sky-400" />
								</div>
								<h3 class="text-surface-100 mb-1 text-lg font-semibold">
									Drop your scanned PDFs here
								</h3>
								<p class="text-surface-500 mb-4 text-sm">or click to browse files</p>
								<div
									class="bg-surface-800 text-surface-400 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs"
								>
									<FileText class="h-3 w-3" />
									PDF files only
								</div>
							</div>
						{:else}
							<div class="text-surface-400 flex items-center gap-2 text-sm">
								<Upload class="h-4 w-4" />
								<span>Drop more files or click to add</span>
							</div>
						{/if}
					</div>

					<!-- File List -->
					{#if hasFiles}
						<div class="mt-4 space-y-3" in:fly={{ y: 20, duration: 200 }}>
							{#each files as pdfFile (pdfFile.id)}
								<div
									class="glass flex items-start gap-4 rounded-xl p-4"
									in:slide={{ duration: 200 }}
								>
									<!-- Thumbnail -->
									<div class="bg-surface-800 h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg">
										{#if pdfFile.thumbnail}
											<img src={pdfFile.thumbnail} alt="" class="h-full w-full object-cover" />
										{:else}
											<div class="flex h-full w-full items-center justify-center">
												<FileText class="text-surface-600 h-6 w-6" />
											</div>
										{/if}
									</div>

									<!-- Info -->
									<div class="min-w-0 flex-1">
										<p class="text-surface-200 truncate text-sm font-medium">{pdfFile.file.name}</p>
										<div class="text-surface-500 mt-1 flex items-center gap-3 text-xs">
											<span>{formatBytes(pdfFile.file.size)}</span>
											{#if pdfFile.pageCount}
												<span>• {pdfFile.pageCount} page{pdfFile.pageCount !== 1 ? 's' : ''}</span>
											{/if}
										</div>

										{#if pdfFile.status === 'processing'}
											<div class="mt-2">
												<div class="bg-surface-700 h-1.5 overflow-hidden rounded-full">
													<div
														class="h-full bg-gradient-to-r from-sky-400 to-cyan-500 transition-all duration-300"
														style="width: {pdfFile.progress}%"
													></div>
												</div>
												{#if pdfFile.progressStage}
													<p class="text-surface-500 mt-1 text-xs">{pdfFile.progressStage}</p>
												{/if}
											</div>
										{:else if pdfFile.status === 'completed' && pdfFile.ocrResult}
											<div class="mt-2 flex items-center gap-4 text-xs">
												<span class="flex items-center gap-1 text-green-400">
													<CheckCircle class="h-3 w-3" />
													{pdfFile.ocrResult.confidence.toFixed(0)}% confidence
												</span>
												<span class="text-surface-500">
													{(pdfFile.ocrResult.processingTimeMs / 1000).toFixed(1)}s
												</span>
											</div>
										{:else if pdfFile.status === 'error'}
											<p class="mt-2 flex items-center gap-1 text-xs text-red-400">
												<AlertCircle class="h-3 w-3" />
												{pdfFile.error}
											</p>
										{/if}
									</div>

									<!-- Actions -->
									<div class="flex items-center gap-1">
										{#if pdfFile.status === 'processing'}
											<Loader2 class="h-5 w-5 animate-spin text-sky-400" />
										{:else if pdfFile.status === 'completed' && pdfFile.ocrResult}
											{#if pdfFile.ocrResult.searchablePdf}
												<button
													onclick={() => downloadSearchablePdf(pdfFile)}
													class="p-2 text-green-400 transition-colors hover:text-green-300"
													title="Download Searchable PDF"
												>
													<Download class="h-4 w-4" />
												</button>
											{/if}
											<button
												onclick={() => downloadText(pdfFile)}
												class="p-2 text-sky-400 transition-colors hover:text-sky-300"
												title="Download Text"
											>
												<FileOutput class="h-4 w-4" />
											</button>
										{/if}
										<button
											onclick={() => removeFile(pdfFile.id)}
											class="text-surface-500 p-2 transition-colors hover:text-red-400"
											title="Remove"
										>
											<Trash2 class="h-4 w-4" />
										</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Right: Settings -->
				<div class="glass rounded-2xl p-6" in:fly={{ y: 20, delay: 100, duration: 200 }}>
					<h3 class="text-surface-100 mb-6 flex items-center gap-2 text-lg font-semibold">
						<Settings class="h-5 w-5 text-sky-400" />
						OCR Settings
					</h3>

					<!-- Language -->
					<div class="mb-6">
						<label class="text-surface-300 mb-3 flex items-center gap-2 text-sm font-medium">
							<Languages class="h-4 w-4 text-sky-400" />
							Document Language
						</label>
						<select
							bind:value={language}
							class="bg-surface-800 border-surface-700 text-surface-100 w-full rounded-xl border px-4 py-3 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
						>
							{#each LANGUAGE_OPTIONS as opt}
								<option value={opt.value}>{opt.label} ({opt.native})</option>
							{/each}
						</select>
					</div>

					<!-- Output Mode -->
					<div class="mb-6">
						<label class="text-surface-300 mb-3 flex items-center gap-2 text-sm font-medium">
							<FileOutput class="h-4 w-4 text-sky-400" />
							Output Format
						</label>
						<div class="space-y-2">
							{#each OUTPUT_MODE_OPTIONS as opt}
								<button
									onclick={() => (outputMode = opt.value)}
									class="flex w-full items-start gap-3 rounded-xl p-3 transition-all {outputMode ===
									opt.value
										? 'border border-sky-500/50 bg-sky-500/20'
										: 'bg-surface-800 hover:bg-surface-700'}"
								>
									<div class="flex-1 text-left">
										<p class="text-surface-200 text-sm font-medium">{opt.label}</p>
										<p class="text-surface-500 text-xs">{opt.desc}</p>
									</div>
									{#if outputMode === opt.value}
										<CheckCircle class="h-5 w-5 flex-shrink-0 text-sky-400" />
									{/if}
								</button>
							{/each}
						</div>
					</div>

					<!-- Estimated Time -->
					{#if hasFiles}
						<div class="bg-surface-800/50 border-surface-700 mb-6 rounded-xl border p-3">
							<div class="flex items-center gap-2 text-sm">
								<Clock class="h-4 w-4 text-sky-400" />
								<span class="text-surface-300">Estimated time:</span>
								<span class="font-medium text-sky-400">{estimatedTime}</span>
							</div>
							<p class="text-surface-500 mt-1 text-xs">
								Processing {totalPages} page{totalPages !== 1 ? 's' : ''} with Tesseract OCR
							</p>
						</div>
					{/if}

					<!-- Info -->
					<div class="bg-surface-800/50 border-surface-700 mb-6 rounded-xl border p-3">
						<p class="text-surface-400 text-sm">
							<strong class="text-surface-300">How it works:</strong> OCR (Optical Character Recognition)
							scans your PDF images and extracts text, making them searchable and copyable. All processing
							happens locally in your browser.
						</p>
					</div>

					<!-- Process Button -->
					<button
						onclick={handleOCR}
						disabled={!hasFiles || isProcessing}
						class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-sky-500/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-sky-500/40 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if isProcessing}
							<Loader2 class="h-5 w-5 animate-spin" />
							Processing...
						{:else}
							<FileSearch class="h-5 w-5" />
							Run OCR on {files.length} PDF{files.length !== 1 ? 's' : ''}
						{/if}
					</button>
				</div>
			</div>
		</div>
	</main>

	<Footer />
</div>

<Toast />
