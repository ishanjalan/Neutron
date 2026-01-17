<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import CompareSlider from '$lib/components/CompareSlider.svelte';
	import BatchSummary from '$lib/components/BatchSummary.svelte';
	import { toast } from '@neutron/ui';
	import { Scaling, Settings, Download, Trash2, Eye, Loader2, Lock, Unlock, Clock, Film, RefreshCw, Copy, Check } from 'lucide-svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import { resizeGif } from '$lib/utils/gifsicle';
	import { parseGifFile, formatDuration, type GifMetadata } from '$lib/utils/gif-parser';
	import { formatBytes, downloadBlob, copyBlobToClipboard, isClipboardWriteSupported } from '@neutron/utils';
	import { downloadAllAsZip } from '$lib/utils/download';

	interface GifFile {
		id: string;
		file: File;
		originalUrl: string;
		width?: number;
		height?: number;
		status: 'pending' | 'processing' | 'completed' | 'error';
		progress: number;
		error?: string;
		compressedUrl?: string;
		compressedBlob?: Blob;
		compressedSize?: number;
		metadata?: GifMetadata;
		processingTime?: number;
	}

	let files = $state<GifFile[]>([]);
	let isProcessing = $state(false);
	let copiedFileId = $state<string | null>(null);

	// Size presets
	const sizePresets = [
		{ id: 'discord-emoji', label: 'Discord Emoji', width: 128, height: 128, icon: '😀' },
		{ id: 'discord-sticker', label: 'Discord Sticker', width: 320, height: 320, icon: '🏷️' },
		{ id: 'thumbnail', label: 'Thumbnail', width: 150, height: 150, icon: '🖼️' },
		{ id: 'social', label: 'Social Media', width: 480, height: 480, icon: '📱' },
		{ id: 'hd', label: 'HD', width: 720, height: 720, icon: '🎬' },
		{ id: 'custom', label: 'Custom', width: 0, height: 0, icon: '✏️' }
	];

	let selectedPreset = $state<string>('social');
	let targetWidth = $state(480);
	let targetHeight = $state(480);
	let maintainAspectRatio = $state(true);
	let optimizeAfterResize = $state(true);
	let colors = $state(256);

	// Comparison modal
	let showComparison = $state(false);
	let comparisonFile = $state<GifFile | null>(null);

	// Batch summary modal
	let showBatchSummary = $state(false);

	function generateId(): string {
		return `gif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	function formatTime(ms: number): string {
		if (ms < 1000) return `${ms}ms`;
		return `${(ms / 1000).toFixed(1)}s`;
	}

	async function handleFiles(newFiles: File[]) {
		const gifFiles = newFiles.filter(f => f.type === 'image/gif' || f.name.endsWith('.gif'));
		if (gifFiles.length === 0) {
			toast.error('Please select GIF files');
			return;
		}
		
		const newGifFiles: GifFile[] = [];
		
		for (const file of gifFiles) {
			const gifFile: GifFile = {
				id: generateId(),
				file,
				originalUrl: URL.createObjectURL(file),
				status: 'pending',
				progress: 0
			};
			
			// Parse metadata (includes dimensions)
			try {
				const metadata = await parseGifFile(file);
				gifFile.metadata = metadata;
				gifFile.width = metadata.width;
				gifFile.height = metadata.height;
			} catch (e) {
				console.warn('Failed to parse GIF metadata:', e);
				// Fallback to image dimensions
				const img = new Image();
				img.onload = () => {
					files = files.map(f => f.id === gifFile.id ? { ...f, width: img.naturalWidth, height: img.naturalHeight } : f);
				};
				img.src = gifFile.originalUrl;
			}
			
			newGifFiles.push(gifFile);
		}
		
		files = [...files, ...newGifFiles];
		toast.success(`Added ${gifFiles.length} GIF(s)`);
	}

	function removeFile(id: string) {
		const file = files.find(f => f.id === id);
		if (file) {
			URL.revokeObjectURL(file.originalUrl);
			if (file.compressedUrl) URL.revokeObjectURL(file.compressedUrl);
		}
		files = files.filter(f => f.id !== id);
	}

	function selectPreset(presetId: string) {
		const preset = sizePresets.find(p => p.id === presetId);
		if (preset) {
			selectedPreset = presetId;
			if (preset.width > 0) {
				targetWidth = preset.width;
				targetHeight = preset.height;
			}
		}
	}

	async function handleResize() {
		if (files.length === 0) return;
		
		isProcessing = true;
		
		const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');
		
		for (const gifFile of pendingFiles) {
			// Update status to processing
			const startTime = performance.now();
			files = files.map(f => f.id === gifFile.id ? { ...f, status: 'processing' as const, progress: 0 } : f);
			
			try {
				const buffer = await gifFile.file.arrayBuffer();
				
				// Calculate target dimensions maintaining aspect ratio if needed
				let finalWidth = targetWidth;
				let finalHeight = targetHeight;
				
				if (maintainAspectRatio && gifFile.width && gifFile.height) {
					const aspectRatio = gifFile.width / gifFile.height;
					if (targetWidth && !targetHeight) {
						finalHeight = Math.round(targetWidth / aspectRatio);
					} else if (targetHeight && !targetWidth) {
						finalWidth = Math.round(targetHeight * aspectRatio);
					} else {
						// Both specified, use width as primary
						finalHeight = Math.round(targetWidth / aspectRatio);
					}
				}
				
				const { result, stats } = await resizeGif(
					buffer,
					{
						width: finalWidth,
						height: finalHeight,
						colors: optimizeAfterResize ? colors : 256
					},
					(progress) => {
						files = files.map(f => f.id === gifFile.id ? { ...f, progress } : f);
					}
				);
				
				const processingTime = Math.round(performance.now() - startTime);
				const blob = new Blob([result], { type: 'image/gif' });
				const url = URL.createObjectURL(blob);
				
				files = files.map(f => f.id === gifFile.id ? {
					...f,
					status: 'completed' as const,
					progress: 100,
					compressedUrl: url,
					compressedBlob: blob,
					compressedSize: blob.size,
					processingTime
				} : f);
				
			} catch (error) {
				console.error('Resize error:', error);
				files = files.map(f => f.id === gifFile.id ? {
					...f,
					status: 'error' as const,
					error: error instanceof Error ? error.message : 'Resize failed'
				} : f);
			}
		}
		
		isProcessing = false;
		
		const completedFiles = files.filter(f => f.status === 'completed');
		if (completedFiles.length > 0) {
			if (completedFiles.length === 1 && completedFiles[0].compressedUrl) {
				// Auto-open compare for single file
				openComparison(completedFiles[0]);
			} else if (completedFiles.length > 1) {
				// Show batch summary for multiple files
				showBatchSummary = true;
			}
		}
	}

	async function reprocessAll() {
		files = files.map(f => {
			if (f.status === 'completed') {
				if (f.compressedUrl) URL.revokeObjectURL(f.compressedUrl);
				return {
					...f,
					status: 'pending' as const,
					progress: 0,
					compressedUrl: undefined,
					compressedBlob: undefined,
					compressedSize: undefined
				};
			}
			return f;
		});
		await handleResize();
	}

	function downloadFile(gifFile: GifFile) {
		if (!gifFile.compressedBlob) return;
		downloadBlob(gifFile.compressedBlob, gifFile.file.name.replace('.gif', `-${targetWidth}x${targetHeight}.gif`));
	}

	async function copyFile(gifFile: GifFile) {
		if (!gifFile.compressedBlob) return;
		const success = await copyBlobToClipboard(gifFile.compressedBlob);
		if (success) {
			copiedFileId = gifFile.id;
			toast.success('Copied to clipboard!');
			setTimeout(() => { copiedFileId = null; }, 2000);
		} else {
			toast.error('Copy not supported in this browser');
		}
	}

	async function downloadAll() {
		const completed = files.filter(f => f.status === 'completed' && f.compressedBlob);
		if (completed.length === 0) return;
		
		if (completed.length === 1) {
			downloadFile(completed[0]);
		} else {
			const items = completed.map(f => ({
				name: f.file.name.replace('.gif', `-${targetWidth}x${targetHeight}.gif`),
				blob: f.compressedBlob!
			}));
			await downloadAllAsZip(items, 'resized-gifs.zip');
			toast.success(`Downloaded ${completed.length} GIFs as ZIP`);
		}
	}

	function openComparison(gifFile: GifFile) {
		comparisonFile = gifFile;
		showComparison = true;
	}

	const completedCount = $derived(files.filter(f => f.status === 'completed').length);
	const totalOriginal = $derived(files.reduce((sum, f) => sum + f.file.size, 0));
	const totalCompressed = $derived(files.filter(f => f.compressedSize).reduce((sum, f) => sum + (f.compressedSize || 0), 0));
</script>

<svelte:head>
	<title>Resize GIF - Swirl</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />

	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div class="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 blur-3xl"></div>
		<div class="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-blue-500/10 to-cyan-500/10 blur-3xl"></div>
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-12">
		<div class="mx-auto max-w-5xl">
			<!-- Header -->
			<div class="text-center mb-8" in:fade={{ duration: 200 }}>
				<div class="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-4 py-1.5 text-sm font-medium text-cyan-400 mb-4">
					<Scaling class="h-4 w-4" />
					Resize GIF
				</div>
				<h1 class="text-3xl font-bold text-surface-100">
					Resize GIFs to <span class="gradient-text">any dimension</span>
				</h1>
				<p class="mt-2 text-surface-500">
					Perfect for Discord emojis, stickers, and social media
				</p>
			</div>

			<div class="grid gap-6 lg:grid-cols-2">
				<!-- Left: Drop zone and file list -->
				<div>
				<DropZone 
					accept=".gif,image/gif"
					acceptLabel="GIF files only"
					onfiles={handleFiles}
						compact={files.length > 0}
					/>

					{#if files.length > 0}
						<div class="mt-4 space-y-2" in:fly={{ y: 20, duration: 200 }}>
							{#each files as gifFile (gifFile.id)}
								<div 
									class="glass rounded-xl p-3 flex items-center justify-between"
									in:slide={{ duration: 200 }}
								>
									<div class="flex items-center gap-3 min-w-0 flex-1">
										<div class="h-12 w-12 rounded-lg bg-surface-800 overflow-hidden flex-shrink-0">
											<img 
												src={gifFile.compressedUrl || gifFile.originalUrl} 
												alt="" 
												class="w-full h-full object-cover"
											/>
										</div>
										<div class="min-w-0 flex-1">
											<p class="text-sm font-medium text-surface-200 truncate">{gifFile.file.name}</p>
											
											<!-- Metadata display -->
											{#if gifFile.metadata}
												<div class="flex items-center gap-3 text-xs text-surface-500 mt-0.5">
													<span class="flex items-center gap-1">
														<Clock class="h-3 w-3" />
														{formatDuration(gifFile.metadata.duration)}
													</span>
													<span class="flex items-center gap-1">
														<Film class="h-3 w-3" />
														{gifFile.metadata.frameCount} frames
													</span>
													<span>{gifFile.metadata.fps} FPS</span>
												</div>
											{/if}
											
											<div class="flex items-center gap-2 text-xs mt-0.5">
												{#if gifFile.width && gifFile.height}
													<span class="text-surface-500">{gifFile.width}×{gifFile.height}</span>
													<span class="text-surface-600">→</span>
													<span class="text-cyan-400">{targetWidth}×{maintainAspectRatio && gifFile.width ? Math.round(targetWidth / (gifFile.width / gifFile.height)) : targetHeight}</span>
												{/if}
												<span class="text-surface-500">({formatBytes(gifFile.file.size)})</span>
												{#if gifFile.compressedSize}
													<span class="text-surface-600">→</span>
													<span class="text-cyan-400">{formatBytes(gifFile.compressedSize)}</span>
												{/if}
												{#if gifFile.processingTime}
													<span class="text-surface-500">• {formatTime(gifFile.processingTime)}</span>
												{/if}
											</div>
											
											{#if gifFile.status === 'processing'}
												<div class="mt-1 h-1 bg-surface-700 rounded-full overflow-hidden">
													<div 
														class="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all"
														style="width: {gifFile.progress}%"
													></div>
												</div>
											{/if}
										</div>
									</div>
									
									<div class="flex items-center gap-1 ml-2">
										{#if gifFile.status === 'processing'}
											<Loader2 class="h-5 w-5 text-cyan-400 animate-spin" />
										{:else if gifFile.status === 'completed'}
											<button
												onclick={() => openComparison(gifFile)}
												class="p-2 text-surface-400 hover:text-surface-200 transition-colors"
												title="Compare"
											>
												<Eye class="h-4 w-4" />
											</button>
											{#if isClipboardWriteSupported()}
												<button
													onclick={() => copyFile(gifFile)}
													class="p-2 text-surface-400 hover:text-surface-200 transition-colors"
													title="Copy to clipboard"
												>
													{#if copiedFileId === gifFile.id}
														<Check class="h-4 w-4 text-green-400" />
													{:else}
														<Copy class="h-4 w-4" />
													{/if}
												</button>
											{/if}
											<button
												onclick={() => downloadFile(gifFile)}
												class="p-2 text-green-400 hover:text-green-300 transition-colors"
												title="Download"
											>
												<Download class="h-4 w-4" />
											</button>
										{/if}
										<button
											onclick={() => removeFile(gifFile.id)}
											class="p-2 text-surface-500 hover:text-red-400 transition-colors"
											title="Remove"
										>
											<Trash2 class="h-4 w-4" />
										</button>
									</div>
								</div>
							{/each}
							
							<!-- Download All -->
							{#if completedCount > 0}
								<button
									onclick={downloadAll}
									class="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-green-500/20 border border-green-500/30 px-4 py-3 text-sm font-medium text-green-400 hover:bg-green-500/30 transition-colors"
								>
									<Download class="h-4 w-4" />
									Download All ({completedCount})
								</button>
							{/if}
						</div>
					{/if}
					</div>

				<!-- Right: Settings -->
				<div class="glass rounded-2xl p-6" in:fly={{ y: 20, delay: 100, duration: 200 }}>
					<h3 class="flex items-center gap-2 text-lg font-semibold text-surface-100 mb-6">
						<Settings class="h-5 w-5 text-cyan-400" />
						Resize Settings
					</h3>

						<!-- Size Presets -->
						<div class="mb-6">
						<label class="block text-sm font-medium text-surface-300 mb-3">Size Presets</label>
						<div class="grid grid-cols-2 gap-2">
								{#each sizePresets as preset}
									<button
									onclick={() => selectPreset(preset.id)}
									class="flex items-center gap-2 rounded-xl px-4 py-3 text-left transition-all {selectedPreset === preset.id
										? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/50 text-surface-100'
										: 'bg-surface-800 text-surface-400 hover:bg-surface-700'}"
								>
									<span class="text-lg">{preset.icon}</span>
									<div>
										<p class="text-sm font-medium">{preset.label}</p>
										{#if preset.width > 0}
											<p class="text-xs text-surface-500">{preset.width}×{preset.height}</p>
										{:else}
											<p class="text-xs text-surface-500">Enter size below</p>
										{/if}
									</div>
									</button>
								{/each}
							</div>
						</div>

					<!-- Custom Dimensions -->
						<div class="mb-6">
							<label class="block text-sm font-medium text-surface-300 mb-2">Dimensions</label>
							<div class="flex items-center gap-3">
								<div class="flex-1">
								<label class="text-xs text-surface-500 mb-1 block">Width</label>
									<input
										type="number"
									bind:value={targetWidth}
									min="16"
									max="2048"
										class="w-full rounded-lg bg-surface-800 px-3 py-2 text-surface-100"
									oninput={() => selectedPreset = 'custom'}
									/>
								</div>
								<button
								onclick={() => maintainAspectRatio = !maintainAspectRatio}
								class="mt-5 p-2 rounded-lg transition-colors {maintainAspectRatio ? 'bg-cyan-500/20 text-cyan-400' : 'bg-surface-800 text-surface-500'}"
								title={maintainAspectRatio ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
							>
								{#if maintainAspectRatio}
										<Lock class="h-5 w-5" />
									{:else}
										<Unlock class="h-5 w-5" />
									{/if}
								</button>
								<div class="flex-1">
								<label class="text-xs text-surface-500 mb-1 block">Height</label>
									<input
										type="number"
									bind:value={targetHeight}
									min="16"
									max="2048"
									disabled={maintainAspectRatio}
									class="w-full rounded-lg bg-surface-800 px-3 py-2 text-surface-100 disabled:opacity-50"
									oninput={() => selectedPreset = 'custom'}
									/>
								</div>
							</div>
						{#if maintainAspectRatio}
							<p class="text-xs text-surface-500 mt-2">Height will be calculated automatically to maintain aspect ratio</p>
						{/if}
						</div>

					<!-- Optimize after resize -->
						<div class="mb-6">
						<label class="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={optimizeAfterResize}
								class="h-5 w-5 rounded border-surface-600 bg-surface-800 text-cyan-400 focus:ring-cyan-400"
							/>
							<div>
								<p class="text-sm font-medium text-surface-300">Optimize after resize</p>
								<p class="text-xs text-surface-500">Reduce colors to minimize file size</p>
							</div>
						</label>
					</div>

					{#if optimizeAfterResize}
						<div class="mb-6" in:slide={{ duration: 200 }}>
							<label class="block text-sm font-medium text-surface-300 mb-2">
								Colors: <span class="text-cyan-400">{colors}</span>
							</label>
							<input
								type="range"
								bind:value={colors}
								min="16"
								max="256"
								step="16"
								class="w-full accent-cyan-400"
							/>
						</div>
					{/if}

						<!-- Resize Button -->
					<div class="flex gap-2">
						<button
							onclick={handleResize}
							disabled={files.length === 0 || isProcessing}
							class="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:shadow-xl hover:shadow-cyan-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if isProcessing}
								<Loader2 class="h-5 w-5 animate-spin" />
								Resizing...
							{:else}
								<Scaling class="h-5 w-5" />
								Resize {files.length} GIF{files.length !== 1 ? 's' : ''}
							{/if}
						</button>
						
						{#if completedCount > 0}
							<button
								onclick={reprocessAll}
								disabled={isProcessing}
								class="flex items-center justify-center gap-2 rounded-xl bg-surface-700 px-4 py-3 text-sm font-medium text-surface-200 hover:bg-surface-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								title="Re-resize all with current settings"
							>
								<RefreshCw class="h-4 w-4" />
							</button>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</main>

	<Footer />
</div>

<!-- Comparison Modal -->
{#if showComparison && comparisonFile && comparisonFile.compressedUrl}
	<CompareSlider
		originalUrl={comparisonFile.originalUrl}
		compressedUrl={comparisonFile.compressedUrl}
		originalSize={comparisonFile.file.size}
		compressedSize={comparisonFile.compressedSize || 0}
		onclose={() => showComparison = false}
	/>
{/if}

<!-- Batch Summary Modal -->
{#if showBatchSummary && completedCount > 1}
	<BatchSummary
		totalFiles={completedCount}
		totalOriginalSize={totalOriginal}
		totalCompressedSize={totalCompressed}
		ondownloadAll={downloadAll}
		onclose={() => showBatchSummary = false}
	/>
{/if}
