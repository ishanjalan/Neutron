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
		type ExtractedFrame,
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
	const selectedFrames = $derived(frames.filter((f) => f.selected));
	const selectedCount = $derived(selectedFrames.length);
	const hasFrames = $derived(frames.length > 0);

	async function handleFiles(files: File[]) {
		const gifFile = files.find((f) => f.type === 'image/gif' || f.name.endsWith('.gif'));
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
			const extractedFrames = await extractGifFrames(gifFile, (progress) => {
				extractProgress = progress.percentage;
			});

			// Add selected property
			frames = extractedFrames.map((f) => ({ ...f, selected: true }));

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
		frames = frames.map((f) => ({ ...f, selected: true }));
	}

	function selectNone() {
		frames = frames.map((f) => ({ ...f, selected: false }));
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
				await downloadFramesAsZip(selectedFrames, baseName, (progress) => {
					exportProgress = progress.percentage;
				});
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
		<div
			class="absolute -right-1/4 -top-1/2 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/10 blur-3xl"
		></div>
		<div
			class="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-teal-500/10 to-emerald-500/10 blur-3xl"
		></div>
	</div>

	<main class="flex-1 px-4 pb-12 pt-28 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-6xl">
			<!-- Header -->
			<div class="mb-8 text-center" in:fade={{ duration: 200 }}>
				<div
					class="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-400"
				>
					<Layers class="h-4 w-4" />
					Split Frames
				</div>
				<h1 class="text-surface-100 text-3xl font-bold">
					Extract GIF frames as <span class="gradient-text">PNG images</span>
				</h1>
				<p class="text-surface-500 mt-2">Select individual frames or download all as a ZIP</p>
			</div>

			{#if !file}
				<DropZone accept=".gif,image/gif" acceptLabel="GIF files only" onfiles={handleFiles} />
			{:else if isExtracting}
				<!-- Extraction Progress -->
				<div class="glass rounded-2xl p-8 text-center" in:fade={{ duration: 200 }}>
					<Loader2 class="mx-auto mb-4 h-12 w-12 animate-spin text-emerald-400" />
					<h3 class="text-surface-100 mb-2 text-lg font-semibold">Extracting Frames...</h3>
					<p class="text-surface-500 mb-4">Processing {file.name}</p>

					<div class="mx-auto w-full max-w-md">
						<div class="bg-surface-700 h-2 overflow-hidden rounded-full">
							<div
								class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
								style="width: {extractProgress}%"
							></div>
						</div>
						<p class="text-surface-400 mt-2 text-sm">{extractProgress}%</p>
					</div>
				</div>
			{:else}
				<div in:fly={{ y: 20, duration: 200 }}>
					<!-- GIF Info & Controls -->
					<div class="glass mb-6 rounded-2xl p-4">
						<div class="flex flex-wrap items-center justify-between gap-4">
							<!-- File Info -->
							<div class="flex items-center gap-4">
								{#if previewUrl}
									<img
										src={previewUrl}
										alt={file?.name}
										class="bg-surface-800 h-12 w-12 rounded-lg object-cover"
									/>
								{/if}
								<div>
									<p class="text-surface-100 font-medium">{file?.name}</p>
									{#if metadata}
										<p class="text-surface-500 text-sm">
											{metadata.width}×{metadata.height} • {formatDuration(metadata.duration)} • {metadata.fps}
											FPS
										</p>
									{/if}
								</div>
							</div>

							<!-- Reset Button -->
							<button
								onclick={reset}
								class="text-surface-400 hover:text-surface-200 hover:bg-surface-700 flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors"
							>
								<RotateCcw class="h-4 w-4" />
								New GIF
							</button>
						</div>
					</div>

					<!-- Selection Controls -->
					<div class="glass mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4">
						<div class="flex items-center gap-4">
							<span class="text-surface-300">
								<span class="text-surface-100 font-semibold">{selectedCount}</span> of {frames.length}
								frames selected
							</span>
							<div class="flex gap-2">
								<button
									onclick={selectAll}
									class="bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200 rounded-lg px-3 py-1.5 text-sm transition-colors"
								>
									All
								</button>
								<button
									onclick={selectNone}
									class="bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200 rounded-lg px-3 py-1.5 text-sm transition-colors"
								>
									None
								</button>
								<button
									onclick={() => selectEveryNth(2)}
									class="bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200 rounded-lg px-3 py-1.5 text-sm transition-colors"
								>
									Every 2nd
								</button>
								<button
									onclick={() => selectEveryNth(3)}
									class="bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200 rounded-lg px-3 py-1.5 text-sm transition-colors"
								>
									Every 3rd
								</button>
							</div>
						</div>

						<button
							onclick={handleExport}
							disabled={selectedCount === 0 || isExporting}
							class="from-accent-start to-accent-end shadow-accent-start/30 hover:shadow-accent-start/40 flex items-center gap-2 rounded-xl bg-gradient-to-r px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
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
					<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
						{#each frames as frame, i}
							<div class="group relative">
								<button
									onclick={() => toggleFrame(i)}
									class="aspect-square w-full overflow-hidden rounded-xl border-2 transition-all {frame.selected
										? 'border-emerald-500 shadow-lg shadow-emerald-500/20'
										: 'border-surface-700 hover:border-surface-600'}"
								>
									<img
										src={frame.url}
										alt="Frame {i + 1}"
										class="bg-surface-900 h-full w-full object-contain"
									/>

									<!-- Frame number -->
									<div
										class="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white"
									>
										#{i + 1}
									</div>

									<!-- Delay -->
									<div
										class="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white"
									>
										{frame.delay}ms
									</div>

									<!-- Selection indicator -->
									<div
										class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full transition-all {frame.selected
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
									class="bg-surface-800/80 hover:bg-surface-700 absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100"
									title="Download this frame"
								>
									<Download class="h-3 w-3 text-white" />
								</button>
							</div>
						{/each}
					</div>

					{#if frames.length === 0 && !isExtracting}
						<div class="text-surface-500 py-12 text-center">
							<Image class="mx-auto mb-4 h-12 w-12 opacity-50" />
							<p>No frames extracted. The GIF may be corrupted or use an unsupported format.</p>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</main>

	<Footer />
</div>
