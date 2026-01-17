<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import CompareSlider from '$lib/components/CompareSlider.svelte';
	import { toast } from '@neutron/ui';
	import {
		Merge,
		Settings,
		Download,
		Trash2,
		GripVertical,
		Loader2,
		Rows3,
		Columns3,
		Copy,
		Check,
		Eye,
		RefreshCw,
	} from 'lucide-svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { mergeGifs } from '$lib/utils/gifsicle';
	import { parseGifFile, formatDuration, type GifMetadata } from '$lib/utils/gif-parser';
	import {
		formatBytes,
		downloadBlob,
		copyBlobToClipboard,
		isClipboardWriteSupported,
	} from '@neutron/utils';

	interface GifFile {
		id: string;
		file: File;
		url: string;
		metadata?: GifMetadata;
	}

	// State
	let files = $state<GifFile[]>([]);
	let isProcessing = $state(false);
	let progress = $state(0);
	let progressStage = $state('');
	let resultUrl = $state<string | null>(null);
	let resultBlob = $state<Blob | null>(null);
	let resultSize = $state(0);
	let justCopied = $state(false);

	// Settings
	type CombineMode = 'sequential' | 'horizontal' | 'vertical';
	let combineMode = $state<CombineMode>('sequential');
	let normalizeSize = $state(true);
	let outputWidth = $state(480);

	// Drag and drop reordering
	let draggedFile: GifFile | null = null;
	let dragOverIndex: number | null = null;

	// Comparison modal
	let showComparison = $state(false);

	function generateId(): string {
		return `gif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	async function handleFiles(newFiles: File[]) {
		const gifFiles = newFiles.filter((f) => f.type === 'image/gif' || f.name.endsWith('.gif'));
		if (gifFiles.length === 0) {
			toast.error('Please select GIF files');
			return;
		}

		const newGifFiles: GifFile[] = [];

		for (const file of gifFiles) {
			const gifFile: GifFile = {
				id: generateId(),
				file,
				url: URL.createObjectURL(file),
			};

			// Parse metadata
			try {
				gifFile.metadata = await parseGifFile(file);
			} catch (e) {
				console.warn('Failed to parse GIF metadata:', e);
			}

			newGifFiles.push(gifFile);
		}

		files = [...files, ...newGifFiles];
		toast.success(`Added ${newGifFiles.length} GIF(s)`);

		// Clear previous result
		if (resultUrl) {
			URL.revokeObjectURL(resultUrl);
			resultUrl = null;
		}
	}

	function removeFile(id: string) {
		const file = files.find((f) => f.id === id);
		if (file) {
			URL.revokeObjectURL(file.url);
		}
		files = files.filter((f) => f.id !== id);
	}

	// Drag and drop handlers
	function handleDragStart(file: GifFile) {
		draggedFile = file;
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		dragOverIndex = index;
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	function handleDrop(targetIndex: number) {
		if (!draggedFile) return;

		const sourceIndex = files.findIndex((f) => f.id === draggedFile!.id);
		if (sourceIndex === targetIndex) {
			draggedFile = null;
			dragOverIndex = null;
			return;
		}

		const newFiles = [...files];
		newFiles.splice(sourceIndex, 1);
		newFiles.splice(targetIndex, 0, draggedFile);
		files = newFiles;

		draggedFile = null;
		dragOverIndex = null;
	}

	function handleDragEnd() {
		draggedFile = null;
		dragOverIndex = null;
	}

	async function handleCombine() {
		if (files.length < 2) {
			toast.error('Add at least 2 GIFs to combine');
			return;
		}

		isProcessing = true;
		progress = 0;
		progressStage = 'Preparing GIFs...';

		// Clear previous result
		if (resultUrl) {
			URL.revokeObjectURL(resultUrl);
			resultUrl = null;
		}

		try {
			// Read all files into buffers
			const buffers: ArrayBuffer[] = [];
			for (let i = 0; i < files.length; i++) {
				progressStage = `Reading GIF ${i + 1}/${files.length}...`;
				progress = Math.round(((i + 1) / files.length) * 30);
				buffers.push(await files[i].file.arrayBuffer());
			}

			progressStage = 'Combining GIFs...';
			progress = 40;

			// For now, we'll use a sequential merge approach
			// Start with the first GIF
			let currentBuffer = buffers[0];

			for (let i = 1; i < buffers.length; i++) {
				progressStage = `Merging GIF ${i + 1}/${files.length}...`;
				progress = 40 + Math.round((i / (buffers.length - 1)) * 50);

				const { result } = await mergeGifs(
					currentBuffer,
					buffers[i],
					{
						mode: combineMode,
						normalizeSize,
						outputWidth: normalizeSize ? outputWidth : undefined,
					},
					() => {} // Progress callback not used for merge
				);

				currentBuffer = result;
			}

			progressStage = 'Finalizing...';
			progress = 95;

			// Create blob from result
			const blob = new Blob([currentBuffer], { type: 'image/gif' });
			resultBlob = blob;
			resultUrl = URL.createObjectURL(blob);
			resultSize = blob.size;

			progress = 100;
			progressStage = 'Complete!';
			toast.success('GIFs combined successfully!');
		} catch (error) {
			console.error('Combine error:', error);
			toast.error('Failed to combine GIFs. Try adjusting settings.');
		} finally {
			isProcessing = false;
		}
	}

	function downloadResult() {
		if (!resultBlob) return;
		const modeName = combineMode === 'sequential' ? 'merged' : combineMode;
		downloadBlob(resultBlob, `swirl-${modeName}-${Date.now()}.gif`);
	}

	async function copyResult() {
		if (!resultBlob) return;
		const success = await copyBlobToClipboard(resultBlob);
		if (success) {
			justCopied = true;
			toast.success('Copied to clipboard!');
			setTimeout(() => {
				justCopied = false;
			}, 2000);
		} else {
			toast.error('Copy not supported in this browser');
		}
	}

	function resetResult() {
		if (resultUrl) URL.revokeObjectURL(resultUrl);
		resultUrl = null;
		resultBlob = null;
		resultSize = 0;
		progress = 0;
		progressStage = '';
	}

	function clearAll() {
		files.forEach((f) => URL.revokeObjectURL(f.url));
		files = [];
		if (resultUrl) {
			URL.revokeObjectURL(resultUrl);
			resultUrl = null;
		}
	}

	// Derived
	const totalDuration = $derived(files.reduce((sum, f) => sum + (f.metadata?.duration || 0), 0));
	const totalFrames = $derived(files.reduce((sum, f) => sum + (f.metadata?.frameCount || 0), 0));
</script>

<svelte:head>
	<title>Combine GIFs - Swirl</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />

	<!-- Background decoration -->
	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -right-1/4 -top-1/2 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 blur-3xl"
		></div>
		<div
			class="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-blue-500/10 to-cyan-500/10 blur-3xl"
		></div>
	</div>

	<main class="flex-1 px-4 pb-12 pt-28 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-5xl">
			<!-- Header -->
			<div class="mb-8 text-center" in:fade={{ duration: 200 }}>
				<div
					class="mb-4 inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-4 py-1.5 text-sm font-medium text-cyan-400"
				>
					<Merge class="h-4 w-4" />
					Combine GIFs
				</div>
				<h1 class="text-surface-100 text-3xl font-bold">
					Stitch GIFs <span class="gradient-text">together</span>
				</h1>
				<p class="text-surface-500 mt-2">Merge multiple GIFs into one animation</p>
			</div>

			<div class="grid gap-6 lg:grid-cols-2">
				<!-- Left: Drop zone and file list -->
				<div>
					<!-- Preview -->
					{#if resultUrl}
						<div class="glass mb-4 rounded-2xl p-4" in:fly={{ y: -10, duration: 200 }}>
							<div
								class="bg-surface-900 flex aspect-video items-center justify-center overflow-hidden rounded-xl"
							>
								<img
									src={resultUrl}
									alt="Combined GIF"
									class="max-h-full max-w-full object-contain"
								/>
							</div>
							<div class="mt-3 flex items-center justify-between">
								<span class="text-surface-400 text-sm">
									Combined result • {formatBytes(resultSize)}
								</span>
								<div class="flex gap-2">
									<button
										onclick={downloadResult}
										class="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
									>
										<Download class="h-4 w-4" />
										Download
									</button>
									{#if isClipboardWriteSupported()}
										<button
											onclick={copyResult}
											class="bg-surface-700 text-surface-200 hover:bg-surface-600 flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
											title="Copy to clipboard"
										>
											{#if justCopied}
												<Check class="h-4 w-4 text-green-400" />
											{:else}
												<Copy class="h-4 w-4" />
											{/if}
										</button>
									{/if}
									<button
										onclick={() => (showComparison = true)}
										class="bg-surface-700 text-surface-200 hover:bg-surface-600 flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
										title="Compare"
									>
										<Eye class="h-4 w-4" />
									</button>
									<button
										onclick={resetResult}
										class="bg-surface-700 text-surface-200 hover:bg-surface-600 flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
										title="Try again with different settings"
									>
										<RefreshCw class="h-4 w-4" />
									</button>
								</div>
							</div>
						</div>
					{/if}

					<DropZone
						accept=".gif,image/gif"
						acceptLabel="GIF files only"
						onfiles={handleFiles}
						compact={files.length > 0}
					/>

					<!-- File List -->
					{#if files.length > 0}
						<div class="mt-4" in:fly={{ y: 20, duration: 200 }}>
							<div class="mb-2 flex items-center justify-between">
								<h3 class="text-surface-300 text-sm font-medium">
									GIFs to combine ({files.length})
									{#if totalFrames > 0}
										<span class="text-surface-500 font-normal">
											• {totalFrames} total frames • {formatDuration(totalDuration)}
										</span>
									{/if}
								</h3>
								<button
									onclick={clearAll}
									class="text-surface-500 text-xs transition-colors hover:text-red-400"
								>
									Clear all
								</button>
							</div>

							<div class="space-y-2">
								{#each files as file, index (file.id)}
									<div
										class="glass flex cursor-move items-center gap-3 rounded-xl p-3 {dragOverIndex ===
										index
											? 'ring-2 ring-cyan-400'
											: ''}"
										draggable="true"
										ondragstart={() => handleDragStart(file)}
										ondragover={(e) => handleDragOver(e, index)}
										ondragleave={handleDragLeave}
										ondrop={() => handleDrop(index)}
										ondragend={handleDragEnd}
										animate:flip={{ duration: 200 }}
										in:slide={{ duration: 200 }}
									>
										<div class="text-surface-600 flex items-center gap-2">
											<span class="w-5 text-center text-xs font-medium">{index + 1}</span>
											<GripVertical class="h-5 w-5 cursor-grab active:cursor-grabbing" />
										</div>

										<div class="bg-surface-800 h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
											<img src={file.url} alt="" class="h-full w-full object-cover" />
										</div>

										<div class="min-w-0 flex-1">
											<p class="text-surface-200 truncate text-sm font-medium">{file.file.name}</p>
											{#if file.metadata}
												<p class="text-surface-500 text-xs">
													{formatDuration(file.metadata.duration)} • {file.metadata.frameCount} frames
													• {file.metadata.width}×{file.metadata.height}
												</p>
											{:else}
												<p class="text-surface-500 text-xs">{formatBytes(file.file.size)}</p>
											{/if}
										</div>

										<button
											onclick={() => removeFile(file.id)}
											class="text-surface-500 p-2 transition-colors hover:text-red-400"
										>
											<Trash2 class="h-4 w-4" />
										</button>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Right: Settings -->
				<div class="glass h-fit rounded-2xl p-6" in:fly={{ y: 20, delay: 100, duration: 200 }}>
					<h3 class="text-surface-100 mb-6 flex items-center gap-2 text-lg font-semibold">
						<Settings class="h-5 w-5 text-cyan-400" />
						Combine Settings
					</h3>

					<div class="space-y-5">
						<!-- Combine Mode -->
						<div>
							<label class="text-surface-300 mb-3 block text-sm font-medium">Combine Mode</label>
							<div class="grid grid-cols-1 gap-2">
								<button
									onclick={() => (combineMode = 'sequential')}
									class="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all {combineMode ===
									'sequential'
										? 'text-surface-100 border border-cyan-500/50 bg-gradient-to-r from-cyan-500/20 to-blue-500/20'
										: 'bg-surface-800 text-surface-400 hover:bg-surface-700'}"
								>
									<div class="flex h-6 w-10 flex-shrink-0 items-center justify-center">
										<div class="flex">
											<div class="h-4 w-3 rounded-sm bg-cyan-400/60"></div>
											<div class="-ml-0.5 h-4 w-3 rounded-sm bg-blue-400/60"></div>
											<div class="-ml-0.5 h-4 w-3 rounded-sm bg-purple-400/60"></div>
										</div>
									</div>
									<div>
										<p class="text-sm font-medium">Sequential (End-to-End)</p>
										<p class="text-surface-500 text-xs">Play GIFs one after another</p>
									</div>
								</button>

								<button
									onclick={() => (combineMode = 'horizontal')}
									class="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all {combineMode ===
									'horizontal'
										? 'text-surface-100 border border-cyan-500/50 bg-gradient-to-r from-cyan-500/20 to-blue-500/20'
										: 'bg-surface-800 text-surface-400 hover:bg-surface-700'}"
								>
									<Columns3 class="h-6 w-6 flex-shrink-0 text-cyan-400" />
									<div>
										<p class="text-sm font-medium">Side by Side (Horizontal)</p>
										<p class="text-surface-500 text-xs">Stack GIFs horizontally</p>
									</div>
								</button>

								<button
									onclick={() => (combineMode = 'vertical')}
									class="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all {combineMode ===
									'vertical'
										? 'text-surface-100 border border-cyan-500/50 bg-gradient-to-r from-cyan-500/20 to-blue-500/20'
										: 'bg-surface-800 text-surface-400 hover:bg-surface-700'}"
								>
									<Rows3 class="h-6 w-6 flex-shrink-0 text-cyan-400" />
									<div>
										<p class="text-sm font-medium">Stacked (Vertical)</p>
										<p class="text-surface-500 text-xs">Stack GIFs vertically</p>
									</div>
								</button>
							</div>
						</div>

						<!-- Normalize Size -->
						<div>
							<label class="flex cursor-pointer items-center gap-3">
								<input
									type="checkbox"
									bind:checked={normalizeSize}
									class="border-surface-600 bg-surface-800 h-5 w-5 rounded text-cyan-400 focus:ring-cyan-400"
								/>
								<div>
									<p class="text-surface-300 text-sm font-medium">Normalize dimensions</p>
									<p class="text-surface-500 text-xs">
										Resize all GIFs to match for cleaner output
									</p>
								</div>
							</label>
						</div>

						{#if normalizeSize}
							<div in:slide={{ duration: 200 }}>
								<label class="text-surface-300 mb-2 block text-sm font-medium">
									Output Width: <span class="text-cyan-400">{outputWidth}px</span>
								</label>
								<input
									type="range"
									bind:value={outputWidth}
									min="100"
									max="1080"
									step="20"
									class="w-full accent-cyan-400"
								/>
								<div class="text-surface-500 mt-1 flex justify-between text-xs">
									<span>100px</span>
									<span>1080px</span>
								</div>
							</div>
						{/if}

						<!-- Info box -->
						{#if files.length >= 2}
							<div
								class="bg-surface-800/50 border-surface-700 rounded-xl border p-3"
								in:fade={{ duration: 200 }}
							>
								<p class="text-surface-300 text-sm">
									<span class="font-medium text-cyan-400">Preview:</span>
									{#if combineMode === 'sequential'}
										{files.length} GIFs will play in sequence ({formatDuration(totalDuration)} total)
									{:else if combineMode === 'horizontal'}
										{files.length} GIFs side by side
									{:else}
										{files.length} GIFs stacked vertically
									{/if}
								</p>
							</div>
						{/if}

						<!-- Combine Button -->
						<button
							onclick={handleCombine}
							disabled={files.length < 2 || isProcessing}
							class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#if isProcessing}
								<Loader2 class="h-5 w-5 animate-spin" />
								{progressStage} ({progress}%)
							{:else}
								<Merge class="h-5 w-5" />
								Combine {files.length} GIFs
							{/if}
						</button>

						<!-- Progress -->
						{#if isProcessing}
							<div class="bg-surface-800 h-2 overflow-hidden rounded-full">
								<div
									class="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
									style="width: {progress}%"
								></div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</main>

	<Footer />
</div>

<!-- Comparison Modal -->
{#if showComparison && files.length > 0 && resultUrl}
	<CompareSlider
		originalUrl={files[0].url}
		compressedUrl={resultUrl}
		originalSize={files.reduce((sum, f) => sum + f.file.size, 0)}
		compressedSize={resultSize}
		onclose={() => (showComparison = false)}
	/>
{/if}
