<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { Toast, toast } from '@neutron/ui';
	import { compressPDF, getOutputFilename, generateThumbnail, getPageCount } from '$lib/utils/pdf';
	import { formatBytes } from '$lib/stores/pdfs.svelte';
	import {
		Minimize2,
		Upload,
		FileText,
		Download,
		Trash2,
		Loader2,
		CheckCircle,
		AlertCircle,
		Settings,
		ChevronDown,
		Monitor,
		BookOpen,
		Printer,
		FileCheck,
		Eye,
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
		compressedUrl?: string;
		compressedBlob?: Blob;
		compressedSize?: number;
	}

	type CompressionPreset = 'screen' | 'ebook' | 'printer' | 'prepress';

	// State
	let files = $state<PDFFile[]>([]);
	let isProcessing = $state(false);
	let compressionPreset = $state<CompressionPreset>('ebook');
	let showAdvanced = $state(false);
	let fileInput: HTMLInputElement;
	let isDragging = $state(false);

	// Compression presets
	const presets = {
		screen: { label: 'Email/Web', desc: 'Smallest (~70% reduction)', icon: Monitor },
		ebook: {
			label: 'Reading',
			desc: 'Balanced (~50% reduction)',
			icon: BookOpen,
			recommended: true,
		},
		printer: { label: 'Print-Ready', desc: 'High quality (~30% reduction)', icon: Printer },
		prepress: { label: 'Professional', desc: 'Maximum quality', icon: FileCheck },
	};

	// Derived state
	const hasFiles = $derived(files.length > 0);
	const pendingCount = $derived(files.filter((f) => f.status === 'pending').length);
	const completedCount = $derived(files.filter((f) => f.status === 'completed').length);
	const totalOriginal = $derived(files.reduce((sum, f) => sum + f.file.size, 0));
	const totalCompressed = $derived(
		files.filter((f) => f.compressedSize).reduce((sum, f) => sum + (f.compressedSize || 0), 0)
	);
	const totalSavings = $derived(
		totalOriginal > 0 && totalCompressed > 0
			? Math.round((1 - totalCompressed / totalOriginal) * 100)
			: 0
	);

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
			if (file.compressedUrl) URL.revokeObjectURL(file.compressedUrl);
		}
		files = files.filter((f) => f.id !== id);
	}

	async function handleCompress() {
		if (files.length === 0) return;

		isProcessing = true;

		const pendingFiles = files.filter((f) => f.status === 'pending' || f.status === 'error');

		for (const pdfFile of pendingFiles) {
			const startTime = performance.now();
			files = files.map((f) =>
				f.id === pdfFile.id
					? { ...f, status: 'processing' as const, progress: 0, progressStage: 'Initializing...' }
					: f
			);

			try {
				const result = await compressPDF(pdfFile.file, {
					preset: compressionPreset,
					onProgress: (progress) => {
						const stage =
							progress < 30
								? 'Initializing...'
								: progress < 80
									? 'Compressing...'
									: 'Finalizing...';
						files = files.map((f) =>
							f.id === pdfFile.id ? { ...f, progress, progressStage: stage } : f
						);
					},
				});

				const processingTime = Math.round(performance.now() - startTime);
				const url = URL.createObjectURL(result);

				files = files.map((f) =>
					f.id === pdfFile.id
						? {
								...f,
								status: 'completed' as const,
								progress: 100,
								compressedUrl: url,
								compressedBlob: result,
								compressedSize: result.size,
								progressStage: `Done in ${(processingTime / 1000).toFixed(1)}s`,
							}
						: f
				);
			} catch (error) {
				console.error('Compression error:', error);
				files = files.map((f) =>
					f.id === pdfFile.id
						? {
								...f,
								status: 'error' as const,
								error: error instanceof Error ? error.message : 'Compression failed',
							}
						: f
				);
			}
		}

		isProcessing = false;

		if (completedCount > 0) {
			toast.success(`Compressed ${completedCount} PDF(s)`);
		}
	}

	function downloadFile(pdfFile: PDFFile) {
		if (!pdfFile.compressedBlob) return;
		const filename = getOutputFilename(pdfFile.file.name, 'compress');
		const url = URL.createObjectURL(pdfFile.compressedBlob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	async function downloadAll() {
		const completed = files.filter((f) => f.status === 'completed' && f.compressedBlob);
		if (completed.length === 0) return;

		if (completed.length === 1) {
			downloadFile(completed[0]);
		} else {
			const { default: JSZip } = await import('jszip');
			const zip = new JSZip();

			for (const file of completed) {
				if (file.compressedBlob) {
					const filename = getOutputFilename(file.file.name, 'compress');
					zip.file(filename, file.compressedBlob);
				}
			}

			const blob = await zip.generateAsync({ type: 'blob' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `compressed-pdfs-${Date.now()}.zip`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			toast.success(`Downloaded ${completed.length} PDFs as ZIP`);
		}
	}

	// Drag and drop handlers
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
	<title>Compress PDF - Smash</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />

	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -right-1/4 -top-1/2 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-violet-500/10 to-purple-500/10 blur-3xl"
		></div>
		<div
			class="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-purple-500/10 to-violet-500/10 blur-3xl"
		></div>
	</div>

	<main class="flex-1 px-4 pb-12 pt-28 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-5xl">
			<!-- Header -->
			<div class="mb-8 text-center" in:fade={{ duration: 200 }}>
				<div
					class="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-400"
				>
					<Minimize2 class="h-4 w-4" />
					Compress PDF
				</div>
				<h1 class="text-surface-100 text-3xl font-bold">
					Reduce PDF file size by up to <span class="gradient-text">90%</span>
				</h1>
				<p class="text-surface-500 mt-2">
					Uses Ghostscript for maximum compression while preserving text quality
				</p>
			</div>

			<div class="grid gap-6 lg:grid-cols-2">
				<!-- Left: Drop zone and file list -->
				<div>
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
						class="relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 {isDragging
							? 'border-accent-start bg-accent-start/10 scale-[1.02]'
							: 'border-surface-700 hover:border-surface-600 bg-surface-900/50'} {hasFiles
							? 'py-6'
							: 'py-12'}"
					>
						<input
							bind:this={fileInput}
							type="file"
							accept=".pdf,application/pdf"
							multiple
							class="hidden"
							onchange={handleFileInput}
						/>

						<div class="flex flex-col items-center justify-center gap-4 px-6">
							<div
								class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20"
							>
								{#if isDragging}
									<FileText class="text-accent-start h-8 w-8 animate-pulse" />
								{:else}
									<Upload class="h-8 w-8 text-violet-400" />
								{/if}
							</div>
							<div class="text-center">
								<p class="text-surface-200 text-lg font-medium">
									{#if isDragging}
										Drop to add files
									{:else if hasFiles}
										Add more PDFs
									{:else}
										Drop PDFs here or click to browse
									{/if}
								</p>
								{#if !hasFiles}
									<p class="text-surface-500 mt-1 text-sm">Supports PDF files</p>
								{/if}
							</div>
						</div>
					</div>

					<!-- File List -->
					{#if hasFiles}
						<div class="mt-4 space-y-2" in:fly={{ y: 20, duration: 200 }}>
							{#each files as pdfFile (pdfFile.id)}
								<div
									class="glass flex items-center justify-between rounded-xl p-3"
									in:slide={{ duration: 200 }}
								>
									<div class="flex min-w-0 flex-1 items-center gap-3">
										<div class="bg-surface-800 h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
											{#if pdfFile.thumbnail}
												<img src={pdfFile.thumbnail} alt="" class="h-full w-full object-cover" />
											{:else}
												<div class="flex h-full w-full items-center justify-center">
													<FileText class="text-surface-500 h-6 w-6" />
												</div>
											{/if}
										</div>
										<div class="min-w-0 flex-1">
											<p class="text-surface-200 truncate text-sm font-medium">
												{pdfFile.file.name}
											</p>
											<div class="text-surface-500 mt-0.5 flex items-center gap-2 text-xs">
												<span>{formatBytes(pdfFile.file.size)}</span>
												{#if pdfFile.pageCount}
													<span>• {pdfFile.pageCount} pages</span>
												{/if}
												{#if pdfFile.compressedSize}
													<span class="text-surface-600">→</span>
													<span class="text-green-400">{formatBytes(pdfFile.compressedSize)}</span>
													<span class="font-medium text-green-400">
														(-{Math.round((1 - pdfFile.compressedSize / pdfFile.file.size) * 100)}%)
													</span>
												{/if}
											</div>
											{#if pdfFile.status === 'processing'}
												<div class="mt-1">
													<div class="bg-surface-700 h-1 overflow-hidden rounded-full">
														<div
															class="from-accent-start to-accent-end h-full bg-gradient-to-r transition-all"
															style="width: {pdfFile.progress}%"
														></div>
													</div>
													<p class="text-surface-500 mt-0.5 text-xs">{pdfFile.progressStage}</p>
												</div>
											{/if}
											{#if pdfFile.status === 'error'}
												<p class="mt-0.5 text-xs text-red-400">{pdfFile.error}</p>
											{/if}
										</div>
									</div>

									<div class="ml-2 flex items-center gap-1">
										{#if pdfFile.status === 'processing'}
											<Loader2 class="text-accent-start h-5 w-5 animate-spin" />
										{:else if pdfFile.status === 'completed'}
											<button
												onclick={() => downloadFile(pdfFile)}
												class="p-2 text-green-400 transition-colors hover:text-green-300"
												title="Download"
											>
												<Download class="h-4 w-4" />
											</button>
										{:else if pdfFile.status === 'error'}
											<AlertCircle class="h-5 w-5 text-red-400" />
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

							<!-- Summary -->
							{#if completedCount > 0}
								<div
									class="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 p-4"
									in:fly={{ y: 10, duration: 200 }}
								>
									<div class="flex items-center justify-between">
										<div>
											<p class="flex items-center gap-2 font-medium text-green-400">
												<CheckCircle class="h-4 w-4" />
												{completedCount} PDF{completedCount !== 1 ? 's' : ''} compressed
											</p>
											<p class="text-surface-500 text-sm">
												{formatBytes(totalOriginal)} → {formatBytes(totalCompressed)}
												<span class="text-green-400">(-{totalSavings}%)</span>
											</p>
										</div>
										<button
											onclick={downloadAll}
											class="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
										>
											<Download class="h-4 w-4" />
											Download All
										</button>
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Right: Settings -->
				<div class="glass rounded-2xl p-6" in:fly={{ y: 20, delay: 100, duration: 200 }}>
					<h3 class="text-surface-100 mb-6 flex items-center gap-2 text-lg font-semibold">
						<Settings class="text-accent-start h-5 w-5" />
						Compression Settings
					</h3>

					<!-- Presets -->
					<div class="space-y-3">
						<label class="text-surface-300 block text-sm font-medium">Quality Preset</label>
						<div class="grid grid-cols-2 gap-2">
							{#each Object.entries(presets) as [key, preset]}
								{@const Icon = preset.icon}
								<button
									onclick={() => (compressionPreset = key as CompressionPreset)}
									class="relative rounded-xl px-3 py-3 text-left transition-all {compressionPreset ===
									key
										? 'bg-accent-start ring-accent-start/50 text-white ring-2'
										: 'bg-surface-800 text-surface-400 hover:text-surface-200 hover:bg-surface-700'}"
								>
									{#if preset.recommended}
										<div
											class="absolute -right-1.5 -top-1.5 rounded-full bg-green-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
										>
											Best
										</div>
									{/if}
									<div class="mb-1 flex items-center gap-2">
										<Icon class="h-4 w-4" />
										<span class="font-medium">{preset.label}</span>
									</div>
									<p class="text-xs opacity-70">{preset.desc}</p>
								</button>
							{/each}
						</div>
					</div>

					<!-- Info Box -->
					<div class="bg-surface-800/50 border-surface-700/50 mt-6 rounded-xl border p-4">
						<p class="text-surface-400 text-sm">
							<strong class="text-surface-300">How it works:</strong> Your PDF is compressed using Ghostscript
							WASM directly in your browser. Text remains searchable and selectable. Images are optimized
							based on your selected quality preset.
						</p>
					</div>

					<!-- Compress Button -->
					<button
						onclick={handleCompress}
						disabled={files.length === 0 || isProcessing || pendingCount === 0}
						class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-violet-500/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
					>
						{#if isProcessing}
							<Loader2 class="h-5 w-5 animate-spin" />
							Compressing...
						{:else}
							<Minimize2 class="h-5 w-5" />
							Compress {pendingCount > 0
								? `${pendingCount} PDF${pendingCount !== 1 ? 's' : ''}`
								: 'PDFs'}
						{/if}
					</button>
				</div>
			</div>
		</div>
	</main>

	<Footer />
</div>

<Toast />
