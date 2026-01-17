<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import { toast } from '@neutron/ui';
	import {
		Type,
		Settings,
		Download,
		Trash2,
		Loader2,
		Play,
		Eye,
		Copy,
		Check,
		AlignCenter,
		AlignLeft,
		AlignRight,
		Palette,
		RefreshCw,
	} from 'lucide-svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import {
		addTextToGif,
		getPreviewFrame,
		validateOptions,
		type TextPosition,
		DEFAULT_OPTIONS,
	} from '$lib/utils/gif-text';
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
		previewUrl?: string;
		status: 'pending' | 'processing' | 'completed' | 'error';
		progress: number;
		progressStage?: string;
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
	let isGeneratingPreview = $state(false);

	// Text settings
	let text = $state('YOUR TEXT HERE');
	let position = $state<TextPosition>('bottom');
	let fontSize = $state(32);
	let fontFamily = $state('Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif');
	let textColor = $state('#FFFFFF');
	let strokeColor = $state('#000000');
	let strokeWidth = $state(3);

	const fontOptions = [
		{ value: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif', label: 'Impact (Meme)' },
		{ value: '"Arial Black", Gadget, sans-serif', label: 'Arial Black' },
		{ value: '"Comic Sans MS", cursive, sans-serif', label: 'Comic Sans' },
		{ value: 'Georgia, serif', label: 'Georgia' },
		{ value: '"Courier New", monospace', label: 'Courier' },
	];

	const positionOptions: { value: TextPosition; label: string; icon: typeof AlignCenter }[] = [
		{ value: 'top', label: 'Top', icon: AlignLeft },
		{ value: 'center', label: 'Center', icon: AlignCenter },
		{ value: 'bottom', label: 'Bottom', icon: AlignRight },
	];

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

			try {
				gifFile.metadata = await parseGifFile(file);
			} catch (e) {
				console.warn('Failed to parse GIF metadata:', e);
			}

			newGifFiles.push(gifFile);
		}

		files = [...files, ...newGifFiles];
		toast.success(`Added ${gifFiles.length} GIF(s)`);

		// Generate preview for first file
		if (newGifFiles.length > 0) {
			await updatePreview(newGifFiles[0]);
		}
	}

	async function updatePreview(gifFile: GifFile) {
		if (!text.trim()) return;

		isGeneratingPreview = true;
		try {
			const previewUrl = await getPreviewFrame(gifFile.file, {
				text,
				position,
				fontSize,
				fontFamily,
				color: textColor,
				strokeColor,
				strokeWidth,
			});

			files = files.map((f) => (f.id === gifFile.id ? { ...f, previewUrl } : f));
		} catch (e) {
			console.warn('Failed to generate preview:', e);
		}
		isGeneratingPreview = false;
	}

	// Update preview when settings change (debounced)
	let previewTimeout: ReturnType<typeof setTimeout> | null = null;

	function schedulePreviewUpdate() {
		if (previewTimeout) clearTimeout(previewTimeout);
		previewTimeout = setTimeout(() => {
			const firstFile = files[0];
			if (firstFile) {
				updatePreview(firstFile);
			}
		}, 300);
	}

	$effect(() => {
		// Watch for setting changes
		text;
		position;
		fontSize;
		fontFamily;
		textColor;
		strokeColor;
		strokeWidth;
		schedulePreviewUpdate();
	});

	function removeFile(id: string) {
		const file = files.find((f) => f.id === id);
		if (file) {
			URL.revokeObjectURL(file.originalUrl);
			if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
			if (file.compressedUrl) URL.revokeObjectURL(file.compressedUrl);
		}
		files = files.filter((f) => f.id !== id);
	}

	async function handleProcess() {
		const error = validateOptions({ text });
		if (error) {
			toast.error(error);
			return;
		}

		if (files.length === 0) return;

		isProcessing = true;

		const pendingFiles = files.filter((f) => f.status === 'pending' || f.status === 'error');

		for (const gifFile of pendingFiles) {
			const startTime = performance.now();
			files = files.map((f) =>
				f.id === gifFile.id ? { ...f, status: 'processing' as const, progress: 0 } : f
			);

			try {
				const { result, stats } = await addTextToGif(
					gifFile.file,
					{
						text,
						position,
						fontSize,
						fontFamily,
						color: textColor,
						strokeColor,
						strokeWidth,
					},
					(progress, stage) => {
						files = files.map((f) =>
							f.id === gifFile.id ? { ...f, progress, progressStage: stage } : f
						);
					}
				);

				const processingTime = Math.round(performance.now() - startTime);
				const url = URL.createObjectURL(result);

				files = files.map((f) =>
					f.id === gifFile.id
						? {
								...f,
								status: 'completed' as const,
								progress: 100,
								compressedUrl: url,
								compressedBlob: result,
								compressedSize: result.size,
								processingTime,
							}
						: f
				);
			} catch (error) {
				console.error('Text overlay error:', error);
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

		const completedCount = files.filter((f) => f.status === 'completed').length;
		if (completedCount > 0) {
			toast.success(`Added text to ${completedCount} GIF(s)!`);
		}
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

	function downloadFile(gifFile: GifFile) {
		if (!gifFile.compressedBlob) return;
		downloadBlob(gifFile.compressedBlob, gifFile.file.name.replace('.gif', '-text.gif'));
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
			const items = completed.map((f) => ({
				name: f.file.name.replace('.gif', '-text.gif'),
				blob: f.compressedBlob!,
			}));
			await downloadAllAsZip(items, 'text-gifs.zip');
			toast.success(`Downloaded ${completed.length} GIFs as ZIP`);
		}
	}

	const completedCount = $derived(files.filter((f) => f.status === 'completed').length);
	const firstFile = $derived(files[0]);
</script>

<svelte:head>
	<title>Add Text to GIF - Swirl</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />

	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -right-1/4 -top-1/2 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-yellow-500/10 to-amber-500/10 blur-3xl"
		></div>
		<div
			class="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-amber-500/10 to-yellow-500/10 blur-3xl"
		></div>
	</div>

	<main class="flex-1 px-4 pb-12 pt-28 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-5xl">
			<!-- Header -->
			<div class="mb-8 text-center" in:fade={{ duration: 200 }}>
				<div
					class="mb-4 inline-flex items-center gap-2 rounded-full bg-yellow-500/10 px-4 py-1.5 text-sm font-medium text-yellow-400"
				>
					<Type class="h-4 w-4" />
					Add Text
				</div>
				<h1 class="text-surface-100 text-3xl font-bold">
					Add <span class="gradient-text">meme-style text</span> to your GIF
				</h1>
				<p class="text-surface-500 mt-2">
					Create memes, captions, and text overlays with the classic Impact font look
				</p>
			</div>

			<div class="grid gap-6 lg:grid-cols-2">
				<!-- Left: Drop zone, preview, and file list -->
				<div>
					{#if !firstFile}
						<DropZone
							accept=".gif,image/gif"
							acceptLabel="GIF files only"
							onfiles={handleFiles}
							compact={false}
						/>
					{:else}
						<!-- Preview area -->
						<div class="glass mb-4 rounded-2xl p-4" in:fly={{ y: 20, duration: 200 }}>
							<div class="mb-3 flex items-center justify-between">
								<h3 class="text-surface-300 text-sm font-medium">Preview</h3>
								{#if isGeneratingPreview}
									<div class="text-surface-500 flex items-center gap-2 text-xs">
										<Loader2 class="h-3 w-3 animate-spin" />
										Updating preview...
									</div>
								{/if}
							</div>
							<div
								class="bg-surface-900 relative flex aspect-video items-center justify-center overflow-hidden rounded-xl"
							>
								<img
									src={firstFile.previewUrl || firstFile.originalUrl}
									alt="Preview"
									class="max-h-full max-w-full object-contain"
								/>
							</div>
							<p class="text-surface-500 mt-2 text-center text-xs">
								Preview shows first frame. Full animation will have text on all frames.
							</p>
						</div>

						<!-- Add more files -->
						<DropZone
							accept=".gif,image/gif"
							acceptLabel="GIF files only"
							onfiles={handleFiles}
							compact={true}
						/>

						<!-- File list -->
						<div class="mt-4 space-y-2" in:fly={{ y: 20, duration: 200 }}>
							{#each files as gifFile (gifFile.id)}
								<div
									class="glass flex items-center justify-between rounded-xl p-3"
									in:slide={{ duration: 200 }}
								>
									<div class="flex min-w-0 flex-1 items-center gap-3">
										<div class="bg-surface-800 h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg">
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

											<div class="text-surface-500 mt-0.5 flex items-center gap-2 text-xs">
												<span>{formatBytes(gifFile.file.size)}</span>
												{#if gifFile.metadata}
													<span>• {gifFile.metadata.frameCount} frames</span>
												{/if}
												{#if gifFile.compressedSize}
													<span class="text-surface-600">→</span>
													<span class="text-yellow-400">{formatBytes(gifFile.compressedSize)}</span>
												{/if}
												{#if gifFile.processingTime}
													<span>• {formatTime(gifFile.processingTime)}</span>
												{/if}
											</div>

											{#if gifFile.status === 'processing'}
												<div class="mt-1">
													<div class="bg-surface-700 h-1 overflow-hidden rounded-full">
														<div
															class="h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all"
															style="width: {gifFile.progress}%"
														></div>
													</div>
													{#if gifFile.progressStage}
														<p class="text-surface-500 mt-0.5 text-xs">{gifFile.progressStage}</p>
													{/if}
												</div>
											{/if}

											{#if gifFile.status === 'error'}
												<p class="mt-0.5 text-xs text-red-400">{gifFile.error}</p>
											{/if}
										</div>
									</div>

									<div class="ml-2 flex items-center gap-1">
										{#if gifFile.status === 'processing'}
											<Loader2 class="h-5 w-5 animate-spin text-yellow-400" />
										{:else if gifFile.status === 'completed'}
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

				<!-- Right: Text settings -->
				<div class="glass rounded-2xl p-6" in:fly={{ y: 20, delay: 100, duration: 200 }}>
					<h3 class="text-surface-100 mb-6 flex items-center gap-2 text-lg font-semibold">
						<Settings class="h-5 w-5 text-yellow-400" />
						Text Settings
					</h3>

					<!-- Text Input -->
					<div class="mb-6">
						<label for="text-input" class="text-surface-300 mb-2 block text-sm font-medium"
							>Your Text</label
						>
						<textarea
							id="text-input"
							bind:value={text}
							rows="3"
							placeholder="Enter your text here..."
							class="bg-surface-800 border-surface-700 text-surface-100 placeholder:text-surface-600 w-full resize-none rounded-xl border px-4 py-3 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
						></textarea>
						<p class="text-surface-500 mt-1 text-xs">Use Enter for multiple lines</p>
					</div>

					<!-- Position -->
					<div class="mb-6">
						<label class="text-surface-300 mb-3 block text-sm font-medium">Position</label>
						<div class="grid grid-cols-3 gap-2">
							{#each positionOptions as opt}
								<button
									onclick={() => (position = opt.value)}
									class="flex flex-col items-center gap-1 rounded-xl px-4 py-3 transition-all {position ===
									opt.value
										? 'text-surface-100 border border-yellow-500/50 bg-gradient-to-r from-yellow-500/20 to-amber-500/20'
										: 'bg-surface-800 text-surface-400 hover:bg-surface-700'}"
								>
									<span class="text-sm font-medium">{opt.label}</span>
								</button>
							{/each}
						</div>
					</div>

					<!-- Font Size -->
					<div class="mb-6">
						<label class="text-surface-300 mb-2 block text-sm font-medium">
							Font Size: <span class="text-yellow-400">{fontSize}px</span>
						</label>
						<input
							type="range"
							bind:value={fontSize}
							min="16"
							max="100"
							step="2"
							class="w-full accent-yellow-400"
						/>
						<div class="text-surface-500 mt-1 flex justify-between text-xs">
							<span>16px</span>
							<span>100px</span>
						</div>
					</div>

					<!-- Font Family -->
					<div class="mb-6">
						<label for="font-family" class="text-surface-300 mb-2 block text-sm font-medium"
							>Font</label
						>
						<select
							id="font-family"
							bind:value={fontFamily}
							class="bg-surface-800 border-surface-700 text-surface-100 w-full rounded-xl border px-4 py-2.5 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
						>
							{#each fontOptions as opt}
								<option value={opt.value}>{opt.label}</option>
							{/each}
						</select>
					</div>

					<!-- Colors -->
					<div class="mb-6 grid grid-cols-2 gap-4">
						<div>
							<label for="text-color" class="text-surface-300 mb-2 block text-sm font-medium"
								>Text Color</label
							>
							<div class="flex items-center gap-2">
								<input
									type="color"
									id="text-color"
									bind:value={textColor}
									class="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
								/>
								<input
									type="text"
									value={textColor}
									onchange={(e) => (textColor = (e.target as HTMLInputElement).value)}
									class="bg-surface-800 border-surface-700 text-surface-100 flex-1 rounded-lg border px-3 py-2 text-sm uppercase"
								/>
							</div>
						</div>
						<div>
							<label for="stroke-color" class="text-surface-300 mb-2 block text-sm font-medium"
								>Outline Color</label
							>
							<div class="flex items-center gap-2">
								<input
									type="color"
									id="stroke-color"
									bind:value={strokeColor}
									class="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
								/>
								<input
									type="text"
									value={strokeColor}
									onchange={(e) => (strokeColor = (e.target as HTMLInputElement).value)}
									class="bg-surface-800 border-surface-700 text-surface-100 flex-1 rounded-lg border px-3 py-2 text-sm uppercase"
								/>
							</div>
						</div>
					</div>

					<!-- Stroke Width -->
					<div class="mb-6">
						<label class="text-surface-300 mb-2 block text-sm font-medium">
							Outline Width: <span class="text-yellow-400">{strokeWidth}px</span>
						</label>
						<input
							type="range"
							bind:value={strokeWidth}
							min="0"
							max="10"
							step="1"
							class="w-full accent-yellow-400"
						/>
						<div class="text-surface-500 mt-1 flex justify-between text-xs">
							<span>None</span>
							<span>Thick</span>
						</div>
					</div>

					<!-- Process Button -->
					<div class="flex gap-2">
						<button
							onclick={handleProcess}
							disabled={files.length === 0 || isProcessing || !text.trim()}
							class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-yellow-500/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-yellow-500/40 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#if isProcessing}
								<Loader2 class="h-5 w-5 animate-spin" />
								Processing...
							{:else}
								<Play class="h-5 w-5" />
								Add Text to {files.length} GIF{files.length !== 1 ? 's' : ''}
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
