<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import CompareSlider from '$lib/components/CompareSlider.svelte';
	import BatchSummary from '$lib/components/BatchSummary.svelte';
	import { toast } from '$lib/components/Toast.svelte';
	import { Gauge, Settings, Download, Trash2, Loader2, Play, Rewind, ArrowLeftRight, Clock, Film, Maximize2, RefreshCw, Eye, Copy, Check } from 'lucide-svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import { changeGifSpeed, reverseGif } from '$lib/utils/gifsicle';
	import { parseGifFile, formatDuration, formatBytes, type GifMetadata } from '$lib/utils/gif-parser';
	import { downloadAllAsZip, downloadBlob, copyBlobToClipboard, isClipboardWriteSupported } from '$lib/utils/download';

	interface GifFile {
		id: string;
		file: File;
		originalUrl: string;
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

	// Speed presets
	const speedPresets = [
		{ id: '0.25', label: '0.25×', multiplier: 0.25, icon: '🐢' },
		{ id: '0.5', label: '0.5×', multiplier: 0.5, icon: '🚶' },
		{ id: '1', label: '1×', multiplier: 1, icon: '▶️' },
		{ id: '1.5', label: '1.5×', multiplier: 1.5, icon: '🏃' },
		{ id: '2', label: '2×', multiplier: 2, icon: '⚡' },
		{ id: '3', label: '3×', multiplier: 3, icon: '🚀' }
	];

	let selectedPreset = $state<string>('2');
	let speedMultiplier = $state(2);
	let reverse = $state(false);
	let boomerang = $state(false);

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
			
			// Parse metadata
			try {
				gifFile.metadata = await parseGifFile(file);
			} catch (e) {
				console.warn('Failed to parse GIF metadata:', e);
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
		const preset = speedPresets.find(p => p.id === presetId);
		if (preset) {
			selectedPreset = presetId;
			speedMultiplier = preset.multiplier;
		}
	}

	async function handleProcess() {
		if (files.length === 0) return;
		
		isProcessing = true;
		
		const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');
		
		for (const gifFile of pendingFiles) {
			// Update status to processing
			const startTime = performance.now();
			files = files.map(f => f.id === gifFile.id ? { ...f, status: 'processing' as const, progress: 0 } : f);
			
			try {
				const buffer = await gifFile.file.arrayBuffer();
				
				// Determine which function to use
				const processFn = (reverse || boomerang) ? reverseGif : changeGifSpeed;
				
				const { result, stats } = await processFn(
					buffer,
					{
						speedMultiplier,
						reverse,
						boomerang
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
				console.error('Speed change error:', error);
				files = files.map(f => f.id === gifFile.id ? {
					...f,
					status: 'error' as const,
					error: error instanceof Error ? error.message : 'Processing failed'
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

	function openComparison(gifFile: GifFile) {
		comparisonFile = gifFile;
		showComparison = true;
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
					compressedBlob: undefined
				};
			}
			return f;
		});
		await handleProcess();
	}

	function getFileSuffix(): string {
		if (boomerang) return '-boomerang';
		if (reverse) return '-reversed';
		return `-${speedMultiplier}x`;
	}

	function downloadFile(gifFile: GifFile) {
		if (!gifFile.compressedBlob) return;
		const suffix = getFileSuffix();
		downloadBlob(gifFile.compressedBlob, gifFile.file.name.replace('.gif', `${suffix}.gif`));
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
			const suffix = getFileSuffix();
			const items = completed.map(f => ({
				name: f.file.name.replace('.gif', `${suffix}.gif`),
				blob: f.compressedBlob!
			}));
			await downloadAllAsZip(items, 'speed-adjusted-gifs.zip');
			toast.success(`Downloaded ${completed.length} GIFs as ZIP`);
		}
	}

	const completedCount = $derived(files.filter(f => f.status === 'completed').length);
	const totalOriginal = $derived(files.reduce((sum, f) => sum + f.file.size, 0));
	const totalCompressed = $derived(files.filter(f => f.compressedSize).reduce((sum, f) => sum + (f.compressedSize || 0), 0));
	
	// Description of what will happen
	const actionDescription = $derived(() => {
		if (boomerang) return 'Create a boomerang effect (forward + reverse)';
		if (reverse) return 'Reverse the animation direction';
		if (speedMultiplier > 1) return `Speed up animation by ${speedMultiplier}×`;
		if (speedMultiplier < 1) return `Slow down animation to ${speedMultiplier}×`;
		return 'Keep original speed';
	});
</script>

<svelte:head>
	<title>Speed & Reverse - Swirl</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />

	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div class="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-orange-500/10 to-red-500/10 blur-3xl"></div>
		<div class="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-red-500/10 to-orange-500/10 blur-3xl"></div>
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-12">
		<div class="mx-auto max-w-5xl">
			<!-- Header -->
			<div class="text-center mb-8" in:fade={{ duration: 200 }}>
				<div class="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-400 mb-4">
					<Gauge class="h-4 w-4" />
					Speed & Reverse
				</div>
				<h1 class="text-3xl font-bold text-surface-100">
					Change GIF <span class="gradient-text">playback speed</span>
				</h1>
				<p class="mt-2 text-surface-500">
					Speed up, slow down, reverse, or create boomerang loops
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
														{#if speedMultiplier !== 1 && !reverse && !boomerang}
															<span class="text-orange-400">→ {formatDuration(gifFile.metadata.duration / speedMultiplier)}</span>
														{:else if boomerang}
															<span class="text-orange-400">→ {formatDuration(gifFile.metadata.duration * 2)}</span>
														{/if}
													</span>
													<span class="flex items-center gap-1">
														<Film class="h-3 w-3" />
														{gifFile.metadata.frameCount} frames
														{#if boomerang}
															<span class="text-orange-400">→ {gifFile.metadata.frameCount * 2}</span>
														{/if}
													</span>
													<span>{gifFile.metadata.fps} FPS</span>
												</div>
											{/if}
											
											<div class="flex items-center gap-2 text-xs text-surface-500 mt-0.5">
												<span>{formatBytes(gifFile.file.size)}</span>
												{#if gifFile.compressedSize}
													<span class="text-surface-600">→</span>
													<span class="text-orange-400">{formatBytes(gifFile.compressedSize)}</span>
												{/if}
												{#if gifFile.processingTime}
													<span>• {formatTime(gifFile.processingTime)}</span>
												{/if}
											</div>
											
											{#if gifFile.status === 'processing'}
												<div class="mt-1 h-1 bg-surface-700 rounded-full overflow-hidden">
													<div 
														class="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all"
														style="width: {gifFile.progress}%"
													></div>
						</div>
											{/if}
						</div>
					</div>

									<div class="flex items-center gap-1 ml-2">
										{#if gifFile.status === 'processing'}
											<Loader2 class="h-5 w-5 text-orange-400 animate-spin" />
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
						<Settings class="h-5 w-5 text-orange-400" />
						Speed Settings
					</h3>

					<!-- Speed Controls (hidden when effect is selected) -->
					{#if !reverse && !boomerang}
						<!-- Speed Presets -->
						<div class="mb-6" transition:slide={{ duration: 200 }}>
							<label class="block text-sm font-medium text-surface-300 mb-3">Speed Multiplier</label>
							<div class="grid grid-cols-3 gap-2">
								{#each speedPresets as preset}
									<button
										onclick={() => selectPreset(preset.id)}
										class="flex flex-col items-center gap-1 rounded-xl px-4 py-3 transition-all {selectedPreset === preset.id
											? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50 text-surface-100'
											: 'bg-surface-800 text-surface-400 hover:bg-surface-700'}"
									>
										<span class="text-lg">{preset.icon}</span>
										<span class="text-sm font-medium">{preset.label}</span>
									</button>
								{/each}
							</div>
						</div>

						<!-- Custom Speed -->
						<div class="mb-6" transition:slide={{ duration: 200 }}>
							<label class="block text-sm font-medium text-surface-300 mb-2">
								Custom Speed: <span class="text-orange-400">{speedMultiplier}×</span>
							</label>
							<input
								type="range"
								bind:value={speedMultiplier}
								min="0.1"
								max="5"
								step="0.1"
								class="w-full accent-orange-400"
								oninput={() => selectedPreset = ''}
							/>
							<div class="flex justify-between text-xs text-surface-500 mt-1">
								<span>0.1× (slow motion)</span>
								<span>5× (super fast)</span>
							</div>
						</div>
					{/if}

					<!-- Special Effects -->
					<div class="mb-6 space-y-3">
						<label class="block text-sm font-medium text-surface-300 mb-2">Special Effects</label>
						
						<label class="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-surface-800 hover:bg-surface-700 transition-colors">
							<input
								type="checkbox"
								bind:checked={reverse}
								onchange={() => { if (reverse) boomerang = false; }}
								class="h-5 w-5 rounded border-surface-600 bg-surface-900 text-orange-400 focus:ring-orange-400"
							/>
							<Rewind class="h-5 w-5 text-orange-400" />
							<div>
								<p class="text-sm font-medium text-surface-200">Reverse</p>
								<p class="text-xs text-surface-500">Play animation backwards</p>
							</div>
						</label>
						
						<label class="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-surface-800 hover:bg-surface-700 transition-colors">
							<input
								type="checkbox"
								bind:checked={boomerang}
								onchange={() => { if (boomerang) reverse = false; }}
								class="h-5 w-5 rounded border-surface-600 bg-surface-900 text-orange-400 focus:ring-orange-400"
							/>
							<ArrowLeftRight class="h-5 w-5 text-orange-400" />
							<div>
								<p class="text-sm font-medium text-surface-200">Boomerang</p>
								<p class="text-xs text-surface-500">Play forward then reverse (like Instagram)</p>
							</div>
						</label>
					</div>

					<!-- Action description -->
					<div class="mb-6 p-3 rounded-xl bg-surface-800/50 border border-surface-700">
						<p class="text-sm text-surface-300">
							<span class="text-orange-400 font-medium">Result:</span> {actionDescription()}
						</p>
					</div>

					<!-- Process Button -->
					<div class="flex gap-2">
						<button
							onclick={handleProcess}
							disabled={files.length === 0 || isProcessing}
							class="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-orange-500/30 transition-all hover:shadow-xl hover:shadow-orange-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if isProcessing}
							<Loader2 class="h-5 w-5 animate-spin" />
								Processing...
							{:else}
							<Play class="h-5 w-5" />
							Process {files.length} GIF{files.length !== 1 ? 's' : ''}
							{/if}
						</button>
						
						{#if completedCount > 0}
							<button
								onclick={reprocessAll}
								disabled={isProcessing}
								class="flex items-center justify-center gap-2 rounded-xl bg-surface-700 px-4 py-3 text-sm font-medium text-surface-200 hover:bg-surface-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								title="Re-process all with current settings"
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
		compressedSize={comparisonFile.compressedBlob?.size || 0}
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
