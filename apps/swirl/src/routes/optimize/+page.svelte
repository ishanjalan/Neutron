<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import CompareSlider from '$lib/components/CompareSlider.svelte';
	import BatchSummary from '$lib/components/BatchSummary.svelte';
	import { toast } from '@neutron/ui';
	import {
		Gauge,
		Settings,
		Download,
		Trash2,
		Eye,
		Loader2,
		CheckCircle,
		AlertCircle,
		Clock,
		Film,
		Maximize2,
		RefreshCw,
		ChevronDown,
		Copy,
		Check,
	} from 'lucide-svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import { optimizeGif } from '$lib/utils/gifsicle';
	import { parseGifFile, formatDuration, type GifMetadata } from '$lib/utils/gif-parser';
	import {
		formatBytes,
		downloadBlob,
		copyBlobToClipboard,
		isClipboardWriteSupported,
	} from '@neutron/utils';
	import { downloadAllAsZip } from '$lib/utils/download';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

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
		processingTime?: number; // in ms
	}

	let files = $state<GifFile[]>([]);
	let isProcessing = $state(false);
	let copiedFileId = $state<string | null>(null);

	// Size presets
	const sizePresets = [
		{ id: 'slack', label: 'Slack', size: 1, icon: '💼' },
		{ id: 'email', label: 'Email', size: 2, icon: '📧' },
		{ id: 'discord', label: 'Discord', size: 10, icon: '💬' },
		{ id: 'twitter', label: 'Twitter/X', size: 15, icon: '𝕏' },
		{ id: 'whatsapp', label: 'WhatsApp', size: 16, icon: '📱' },
		{ id: 'large', label: 'Large', size: 25, icon: '🎬' },
	];

	let selectedPreset = $state<string | null>('discord');
	let targetSizeMB = $state(10);
	let colorReduction = $state(256);
	let lossy = $state(80);
	let showAdvanced = $state(false);

	// Comparison modal
	let showComparison = $state(false);
	let comparisonFile = $state<GifFile | null>(null);

	// Batch summary modal
	let showBatchSummary = $state(false);

	// Handle URL preset parameter
	onMount(() => {
		const presetParam = $page.url.searchParams.get('preset');
		if (presetParam) {
			const preset = sizePresets.find((p) => p.id === presetParam);
			if (preset) {
				selectedPreset = preset.id;
				targetSizeMB = preset.size;
			}
		}
	});

	function generateId(): string {
		return `gif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	function formatTime(ms: number): string {
		if (ms < 1000) return `${ms}ms`;
		return `${(ms / 1000).toFixed(1)}s`;
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
				originalUrl: URL.createObjectURL(file),
				status: 'pending',
				progress: 0,
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
		const file = files.find((f) => f.id === id);
		if (file) {
			URL.revokeObjectURL(file.originalUrl);
			if (file.compressedUrl) URL.revokeObjectURL(file.compressedUrl);
		}
		files = files.filter((f) => f.id !== id);
	}

	function selectPreset(presetId: string) {
		const preset = sizePresets.find((p) => p.id === presetId);
		if (preset) {
			selectedPreset = presetId;
			targetSizeMB = preset.size;
		}
	}

	async function handleOptimize() {
		if (files.length === 0) return;

		isProcessing = true;

		const pendingFiles = files.filter((f) => f.status === 'pending' || f.status === 'error');

		for (const gifFile of pendingFiles) {
			// Update status to processing
			const startTime = performance.now();
			files = files.map((f) =>
				f.id === gifFile.id ? { ...f, status: 'processing' as const, progress: 0 } : f
			);

			try {
				const buffer = await gifFile.file.arrayBuffer();

				const { result, stats } = await optimizeGif(
					buffer,
					{
						targetSizeKB: targetSizeMB * 1024,
						colors: colorReduction,
						lossy: lossy,
					},
					(progress) => {
						files = files.map((f) => (f.id === gifFile.id ? { ...f, progress } : f));
					}
				);

				const processingTime = Math.round(performance.now() - startTime);
				const blob = new Blob([result], { type: 'image/gif' });
				const url = URL.createObjectURL(blob);

				files = files.map((f) =>
					f.id === gifFile.id
						? {
								...f,
								status: 'completed' as const,
								progress: 100,
								compressedUrl: url,
								compressedBlob: blob,
								compressedSize: blob.size,
								processingTime,
							}
						: f
				);
			} catch (error) {
				console.error('Optimization error:', error);
				files = files.map((f) =>
					f.id === gifFile.id
						? {
								...f,
								status: 'error' as const,
								error: error instanceof Error ? error.message : 'Optimization failed',
							}
						: f
				);
			}
		}

		isProcessing = false;

		const completedFiles = files.filter((f) => f.status === 'completed');
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
		// Reset all completed files to pending
		files = files.map((f) => {
			if (f.status === 'completed') {
				// Clean up old compressed URL
				if (f.compressedUrl) URL.revokeObjectURL(f.compressedUrl);
				return {
					...f,
					status: 'pending' as const,
					progress: 0,
					compressedUrl: undefined,
					compressedBlob: undefined,
					compressedSize: undefined,
				};
			}
			return f;
		});

		// Process all files
		await handleOptimize();
	}

	function downloadFile(gifFile: GifFile) {
		if (!gifFile.compressedBlob) return;
		downloadBlob(gifFile.compressedBlob, gifFile.file.name.replace('.gif', '-optimized.gif'));
	}

	async function copyFile(gifFile: GifFile) {
		if (!gifFile.compressedBlob) return;
		const success = await copyBlobToClipboard(gifFile.compressedBlob);
		if (success) {
			copiedFileId = gifFile.id;
			toast.success('Copied to clipboard!');
			setTimeout(() => {
				copiedFileId = null;
			}, 2000);
		} else {
			toast.error('Copy not supported in this browser');
		}
	}

	async function downloadAll() {
		const completed = files.filter((f) => f.status === 'completed' && f.compressedBlob);
		if (completed.length === 0) return;

		if (completed.length === 1) {
			// Single file - download directly
			downloadFile(completed[0]);
		} else {
			// Multiple files - download as ZIP
			const items = completed.map((f) => ({
				name: f.file.name.replace('.gif', '-optimized.gif'),
				blob: f.compressedBlob!,
			}));
			await downloadAllAsZip(items, 'optimized-gifs.zip');
			toast.success(`Downloaded ${completed.length} GIFs as ZIP`);
		}
	}

	function openComparison(gifFile: GifFile) {
		comparisonFile = gifFile;
		showComparison = true;
	}

	// Calculate totals
	const totalOriginal = $derived(files.reduce((sum, f) => sum + f.file.size, 0));
	const totalCompressed = $derived(
		files.filter((f) => f.compressedSize).reduce((sum, f) => sum + (f.compressedSize || 0), 0)
	);
	const totalSavings = $derived(
		totalOriginal > 0 && totalCompressed > 0
			? Math.round((1 - totalCompressed / totalOriginal) * 100)
			: 0
	);
	const completedCount = $derived(files.filter((f) => f.status === 'completed').length);
</script>

<svelte:head>
	<title>Optimize GIF - Swirl</title>
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
					<Gauge class="h-4 w-4" />
					Optimize GIF
				</div>
				<h1 class="text-surface-100 text-3xl font-bold">
					Compress GIFs for <span class="gradient-text">any platform</span>
				</h1>
				<p class="text-surface-500 mt-2">Smart presets for Discord, Twitter, Slack, and more</p>
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
									class="glass flex items-center justify-between rounded-xl p-3"
									in:slide={{ duration: 200 }}
								>
									<div class="flex min-w-0 flex-1 items-center gap-3">
										<div class="bg-surface-800 h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
											<img
												src={gifFile.compressedUrl || gifFile.originalUrl}
												alt=""
												class="h-full w-full object-cover"
											/>
										</div>
										<div class="min-w-0 flex-1">
											<p class="text-surface-200 truncate text-sm font-medium">
												{gifFile.file.name}
											</p>

											<!-- Metadata display -->
											{#if gifFile.metadata}
												<div class="text-surface-500 mt-0.5 flex items-center gap-3 text-xs">
													<span class="flex items-center gap-1">
														<Clock class="h-3 w-3" />
														{formatDuration(gifFile.metadata.duration)}
													</span>
													<span class="flex items-center gap-1">
														<Film class="h-3 w-3" />
														{gifFile.metadata.frameCount} frames
													</span>
													<span>{gifFile.metadata.fps} FPS</span>
													<span class="flex items-center gap-1">
														<Maximize2 class="h-3 w-3" />
														{gifFile.metadata.width}×{gifFile.metadata.height}
													</span>
												</div>
											{/if}

											<div class="mt-0.5 flex items-center gap-2 text-xs">
												<span class="text-surface-500">{formatBytes(gifFile.file.size)}</span>
												{#if gifFile.compressedSize}
													<span class="text-surface-600">→</span>
													<span class="text-green-400">{formatBytes(gifFile.compressedSize)}</span>
													<span class="font-medium text-green-400">
														(-{Math.round((1 - gifFile.compressedSize / gifFile.file.size) * 100)}%)
													</span>
													{#if gifFile.processingTime}
														<span class="text-surface-500"
															>• {formatTime(gifFile.processingTime)}</span
														>
													{/if}
												{/if}
											</div>

											{#if gifFile.status === 'processing'}
												<div class="bg-surface-700 mt-1 h-1 overflow-hidden rounded-full">
													<div
														class="from-accent-start to-accent-end h-full bg-gradient-to-r transition-all"
														style="width: {gifFile.progress}%"
													></div>
												</div>
											{/if}
										</div>
									</div>

									<div class="ml-2 flex items-center gap-1">
										{#if gifFile.status === 'processing'}
											<Loader2 class="text-accent-start h-5 w-5 animate-spin" />
										{:else if gifFile.status === 'completed'}
											<button
												onclick={() => openComparison(gifFile)}
												class="text-surface-400 hover:text-surface-200 p-2 transition-colors"
												title="Compare"
											>
												<Eye class="h-4 w-4" />
											</button>
											{#if isClipboardWriteSupported()}
												<button
													onclick={() => copyFile(gifFile)}
													class="text-surface-400 hover:text-surface-200 p-2 transition-colors"
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
												class="p-2 text-green-400 transition-colors hover:text-green-300"
												title="Download"
											>
												<Download class="h-4 w-4" />
											</button>
										{:else if gifFile.status === 'error'}
											<AlertCircle class="h-5 w-5 text-red-400" />
										{/if}
										<button
											onclick={() => removeFile(gifFile.id)}
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
												{completedCount} GIF{completedCount !== 1 ? 's' : ''} optimized
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
						Optimization Settings
					</h3>

					<!-- Platform Presets -->
					<div class="mb-6">
						<label class="text-surface-300 mb-3 block text-sm font-medium">Target Platform</label>
						<div class="grid grid-cols-2 gap-2">
							{#each sizePresets as preset}
								<button
									onclick={() => selectPreset(preset.id)}
									class="flex items-center gap-2 rounded-xl px-4 py-3 text-left transition-all {selectedPreset ===
									preset.id
										? 'from-accent-start/20 to-accent-end/20 border-accent-start/50 text-surface-100 border bg-gradient-to-r'
										: 'bg-surface-800 text-surface-400 hover:bg-surface-700'}"
								>
									<span class="text-lg">{preset.icon}</span>
									<div>
										<p class="text-sm font-medium">{preset.label}</p>
										<p class="text-surface-500 text-xs">{preset.size} MB max</p>
									</div>
								</button>
							{/each}
						</div>
					</div>

					<!-- Custom Target Size -->
					<div class="mb-6">
						<label class="text-surface-300 mb-2 block text-sm font-medium">
							Target Size: <span class="text-accent-start">{targetSizeMB} MB</span>
						</label>
						<input
							type="range"
							bind:value={targetSizeMB}
							min="0.5"
							max="25"
							step="0.5"
							class="accent-accent-start w-full"
							oninput={() => (selectedPreset = null)}
						/>
						<div class="text-surface-500 mt-1 flex justify-between text-xs">
							<span>0.5 MB</span>
							<span>25 MB</span>
						</div>
					</div>

					<!-- Advanced Settings Accordion -->
					<div class="mb-6">
						<button
							onclick={() => (showAdvanced = !showAdvanced)}
							class="bg-surface-800 text-surface-300 hover:bg-surface-700 flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors"
						>
							<span>Advanced Settings</span>
							<ChevronDown
								class="h-4 w-4 transition-transform {showAdvanced ? 'rotate-180' : ''}"
							/>
						</button>

						{#if showAdvanced}
							<div
								class="bg-surface-800/50 mt-3 space-y-4 rounded-xl p-4"
								transition:slide={{ duration: 200 }}
							>
								<!-- Color Reduction -->
								<div>
									<label class="text-surface-300 mb-2 block text-sm font-medium">
										Colors: <span class="text-accent-start">{colorReduction}</span>
									</label>
									<input
										type="range"
										bind:value={colorReduction}
										min="16"
										max="256"
										step="16"
										class="accent-accent-start w-full"
									/>
									<div class="text-surface-500 mt-1 flex justify-between text-xs">
										<span>16 (smaller)</span>
										<span>256 (better quality)</span>
									</div>
								</div>

								<!-- Lossy Level -->
								<div>
									<label class="text-surface-300 mb-2 block text-sm font-medium">
										Lossy Compression: <span class="text-accent-start">{lossy}</span>
									</label>
									<input
										type="range"
										bind:value={lossy}
										min="0"
										max="200"
										step="10"
										class="accent-accent-start w-full"
									/>
									<div class="text-surface-500 mt-1 flex justify-between text-xs">
										<span>0 (lossless)</span>
										<span>200 (aggressive)</span>
									</div>
								</div>
							</div>
						{/if}
					</div>

					<!-- Optimize Button -->
					<div class="flex gap-2">
						<button
							onclick={handleOptimize}
							disabled={files.length === 0 || isProcessing}
							class="from-accent-start to-accent-end shadow-accent-start/30 hover:shadow-accent-start/40 flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#if isProcessing}
								<Loader2 class="h-5 w-5 animate-spin" />
								Optimizing...
							{:else}
								<Gauge class="h-5 w-5" />
								Optimize {files.length} GIF{files.length !== 1 ? 's' : ''}
							{/if}
						</button>

						{#if completedCount > 0}
							<button
								onclick={reprocessAll}
								disabled={isProcessing}
								class="bg-surface-700 text-surface-200 hover:bg-surface-600 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
								title="Re-optimize all with current settings"
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
		onclose={() => (showComparison = false)}
	/>
{/if}

<!-- Batch Summary Modal -->
{#if showBatchSummary && completedCount > 1}
	<BatchSummary
		totalFiles={completedCount}
		totalOriginalSize={totalOriginal}
		totalCompressedSize={totalCompressed}
		ondownloadAll={downloadAll}
		onclose={() => (showBatchSummary = false)}
	/>
{/if}
