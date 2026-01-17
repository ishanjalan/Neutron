<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import CompareSlider from '$lib/components/CompareSlider.svelte';
	import BatchSummary from '$lib/components/BatchSummary.svelte';
	import { toast } from '@neutron/ui';
	import {
		Settings,
		Download,
		Trash2,
		Loader2,
		Play,
		Rewind,
		ArrowLeftRight,
		Clock,
		Film,
		RefreshCw,
		Eye,
		Copy,
		Check,
	} from 'lucide-svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import { reverseGif } from '$lib/utils/gifsicle';
	import { parseGifFile, formatDuration, type GifMetadata } from '$lib/utils/gif-parser';
	import {
		formatBytes,
		downloadBlob,
		copyBlobToClipboard,
		isClipboardWriteSupported,
	} from '@neutron/utils';
	import { downloadAllAsZip } from '$lib/utils/download';

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

	// Mode: simple reverse or boomerang
	let mode = $state<'reverse' | 'boomerang'>('reverse');

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

	async function handleProcess() {
		if (files.length === 0) return;

		isProcessing = true;

		const pendingFiles = files.filter((f) => f.status === 'pending' || f.status === 'error');

		for (const gifFile of pendingFiles) {
			const startTime = performance.now();
			files = files.map((f) =>
				f.id === gifFile.id ? { ...f, status: 'processing' as const, progress: 0 } : f
			);

			try {
				const buffer = await gifFile.file.arrayBuffer();

				const { result, stats } = await reverseGif(
					buffer,
					{
						reverse: mode === 'reverse',
						boomerang: mode === 'boomerang',
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
				console.error('Reverse error:', error);
				files = files.map((f) =>
					f.id === gifFile.id
						? {
								...f,
								status: 'error' as const,
								error: error instanceof Error ? error.message : 'Processing failed',
							}
						: f
				);
			}
		}

		isProcessing = false;

		const completedFiles = files.filter((f) => f.status === 'completed');
		if (completedFiles.length > 0) {
			if (completedFiles.length === 1 && completedFiles[0].compressedUrl) {
				openComparison(completedFiles[0]);
			} else if (completedFiles.length > 1) {
				showBatchSummary = true;
			}
		}
	}

	function openComparison(gifFile: GifFile) {
		comparisonFile = gifFile;
		showComparison = true;
	}

	async function reprocessAll() {
		files = files.map((f) => {
			if (f.status === 'completed') {
				if (f.compressedUrl) URL.revokeObjectURL(f.compressedUrl);
				return {
					...f,
					status: 'pending' as const,
					progress: 0,
					compressedUrl: undefined,
					compressedBlob: undefined,
				};
			}
			return f;
		});
		await handleProcess();
	}

	function getFileSuffix(): string {
		return mode === 'boomerang' ? '-boomerang' : '-reversed';
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
			downloadFile(completed[0]);
		} else {
			const suffix = getFileSuffix();
			const items = completed.map((f) => ({
				name: f.file.name.replace('.gif', `${suffix}.gif`),
				blob: f.compressedBlob!,
			}));
			await downloadAllAsZip(items, 'reversed-gifs.zip');
			toast.success(`Downloaded ${completed.length} GIFs as ZIP`);
		}
	}

	const completedCount = $derived(files.filter((f) => f.status === 'completed').length);
	const totalOriginal = $derived(files.reduce((sum, f) => sum + f.file.size, 0));
	const totalCompressed = $derived(
		files.filter((f) => f.compressedSize).reduce((sum, f) => sum + (f.compressedSize || 0), 0)
	);

	const actionDescription = $derived(() => {
		if (mode === 'boomerang') return 'Create a boomerang effect (forward + reverse loop)';
		return 'Reverse the animation direction';
	});
</script>

<svelte:head>
	<title>Reverse GIF - Swirl</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />

	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -right-1/4 -top-1/2 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-rose-500/10 to-pink-500/10 blur-3xl"
		></div>
		<div
			class="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-pink-500/10 to-rose-500/10 blur-3xl"
		></div>
	</div>

	<main class="flex-1 px-4 pb-12 pt-28 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-5xl">
			<!-- Header -->
			<div class="mb-8 text-center" in:fade={{ duration: 200 }}>
				<div
					class="mb-4 inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-4 py-1.5 text-sm font-medium text-rose-400"
				>
					<Rewind class="h-4 w-4" />
					Reverse GIF
				</div>
				<h1 class="text-surface-100 text-3xl font-bold">
					Play your GIF <span class="gradient-text">backwards</span>
				</h1>
				<p class="text-surface-500 mt-2">
					Reverse animations or create Instagram-style boomerang loops
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

											{#if gifFile.metadata}
												<div class="text-surface-500 mt-0.5 flex items-center gap-3 text-xs">
													<span class="flex items-center gap-1">
														<Clock class="h-3 w-3" />
														{formatDuration(gifFile.metadata.duration)}
														{#if mode === 'boomerang'}
															<span class="text-rose-400"
																>→ {formatDuration(gifFile.metadata.duration * 2)}</span
															>
														{/if}
													</span>
													<span class="flex items-center gap-1">
														<Film class="h-3 w-3" />
														{gifFile.metadata.frameCount} frames
														{#if mode === 'boomerang'}
															<span class="text-rose-400">→ {gifFile.metadata.frameCount * 2}</span>
														{/if}
													</span>
												</div>
											{/if}

											<div class="text-surface-500 mt-0.5 flex items-center gap-2 text-xs">
												<span>{formatBytes(gifFile.file.size)}</span>
												{#if gifFile.compressedSize}
													<span class="text-surface-600">→</span>
													<span class="text-rose-400">{formatBytes(gifFile.compressedSize)}</span>
												{/if}
												{#if gifFile.processingTime}
													<span>• {formatTime(gifFile.processingTime)}</span>
												{/if}
											</div>

											{#if gifFile.status === 'processing'}
												<div class="bg-surface-700 mt-1 h-1 overflow-hidden rounded-full">
													<div
														class="h-full bg-gradient-to-r from-rose-400 to-pink-500 transition-all"
														style="width: {gifFile.progress}%"
													></div>
												</div>
											{/if}
										</div>
									</div>

									<div class="ml-2 flex items-center gap-1">
										{#if gifFile.status === 'processing'}
											<Loader2 class="h-5 w-5 animate-spin text-rose-400" />
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

							{#if completedCount > 0}
								<button
									onclick={downloadAll}
									class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-green-500/30 bg-green-500/20 px-4 py-3 text-sm font-medium text-green-400 transition-colors hover:bg-green-500/30"
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
					<h3 class="text-surface-100 mb-6 flex items-center gap-2 text-lg font-semibold">
						<Settings class="h-5 w-5 text-rose-400" />
						Reverse Mode
					</h3>

					<!-- Mode Selection -->
					<div class="mb-6 space-y-3">
						<label class="text-surface-300 mb-3 block text-sm font-medium">Choose Effect</label>

						<button
							onclick={() => (mode = 'reverse')}
							class="flex w-full items-center gap-3 rounded-xl p-4 transition-all {mode ===
							'reverse'
								? 'border border-rose-500/50 bg-gradient-to-r from-rose-500/20 to-pink-500/20'
								: 'bg-surface-800 hover:bg-surface-700'}"
						>
							<div
								class="flex h-10 w-10 items-center justify-center rounded-lg {mode === 'reverse'
									? 'bg-rose-500/30'
									: 'bg-surface-700'}"
							>
								<Rewind class="h-5 w-5 text-rose-400" />
							</div>
							<div class="text-left">
								<p class="text-surface-200 text-sm font-medium">Reverse</p>
								<p class="text-surface-500 text-xs">Play animation backwards</p>
							</div>
						</button>

						<button
							onclick={() => (mode = 'boomerang')}
							class="flex w-full items-center gap-3 rounded-xl p-4 transition-all {mode ===
							'boomerang'
								? 'border border-rose-500/50 bg-gradient-to-r from-rose-500/20 to-pink-500/20'
								: 'bg-surface-800 hover:bg-surface-700'}"
						>
							<div
								class="flex h-10 w-10 items-center justify-center rounded-lg {mode === 'boomerang'
									? 'bg-rose-500/30'
									: 'bg-surface-700'}"
							>
								<ArrowLeftRight class="h-5 w-5 text-rose-400" />
							</div>
							<div class="text-left">
								<p class="text-surface-200 text-sm font-medium">Boomerang</p>
								<p class="text-surface-500 text-xs">Play forward then reverse (like Instagram)</p>
							</div>
						</button>
					</div>

					<!-- Action description -->
					<div class="bg-surface-800/50 border-surface-700 mb-6 rounded-xl border p-3">
						<p class="text-surface-300 text-sm">
							<span class="font-medium text-rose-400">Result:</span>
							{actionDescription()}
						</p>
					</div>

					<!-- Process Button -->
					<div class="flex gap-2">
						<button
							onclick={handleProcess}
							disabled={files.length === 0 || isProcessing}
							class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-rose-500/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-rose-500/40 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#if isProcessing}
								<Loader2 class="h-5 w-5 animate-spin" />
								Processing...
							{:else}
								<Play class="h-5 w-5" />
								{mode === 'boomerang' ? 'Create Boomerang' : 'Reverse'}
								{files.length} GIF{files.length !== 1 ? 's' : ''}
							{/if}
						</button>

						{#if completedCount > 0}
							<button
								onclick={reprocessAll}
								disabled={isProcessing}
								class="bg-surface-700 text-surface-200 hover:bg-surface-600 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
