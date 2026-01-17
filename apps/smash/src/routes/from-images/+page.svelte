<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { Toast, toast } from '@neutron/ui';
	import { imagesToPDF, getOutputFilename } from '$lib/utils/pdf';
	import { formatBytes } from '$lib/stores/pdfs.svelte';
	import { FileText, Upload, Image, Download, Trash2, Loader2, CheckCircle, GripVertical } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';

	interface ImageFile {
		id: string;
		file: File;
		url: string;
		order: number;
	}

	let images = $state<ImageFile[]>([]);
	let isProcessing = $state(false);
	let resultBlob = $state<Blob | null>(null);
	let progress = $state(0);
	let fileInput: HTMLInputElement;
	let isDragging = $state(false);
	let draggedItem = $state<string | null>(null);

	const hasImages = $derived(images.length > 0);
	const totalSize = $derived(images.reduce((sum, img) => sum + img.file.size, 0));

	function generateId(): string {
		return `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	async function handleFiles(newFiles: File[]) {
		const imageFiles = newFiles.filter(f => f.type.startsWith('image/'));
		if (imageFiles.length === 0) { toast.error('Please select image files'); return; }

		const startOrder = images.length;
		const newImages = imageFiles.map((file, i) => ({
			id: generateId(),
			file,
			url: URL.createObjectURL(file),
			order: startOrder + i
		}));

		images = [...images, ...newImages];
		resultBlob = null;
		toast.success(`Added ${imageFiles.length} image(s)`);
	}

	function removeImage(id: string) {
		const img = images.find(i => i.id === id);
		if (img) URL.revokeObjectURL(img.url);
		images = images.filter(i => i.id !== id).map((img, idx) => ({ ...img, order: idx }));
		resultBlob = null;
	}

	async function handleConvert() {
		if (images.length === 0) return;

		isProcessing = true;
		progress = 0;
		resultBlob = null;

		try {
			const sortedFiles = [...images].sort((a, b) => a.order - b.order).map(i => i.file);
			const result = await imagesToPDF(sortedFiles, (p) => { progress = p; });
			resultBlob = result;
			toast.success('PDF created successfully!');
		} catch (error) {
			console.error('Convert error:', error);
			toast.error(error instanceof Error ? error.message : 'Conversion failed');
		} finally {
			isProcessing = false;
		}
	}

	function downloadResult() {
		if (!resultBlob) return;
		const filename = getOutputFilename('images', 'images-to-pdf');
		const url = URL.createObjectURL(resultBlob);
		const a = document.createElement('a');
		a.href = url; a.download = filename;
		document.body.appendChild(a); a.click(); document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function handleItemDragStart(e: DragEvent, id: string) {
		draggedItem = id;
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	function handleItemDragOver(e: DragEvent, targetId: string) {
		e.preventDefault();
		if (draggedItem && draggedItem !== targetId) {
			const draggedIndex = images.findIndex(i => i.id === draggedItem);
			const targetIndex = images.findIndex(i => i.id === targetId);
			if (draggedIndex !== -1 && targetIndex !== -1) {
				const newImages = [...images];
				const [removed] = newImages.splice(draggedIndex, 1);
				newImages.splice(targetIndex, 0, removed);
				images = newImages.map((img, idx) => ({ ...img, order: idx }));
			}
		}
	}

	function handleItemDragEnd() { draggedItem = null; resultBlob = null; }

	function handleDragEnter(e: DragEvent) { e.preventDefault(); isDragging = true; }
	function handleDragLeave(e: DragEvent) { e.preventDefault(); const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) isDragging = false; }
	function handleDragOver(e: DragEvent) { e.preventDefault(); }
	async function handleDrop(e: DragEvent) { e.preventDefault(); isDragging = false; if (e.dataTransfer?.files) await handleFiles(Array.from(e.dataTransfer.files)); }
	function openFilePicker() { fileInput?.click(); }
	async function handleFileInput(e: Event) { const target = e.target as HTMLInputElement; if (target.files) await handleFiles(Array.from(target.files)); target.value = ''; }
</script>

<svelte:head><title>Images to PDF - Smash</title></svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />
	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div class="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/10 blur-3xl"></div>
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-12">
		<div class="mx-auto max-w-4xl">
			<div class="text-center mb-8" in:fade={{ duration: 200 }}>
				<div class="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-400 mb-4">
					<FileText class="h-4 w-4" /> Images to PDF
				</div>
				<h1 class="text-3xl font-bold text-surface-100">Create a PDF from images</h1>
				<p class="mt-2 text-surface-500">Drag to reorder, then convert to a single PDF</p>
			</div>

			<div role="button" tabindex="0" ondragenter={handleDragEnter} ondragleave={handleDragLeave} ondragover={handleDragOver} ondrop={handleDrop} onclick={openFilePicker} onkeydown={(e) => e.key === 'Enter' && openFilePicker()} class="relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer {isDragging ? 'border-accent-start bg-accent-start/10 scale-[1.02]' : 'border-surface-700 hover:border-surface-600 bg-surface-900/50'} {hasImages ? 'py-6' : 'py-12'}">
				<input bind:this={fileInput} type="file" accept="image/*" multiple class="hidden" onchange={handleFileInput} />
				<div class="flex flex-col items-center justify-center gap-4 px-6">
					<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20"><Upload class="h-8 w-8 text-indigo-400" /></div>
					<p class="text-lg font-medium text-surface-200">{hasImages ? 'Add more images' : 'Drop images here or click to browse'}</p>
					{#if !hasImages}<p class="text-sm text-surface-500">Supports JPG, PNG, WebP</p>{/if}
				</div>
			</div>

			{#if hasImages}
				<div class="mt-6">
					<p class="text-sm text-surface-400 mb-3">Drag to reorder • {images.length} images • {formatBytes(totalSize)}</p>
					<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
						{#each images.sort((a, b) => a.order - b.order) as img (img.id)}
							<div
								class="relative group cursor-grab active:cursor-grabbing rounded-xl overflow-hidden border-2 {draggedItem === img.id ? 'opacity-50 border-accent-start' : 'border-transparent hover:border-surface-600'} transition-all"
								draggable="true"
								ondragstart={(e) => handleItemDragStart(e, img.id)}
								ondragover={(e) => handleItemDragOver(e, img.id)}
								ondragend={handleItemDragEnd}
								animate:flip={{ duration: 200 }}
							>
								<img src={img.url} alt="" class="w-full aspect-[3/4] object-cover bg-surface-800" />
								<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
									<GripVertical class="h-5 w-5 text-white" />
								</div>
								<div class="absolute top-1 left-1 bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded">{img.order + 1}</div>
								<button onclick={() => removeImage(img.id)} class="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 class="h-3 w-3" /></button>
							</div>
						{/each}
					</div>
				</div>

				{#if isProcessing}
					<div class="mt-4"><div class="h-2 bg-surface-700 rounded-full overflow-hidden"><div class="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style="width: {progress}%"></div></div></div>
				{/if}

				{#if resultBlob}
					<div class="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30" in:fly={{ y: 10, duration: 200 }}>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-green-400 font-medium flex items-center gap-2"><CheckCircle class="h-4 w-4" /> PDF created!</p>
								<p class="text-sm text-surface-500">{formatBytes(resultBlob.size)} • {images.length} pages</p>
							</div>
							<button onclick={downloadResult} class="flex items-center gap-2 rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600"><Download class="h-3 w-3" /> Download</button>
						</div>
					</div>
				{/if}

				<button onclick={handleConvert} disabled={images.length === 0 || isProcessing} class="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
					{#if isProcessing}<Loader2 class="h-5 w-5 animate-spin" /> Creating PDF...{:else}<FileText class="h-5 w-5" /> Create PDF from {images.length} Images{/if}
				</button>
			{/if}
		</div>
	</main>
	<Footer />
</div>
<Toast />
