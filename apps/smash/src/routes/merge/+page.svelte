<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { Toast, toast } from '@neutron/ui';
	import { mergePDFs, getOutputFilename, generateThumbnail, getPageCount } from '$lib/utils/pdf';
	import { formatBytes } from '$lib/stores/pdfs.svelte';
	import { Layers, Upload, FileText, Download, Trash2, Loader2, CheckCircle, GripVertical } from 'lucide-svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';

	interface PDFFile {
		id: string;
		file: File;
		originalUrl: string;
		thumbnail?: string;
		pageCount?: number;
		order: number;
	}

	let files = $state<PDFFile[]>([]);
	let isProcessing = $state(false);
	let mergedBlob = $state<Blob | null>(null);
	let mergedUrl = $state<string | null>(null);
	let progress = $state(0);
	let fileInput: HTMLInputElement;
	let isDragging = $state(false);
	let draggedItem = $state<string | null>(null);

	const hasFiles = $derived(files.length > 0);
	const totalPages = $derived(files.reduce((sum, f) => sum + (f.pageCount || 0), 0));
	const totalSize = $derived(files.reduce((sum, f) => sum + f.file.size, 0));

	function generateId(): string {
		return `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	async function handleFiles(newFiles: File[]) {
		const pdfFiles = newFiles.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
		if (pdfFiles.length === 0) {
			toast.error('Please select PDF files');
			return;
		}

		const startOrder = files.length;
		const newPdfFiles: PDFFile[] = [];

		for (let i = 0; i < pdfFiles.length; i++) {
			const file = pdfFiles[i];
			const pdfFile: PDFFile = {
				id: generateId(),
				file,
				originalUrl: URL.createObjectURL(file),
				order: startOrder + i
			};

			try {
				pdfFile.thumbnail = await generateThumbnail(file);
				pdfFile.pageCount = await getPageCount(file);
			} catch (e) {
				console.warn('Failed to get PDF metadata:', e);
			}

			newPdfFiles.push(pdfFile);
		}

		files = [...files, ...newPdfFiles];
		mergedBlob = null;
		mergedUrl = null;
		toast.success(`Added ${pdfFiles.length} PDF(s)`);
	}

	function removeFile(id: string) {
		const file = files.find(f => f.id === id);
		if (file) URL.revokeObjectURL(file.originalUrl);
		files = files.filter(f => f.id !== id).map((f, i) => ({ ...f, order: i }));
		mergedBlob = null;
		mergedUrl = null;
	}

	function moveFile(id: string, direction: 'up' | 'down') {
		const index = files.findIndex(f => f.id === id);
		if (direction === 'up' && index > 0) {
			const newFiles = [...files];
			[newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
			files = newFiles.map((f, i) => ({ ...f, order: i }));
		} else if (direction === 'down' && index < files.length - 1) {
			const newFiles = [...files];
			[newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
			files = newFiles.map((f, i) => ({ ...f, order: i }));
		}
		mergedBlob = null;
		mergedUrl = null;
	}

	async function handleMerge() {
		if (files.length < 2) {
			toast.error('Need at least 2 PDFs to merge');
			return;
		}

		isProcessing = true;
		progress = 0;

		try {
			const sortedFiles = [...files].sort((a, b) => a.order - b.order).map(f => f.file);
			const result = await mergePDFs(sortedFiles, (p) => {
				progress = p;
			});

			mergedBlob = result;
			mergedUrl = URL.createObjectURL(result);
			toast.success(`Merged ${files.length} PDFs successfully!`);
		} catch (error) {
			console.error('Merge error:', error);
			toast.error(error instanceof Error ? error.message : 'Merge failed');
		} finally {
			isProcessing = false;
		}
	}

	function downloadMerged() {
		if (!mergedBlob) return;
		const filename = getOutputFilename('merged', 'merge');
		const url = URL.createObjectURL(mergedBlob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
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

	// Drag reorder handlers
	function handleItemDragStart(e: DragEvent, id: string) {
		draggedItem = id;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
		}
	}

	function handleItemDragOver(e: DragEvent, targetId: string) {
		e.preventDefault();
		if (draggedItem && draggedItem !== targetId) {
			const draggedIndex = files.findIndex(f => f.id === draggedItem);
			const targetIndex = files.findIndex(f => f.id === targetId);
			if (draggedIndex !== -1 && targetIndex !== -1) {
				const newFiles = [...files];
				const [removed] = newFiles.splice(draggedIndex, 1);
				newFiles.splice(targetIndex, 0, removed);
				files = newFiles.map((f, i) => ({ ...f, order: i }));
			}
		}
	}

	function handleItemDragEnd() {
		draggedItem = null;
		mergedBlob = null;
		mergedUrl = null;
	}
</script>

<svelte:head>
	<title>Merge PDFs - Smash</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />

	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div class="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-blue-500/10 to-cyan-500/10 blur-3xl"></div>
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-12">
		<div class="mx-auto max-w-4xl">
			<!-- Header -->
			<div class="text-center mb-8" in:fade={{ duration: 200 }}>
				<div class="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-400 mb-4">
					<Layers class="h-4 w-4" />
					Merge PDFs
				</div>
				<h1 class="text-3xl font-bold text-surface-100">Combine multiple PDFs into one</h1>
				<p class="mt-2 text-surface-500">Drag to reorder, then merge into a single document</p>
			</div>

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
				class="relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer {isDragging
					? 'border-accent-start bg-accent-start/10 scale-[1.02]'
					: 'border-surface-700 hover:border-surface-600 bg-surface-900/50'} {hasFiles ? 'py-6' : 'py-12'}"
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
					<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
						<Upload class="h-8 w-8 text-blue-400" />
					</div>
					<p class="text-lg font-medium text-surface-200">
						{hasFiles ? 'Add more PDFs' : 'Drop PDFs here or click to browse'}
					</p>
				</div>
			</div>

			<!-- File List -->
			{#if hasFiles}
				<div class="mt-6 space-y-2" in:fly={{ y: 20, duration: 200 }}>
					<div class="flex items-center justify-between text-sm text-surface-400 mb-2">
						<span>Drag to reorder • {files.length} PDFs • {totalPages} pages total</span>
						<span>{formatBytes(totalSize)}</span>
					</div>

					{#each files.sort((a, b) => a.order - b.order) as pdfFile (pdfFile.id)}
						<div
							class="glass rounded-xl p-3 flex items-center justify-between cursor-grab active:cursor-grabbing transition-transform {draggedItem === pdfFile.id ? 'opacity-50 scale-95' : ''}"
							draggable="true"
							ondragstart={(e) => handleItemDragStart(e, pdfFile.id)}
							ondragover={(e) => handleItemDragOver(e, pdfFile.id)}
							ondragend={handleItemDragEnd}
							animate:flip={{ duration: 200 }}
						>
							<div class="flex items-center gap-3 min-w-0 flex-1">
								<GripVertical class="h-5 w-5 text-surface-500 flex-shrink-0" />
								<span class="text-sm font-bold text-surface-400 w-6">{pdfFile.order + 1}</span>
								<div class="h-12 w-12 rounded-lg bg-surface-800 overflow-hidden flex-shrink-0">
									{#if pdfFile.thumbnail}
										<img src={pdfFile.thumbnail} alt="" class="w-full h-full object-cover" />
									{:else}
										<div class="w-full h-full flex items-center justify-center">
											<FileText class="h-6 w-6 text-surface-500" />
										</div>
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium text-surface-200 truncate">{pdfFile.file.name}</p>
									<p class="text-xs text-surface-500">{formatBytes(pdfFile.file.size)} • {pdfFile.pageCount || '?'} pages</p>
								</div>
							</div>
							<button
								onclick={() => removeFile(pdfFile.id)}
								class="p-2 text-surface-500 hover:text-red-400 transition-colors"
							>
								<Trash2 class="h-4 w-4" />
							</button>
						</div>
					{/each}
				</div>

				<!-- Progress Bar -->
				{#if isProcessing}
					<div class="mt-4">
						<div class="h-2 bg-surface-700 rounded-full overflow-hidden">
							<div class="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all" style="width: {progress}%"></div>
						</div>
						<p class="text-sm text-surface-400 mt-1 text-center">Merging... {progress}%</p>
					</div>
				{/if}

				<!-- Result -->
				{#if mergedBlob && !isProcessing}
					<div class="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30" in:fly={{ y: 10, duration: 200 }}>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-green-400 font-medium flex items-center gap-2">
									<CheckCircle class="h-4 w-4" />
									Merge complete!
								</p>
								<p class="text-sm text-surface-500">
									{files.length} PDFs → 1 PDF ({formatBytes(mergedBlob.size)})
								</p>
							</div>
							<button
								onclick={downloadMerged}
								class="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
							>
								<Download class="h-4 w-4" />
								Download
							</button>
						</div>
					</div>
				{/if}

				<!-- Merge Button -->
				<button
					onclick={handleMerge}
					disabled={files.length < 2 || isProcessing}
					class="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
				>
					{#if isProcessing}
						<Loader2 class="h-5 w-5 animate-spin" />
						Merging...
					{:else}
						<Layers class="h-5 w-5" />
						Merge {files.length} PDFs
					{/if}
				</button>
			{/if}
		</div>
	</main>

	<Footer />
</div>

<Toast />
