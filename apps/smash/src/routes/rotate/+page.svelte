<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import PDFViewer from '$lib/components/PDFViewer.svelte';
	import { Footer } from '@neutron/ui';
	import { Toast, toast } from '@neutron/ui';
	import { downloadBlob } from '@neutron/utils';
	import { getOutputFilename } from '$lib/utils/pdf';
	import { RotateCw, Upload, Download, X, FileText } from 'lucide-svelte';

	let currentFile = $state<File | null>(null);
	let hasChanges = $state(false);
	let isDragging = $state(false);
	let fileInput: HTMLInputElement;

	async function handleFiles(files: FileList | File[]) {
		const arr = Array.from(files);
		const pdf = arr.find((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
		if (!pdf) {
			toast.error('Please select a PDF file');
			return;
		}
		currentFile = pdf;
		hasChanges = false;
	}

	function handleDownload() {
		if (!currentFile) return;
		downloadBlob(currentFile, getOutputFilename(currentFile.name, 'rotate'));
	}

	function clearFile() {
		currentFile = null;
		hasChanges = false;
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
		if (e.dataTransfer?.files) await handleFiles(e.dataTransfer.files);
	}
	function openFilePicker() {
		fileInput?.click();
	}
	async function handleFileInput(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files) await handleFiles(target.files);
		target.value = '';
	}
</script>

<svelte:head>
	<title>Rotate PDF Pages — Smash</title>
	<meta
		name="description"
		content="Rotate pages 90°, 180°, or 270°. Select specific pages. Free, browser-based."
	/>
	<meta property="og:title" content="Rotate PDF Pages — Smash" />
	<meta
		property="og:description"
		content="Rotate pages 90°, 180°, or 270°. Select specific pages. Free, browser-based."
	/>
	<link rel="canonical" href="https://ishanjalan.github.io/Smash/rotate" />
</svelte:head>

<div class="flex flex-col" style="height: 100dvh;">
	<Header />

	{#if currentFile}
		<!-- Slim action bar -->
		<div
			class="bg-surface-900/95 border-surface-800 flex flex-shrink-0 items-center gap-3 border-b px-4 py-2"
		>
			<RotateCw class="h-4 w-4 flex-shrink-0 text-cyan-400" />
			<span class="text-surface-200 min-w-0 flex-1 truncate text-sm font-medium"
				>{currentFile.name}</span
			>
			<span class="text-surface-500 flex-shrink-0 text-xs">
				{hasChanges ? 'Unsaved changes' : 'No changes yet'}
			</span>
			<button
				onclick={handleDownload}
				disabled={!hasChanges}
				class="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-40"
			>
				<Download class="h-3.5 w-3.5" /> Download
			</button>
			<button
				onclick={clearFile}
				class="text-surface-500 hover:text-surface-300 flex-shrink-0 rounded p-1 transition-colors"
				title="Clear file"
			>
				<X class="h-4 w-4" />
			</button>
		</div>

		<!-- Viewer -->
		<div class="min-h-0 flex-1 overflow-hidden">
			<PDFViewer
				file={currentFile}
				onFileChange={(newFile) => {
					currentFile = newFile;
					hasChanges = true;
				}}
			/>
		</div>
	{:else}
		<!-- Drop zone -->
		<div class="flex min-h-0 flex-1 items-center justify-center p-8">
			<div
				role="button"
				tabindex="0"
				ondragenter={handleDragEnter}
				ondragleave={handleDragLeave}
				ondragover={handleDragOver}
				ondrop={handleDrop}
				onclick={openFilePicker}
				onkeydown={(e) => e.key === 'Enter' && openFilePicker()}
				class="relative w-full max-w-lg cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed py-20 transition-all duration-300 {isDragging
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
				<div class="flex flex-col items-center justify-center gap-4 px-6 text-center">
					<div
						class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20"
					>
						<Upload class="h-8 w-8 text-cyan-400" />
					</div>
					<div>
						<p class="text-surface-200 text-lg font-medium">Drop a PDF here or click to browse</p>
						<p class="text-surface-500 mt-1 text-sm">
							Use the hover controls on each thumbnail to rotate pages individually
						</p>
					</div>
					<div
						class="mt-2 inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-4 py-1.5 text-sm font-medium text-cyan-400"
					>
						<RotateCw class="h-4 w-4" />
						Rotate PDF Pages
					</div>
				</div>
			</div>
		</div>
		<Footer currentApp="smash" />
	{/if}
</div>
<Toast />
