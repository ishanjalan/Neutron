<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import { toast } from '@neutron/ui';
	import { Layers, Download, Check, RotateCcw, Loader2, Image, Package } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import { 
		extractGifFrames, 
		downloadFrame, 
		downloadFramesAsZip, 
		cleanupFrames,
		type ExtractedFrame 
	} from '$lib/utils/gif-extractor';
	import { parseGifFile, formatDuration, type GifMetadata } from '$lib/utils/gif-parser';
	import { formatBytes } from '@neutron/utils';

	// State
	let file = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let metadata = $state<GifMetadata | null>(null);
	let frames = $state<(ExtractedFrame & { selected: boolean })[]>([]);
	let isExtracting = $state(false);
	let isExporting = $state(false);
	let extractProgress = $state(0);
	let exportProgress = $state(0);

	// Derived
	const selectedFrames = $derived(frames.filter(f => f.selected));
	const selectedCount = $derived(selectedFrames.length);
	const hasFrames = $derived(frames.length > 0);

	async function handleFiles(files: File[]) {
		const gifFile = files.find(f => f.type === 'image/gif' || f.name.endsWith('.gif'));
		if (!gifFile) {
			toast.error('Please select a GIF file');
			return;
		}
		
		// Clean up previous frames
		if (frames.length > 0) {
			cleanupFrames(frames);
		}
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		
		file = gifFile;
		previewUrl = URL.createObjectURL(gifFile);
		isExtracting = true;
		extractProgress = 0;
		frames = [];
		
		try {
			// Parse metadata
			metadata = await parseGifFile(gifFile);
			
			// Extract frames
			const extractedFrames = await extractGifFrames(
				gifFile,
				(progress) => {
					extractProgress = progress.percentage;
				}
			);
			
			// Add selected property
			frames = extractedFrames.map(f => ({ ...f, selected: true }));
			
			toast.success(`Extracted ${frames.length} frames from ${gifFile.name}`);
		} catch (error) {
			console.error('Frame extraction error:', error);
			toast.error('Failed to extract frames. Please try a different GIF.');
			reset();
		} finally {
			isExtracting = false;
		}
	}

	function toggleFrame(index: number) {
		frames[index].selected = !frames[index].selected;
	}

	function selectAll() {
		frames = frames.map(f => ({ ...f, selected: true }));
	}

	function selectNone() {
		frames = frames.map(f => ({ ...f, selected: false }));
	}

	function selectEveryNth(n: number) {
		frames = frames.map((f, i) => ({ ...f, selected: i % n === 0 }));
		toast.info(`Selected every ${n}${n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'} frame`);
	}

	async function handleDownloadSingle(frame: ExtractedFrame & { selected: boolean }) {
		if (!file) return;
		const baseName = file.name.replace(/\.gif$/i, '');
		downloadFrame(frame, baseName);
		toast.success(`Downloaded frame ${frame.index + 1}`);
	}

	async function handleExport() {
		if (selectedCount === 0 || !file) {
			toast.error('Please select at least one frame');
			return;
		}
		
		isExporting = true;
		exportProgress = 0;
		
		try {
			const baseName = file.name.replace(/\.gif$/i, '');
			
			if (selectedCount === 1) {
				// Download single frame
				downloadFrame(selectedFrames[0], baseName);
				toast.success('Downloaded frame as PNG');
			} else {
				// Download as ZIP
				await downloadFramesAsZip(
					selectedFrames,
					baseName,
					(progress) => {
						exportProgress = progress.percentage;
					}
				);
				toast.success(`Downloaded ${selectedCount} frames as ZIP`);
			}
		} catch (error) {
			console.error('Export error:', error);
			toast.error('Failed to export frames');
		} finally {
			isExporting = false;
		}
	}

	function reset() {
		if (frames.length > 0) {
			cleanupFrames(frames);
		}
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		file = null;
		previewUrl = null;
		metadata = null;
		frames = [];
		isExtracting = false;
		isExporting = false;
		extractProgress = 0;
		exportProgress = 0;
	}
</script>

