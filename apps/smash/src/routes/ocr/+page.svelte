<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { Toast, toast } from '@neutron/ui';
	import { performOCR, LANGUAGE_OPTIONS, OUTPUT_MODE_OPTIONS, estimateProcessingTime, type OCRLanguage, type OCROutputMode, type OCRResult } from '$lib/utils/ocr';
	import { generateThumbnail, getPageCount } from '$lib/utils/pdf';
	import { formatBytes } from '$lib/stores/pdfs.svelte';
	import { FileSearch, Upload, FileText, Download, Trash2, Loader2, CheckCircle, AlertCircle, Settings, Languages, FileOutput, Clock, BarChart3 } from 'lucide-svelte';
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
	const pendingCount = $derived(files.filter(f => f.status === 'pending').length);
	const completedCount = $derived(files.filter(f => f.status === 'completed').length);
	const totalPages = $derived(files.reduce((sum, f) => sum + (f.pageCount || 1), 0));
	const estimatedTime = $derived(estimateProcessingTime(totalPages));

	function generateId(): string {
		return `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	async function handleFiles(newFiles: File[]) {
		const pdfFiles = newFiles.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
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
				progress: 0
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
		const file = files.find(f => f.id === id);
		if (file) {
			URL.revokeObjectURL(file.originalUrl);
		}
		files = files.filter(f => f.id !== id);
	}

	async function handleOCR() {
		if (files.length === 0) return;

		isProcessing = true;

		const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');

		for (const pdfFile of pendingFiles) {
			files = files.map(f => f.id === pdfFile.id ? { ...f, status: 'processing' as const, progress: 0, progressStage: 'Initializing...' } : f);

			try {
				const result = await performOCR(pdfFile.file, {
					language,
					outputMode,
					onProgress: (progress, stage) => {
						files = files.map(f => f.id === pdfFile.id ? { ...f, progress, progressStage: stage } : f);
					}
				});

				files = files.map(f => f.id === pdfFile.id ? {
					...f,
					status: 'completed' as const,
					progress: 100,
					ocrResult: result,
					progressStage: `Done in ${(result.processingTimeMs / 1000).toFixed(1)}s (${result.confidence.toFixed(0)}% confidence)`
				} : f);

			} catch (error) {
				console.error('OCR error:', error);
				files = files.map(f => f.id === pdfFile.id ? {
					...f,
					status: 'error' as const,
					error: error instanceof Error ? error.message : 'OCR failed'
				} : f);
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

<div class="flex min-h-screen flex-col bg-surface-950 text-surface-200">
	<Header />

	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div class="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-sky-500/10 to-cyan-500/10 blur-3xl"></div>
		<div class="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-cyan-500/10 to-sky-500/10 blur-3xl"></div>
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-12">
		<div class="mx-auto max-w-5xl">
			<!-- Header -->
			<div class="text-center mb-8" in:fade={{ duration: 200 }}>
				<div class="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-4 py-1.5 text-sm font-medium text-sky-400 mb-4">
					<FileSearch class="h-4 w-4" />
					OCR - Text Recognition
				</div>
				<h1 class="text-3xl font-bold text-surface-100">
					Extract <span class="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">searchable text</span> from scanned PDFs
				</h1>
				<p class="mt-2 text-surface-500">
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
							: 'border-surface-700 bg-surface-900/50 hover:border-surface-600'} {hasFiles ? 'p-4' : 'p-8'}"
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
								<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10">
									<Upload class="h-8 w-8 text-sky-400" />
								</div>
								<h3 class="text-lg font-semibold text-surface-100 mb-1">
									Drop your scanned PDFs here
								</h3>
								<p class="text-sm text-surface-500 mb-4">
									or click to browse files
								</p>
								<div class="inline-flex items-center gap-2 rounded-full bg-surface-800 px-3 py-1 text-xs text-surface-400">
									<FileText class="h-3 w-3" />
									PDF files only
								</div>
							</div>
						{:else}
							<div class="flex items-center gap-2 text-sm text-surface-400">
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
									class="glass rounded-xl p-4 flex items-start gap-4"
									in:slide={{ duration: 200 }}
								>
									<!-- Thumbnail -->
									<div class="h-16 w-12 flex-shrink-0 rounded-lg bg-surface-800 overflow-hidden">
										{#if pdfFile.thumbnail}
											<img src={pdfFile.thumbnail} alt="" class="w-full h-full object-cover" />
										{:else}
											<div class="w-full h-full flex items-center justify-center">
												<FileText class="h-6 w-6 text-surface-600" />
											</div>
										{/if}
									</div>

									<!-- Info -->
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium text-surface-200 truncate">{pdfFile.file.name}</p>
										<div class="flex items-center gap-3 text-xs text-surface-500 mt-1">
											<span>{formatBytes(pdfFile.file.size)}</span>
											{#if pdfFile.pageCount}
												<span>• {pdfFile.pageCount} page{pdfFile.pageCount !== 1 ? 's' : ''}</span>
											{/if}
										</div>

										{#if pdfFile.status === 'processing'}
											<div class="mt-2">
												<div class="h-1.5 bg-surface-700 rounded-full overflow-hidden">
													<div
														class="h-full bg-gradient-to-r from-sky-400 to-cyan-500 transition-all duration-300"
														style="width: {pdfFile.progress}%"
													></div>
												</div>
												{#if pdfFile.progressStage}
													<p class="text-xs text-surface-500 mt-1">{pdfFile.progressStage}</p>
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
											<p class="text-xs text-red-400 mt-2 flex items-center gap-1">
												<AlertCircle class="h-3 w-3" />
												{pdfFile.error}
											</p>
										{/if}
									</div>

									<!-- Actions -->
									<div class="flex items-center gap-1">
										{#if pdfFile.status === 'processing'}
											<Loader2 class="h-5 w-5 text-sky-400 animate-spin" />
										{:else if pdfFile.status === 'completed' && pdfFile.ocrResult}
											{#if pdfFile.ocrResult.searchablePdf}
												<button
													onclick={() => downloadSearchablePdf(pdfFile)}
													class="p-2 text-green-400 hover:text-green-300 transition-colors"
													title="Download Searchable PDF"
												>
													<Download class="h-4 w-4" />
												</button>
											{/if}
											<button
												onclick={() => downloadText(pdfFile)}
												class="p-2 text-sky-400 hover:text-sky-300 transition-colors"
												title="Download Text"
											>
												<FileOutput class="h-4 w-4" />
											</button>
										{/if}
										<button
											onclick={() => removeFile(pdfFile.id)}
											class="p-2 text-surface-500 hover:text-red-400 transition-colors"
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
					<h3 class="flex items-center gap-2 text-lg font-semibold text-surface-100 mb-6">
						<Settings class="h-5 w-5 text-sky-400" />
						OCR Settings
					</h3>

					<!-- Language -->
					<div class="mb-6">
						<label class="flex items-center gap-2 text-sm font-medium text-surface-300 mb-3">
							<Languages class="h-4 w-4 text-sky-400" />
							Document Language
						</label>
						<select
							bind:value={language}
							class="w-full rounded-xl bg-surface-800 border border-surface-700 px-4 py-3 text-surface-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
						>
							{#each LANGUAGE_OPTIONS as opt}
								<option value={opt.value}>{opt.label} ({opt.native})</option>
							{/each}
						</select>
					</div>

					<!-- Output Mode -->
					<div class="mb-6">
						<label class="flex items-center gap-2 text-sm font-medium text-surface-300 mb-3">
							<FileOutput class="h-4 w-4 text-sky-400" />
							Output Format
						</label>
						<div class="space-y-2">
							{#each OUTPUT_MODE_OPTIONS as opt}
								<button
									onclick={() => outputMode = opt.value}
									class="w-full flex items-start gap-3 p-3 rounded-xl transition-all {outputMode === opt.value
										? 'bg-sky-500/20 border border-sky-500/50'
										: 'bg-surface-800 hover:bg-surface-700'}"
								>
									<div class="flex-1 text-left">
										<p class="text-sm font-medium text-surface-200">{opt.label}</p>
										<p class="text-xs text-surface-500">{opt.desc}</p>
									</div>
									{#if outputMode === opt.value}
										<CheckCircle class="h-5 w-5 text-sky-400 flex-shrink-0" />
									{/if}
								</button>
							{/each}
						</div>
					</div>

					<!-- Estimated Time -->
					{#if hasFiles}
						<div class="mb-6 p-3 rounded-xl bg-surface-800/50 border border-surface-700">
							<div class="flex items-center gap-2 text-sm">
								<Clock class="h-4 w-4 text-sky-400" />
								<span class="text-surface-300">Estimated time:</span>
								<span class="text-sky-400 font-medium">{estimatedTime}</span>
							</div>
							<p class="text-xs text-surface-500 mt-1">
								Processing {totalPages} page{totalPages !== 1 ? 's' : ''} with Tesseract OCR
							</p>
						</div>
					{/if}

					<!-- Info -->
					<div class="mb-6 p-3 rounded-xl bg-surface-800/50 border border-surface-700">
						<p class="text-sm text-surface-400">
							<strong class="text-surface-300">How it works:</strong> OCR (Optical Character Recognition) scans your PDF images and extracts text, making them searchable and copyable. All processing happens locally in your browser.
						</p>
					</div>

					<!-- Process Button -->
					<button
						onclick={handleOCR}
						disabled={!hasFiles || isProcessing}
						class="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-sky-500/30 transition-all hover:shadow-xl hover:shadow-sky-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
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