<svelte:head>
	<title>Split Frames - Swirl</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />

	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div class="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/10 blur-3xl"></div>
		<div class="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-teal-500/10 to-emerald-500/10 blur-3xl"></div>
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-12">
		<div class="mx-auto max-w-6xl">
			<!-- Header -->
			<div class="text-center mb-8" in:fade={{ duration: 200 }}>
				<div class="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-400 mb-4">
					<Layers class="h-4 w-4" />
					Split Frames
				</div>
				<h1 class="text-3xl font-bold text-surface-100">
					Extract GIF frames as <span class="gradient-text">PNG images</span>
				</h1>
				<p class="mt-2 text-surface-500">
					Select individual frames or download all as a ZIP
				</p>
			</div>

			{#if !file}
				<DropZone 
					accept=".gif,image/gif"
					acceptLabel="GIF files only"
					onfiles={handleFiles}
				/>
			{:else if isExtracting}
				<!-- Extraction Progress -->
				<div class="glass rounded-2xl p-8 text-center" in:fade={{ duration: 200 }}>
					<Loader2 class="h-12 w-12 text-emerald-400 mx-auto mb-4 animate-spin" />
					<h3 class="text-lg font-semibold text-surface-100 mb-2">Extracting Frames...</h3>
					<p class="text-surface-500 mb-4">Processing {file.name}</p>
					
					<div class="w-full max-w-md mx-auto">
						<div class="h-2 bg-surface-700 rounded-full overflow-hidden">
							<div 
								class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
								style="width: {extractProgress}%"
							></div>
						</div>
						<p class="text-sm text-surface-400 mt-2">{extractProgress}%</p>
					</div>
				</div>
			{:else}
				<div in:fly={{ y: 20, duration: 200 }}>
					<!-- GIF Info & Controls -->
					<div class="glass rounded-2xl p-4 mb-6">
						<div class="flex flex-wrap items-center justify-between gap-4">
							<!-- File Info -->
							<div class="flex items-center gap-4">
								{#if previewUrl}
									<img 
										src={previewUrl} 
										alt={file?.name} 
										class="w-12 h-12 rounded-lg object-cover bg-surface-800"
									/>
								{/if}
								<div>
									<p class="font-medium text-surface-100">{file?.name}</p>
									{#if metadata}
										<p class="text-sm text-surface-500">
											{metadata.width}×{metadata.height} • {formatDuration(metadata.duration)} • {metadata.fps} FPS
										</p>
									{/if}
								</div>
							</div>

							<!-- Reset Button -->
							<button
								onclick={reset}
								class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors"
							>
								<RotateCcw class="h-4 w-4" />
								New GIF
							</button>
						</div>
					</div>

					<!-- Selection Controls -->
					<div class="glass rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
						<div class="flex items-center gap-4">
							<span class="text-surface-300">
								<span class="font-semibold text-surface-100">{selectedCount}</span> of {frames.length} frames selected
							</span>
							<div class="flex gap-2">
								<button
									onclick={selectAll}
									class="rounded-lg bg-surface-800 px-3 py-1.5 text-sm text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors"
								>
									All
								</button>
								<button
									onclick={selectNone}
									class="rounded-lg bg-surface-800 px-3 py-1.5 text-sm text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors"
								>
									None
								</button>
								<button
									onclick={() => selectEveryNth(2)}
									class="rounded-lg bg-surface-800 px-3 py-1.5 text-sm text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors"
								>
									Every 2nd
								</button>
								<button
									onclick={() => selectEveryNth(3)}
									class="rounded-lg bg-surface-800 px-3 py-1.5 text-sm text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors"
								>
									Every 3rd
								</button>
							</div>
						</div>

						<button
							onclick={handleExport}
							disabled={selectedCount === 0 || isExporting}
							class="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-start to-accent-end px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-start/30 transition-all hover:shadow-xl hover:shadow-accent-start/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
						>
							{#if isExporting}
								<Loader2 class="h-4 w-4 animate-spin" />
								{exportProgress > 0 ? `${exportProgress}%` : 'Exporting...'}
							{:else if selectedCount > 1}
								<Package class="h-4 w-4" />
								Download {selectedCount} as ZIP
							{:else}
								<Download class="h-4 w-4" />
								Download Frame
							{/if}
						</button>
					</div>

					<!-- Frame Grid -->
					<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
						{#each frames as frame, i}
							<div class="group relative">
								<button
									onclick={() => toggleFrame(i)}
									class="w-full aspect-square rounded-xl overflow-hidden border-2 transition-all {frame.selected
										? 'border-emerald-500 shadow-lg shadow-emerald-500/20'
										: 'border-surface-700 hover:border-surface-600'}"
								>
									<img src={frame.url} alt="Frame {i + 1}" class="w-full h-full object-contain bg-surface-900" />
									
									<!-- Frame number -->
									<div class="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
										#{i + 1}
									</div>

									<!-- Delay -->
									<div class="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
										{frame.delay}ms
									</div>

									<!-- Selection indicator -->
									<div class="absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center transition-all {frame.selected
										? 'bg-emerald-500'
										: 'bg-surface-800/80 group-hover:bg-surface-700'}"
									>
										{#if frame.selected}
											<Check class="h-4 w-4 text-white" />
										{/if}
									</div>
								</button>

								<!-- Individual download button -->
								<button
									onclick={() => handleDownloadSingle(frame)}
									class="absolute top-2 left-2 h-6 w-6 rounded-full bg-surface-800/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-700"
									title="Download this frame"
								>
									<Download class="h-3 w-3 text-white" />
								</button>
							</div>
						{/each}
					</div>

					{#if frames.length === 0 && !isExtracting}
						<div class="text-center py-12 text-surface-500">
							<Image class="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p>No frames extracted. The GIF may be corrupted or use an unsupported format.</p>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</main>

	<Footer />
</div>
