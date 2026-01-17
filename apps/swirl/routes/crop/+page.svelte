<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import CompareSlider from '$lib/components/CompareSlider.svelte';
	import { toast } from '$lib/components/Toast.svelte';
	import { Crop, Settings, Download, Trash2, Eye, Loader2, RotateCcw, Clock, Film, Copy, Check, RefreshCw } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import { cropGif } from '$lib/utils/gifsicle';
	import { parseGifFile, formatDuration, formatBytes, type GifMetadata } from '$lib/utils/gif-parser';
	import { downloadBlob, copyBlobToClipboard, isClipboardWriteSupported } from '$lib/utils/download';

	// GIF state
	let gifFile = $state<File | null>(null);
	let gifUrl = $state<string | null>(null);
	let gifWidth = $state(0);
	let gifHeight = $state(0);
	let metadata = $state<GifMetadata | null>(null);

	// Processing state
	let isProcessing = $state(false);
	let progress = $state(0);
	let resultUrl = $state<string | null>(null);
	let resultBlob = $state<Blob | null>(null);
	let resultSize = $state(0);
	let processingTime = $state(0);
	let justCopied = $state(false);

	// Crop state
	let cropX = $state(0);
	let cropY = $state(0);
	let cropWidth = $state(100);
	let cropHeight = $state(100);

	// Aspect ratio presets
	const aspectPresets = [
		{ id: 'free', label: 'Free', ratio: 0 },
		{ id: '1:1', label: '1:1 Square', ratio: 1 },
		{ id: '16:9', label: '16:9', ratio: 16 / 9 },
		{ id: '4:3', label: '4:3', ratio: 4 / 3 },
		{ id: '9:16', label: '9:16', ratio: 9 / 16 },
		{ id: '3:4', label: '3:4', ratio: 3 / 4 }
	];
	let selectedAspect = $state<string>('free');
	let aspectRatio = $state<number>(0);

	// Comparison modal
	let showComparison = $state(false);

	// Crop container reference for coordinate calculations
	let containerRef: HTMLDivElement;
	let imageRef: HTMLImageElement;
	let isDragging = $state(false);
	let dragType = $state<'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | 'resize-n' | 'resize-s' | 'resize-e' | 'resize-w' | null>(null);
	let dragStartX = 0;
	let dragStartY = 0;
	let initialCrop = { x: 0, y: 0, width: 0, height: 0 };

	async function handleFiles(files: File[]) {
		const gifs = files.filter(f => f.type === 'image/gif' || f.name.endsWith('.gif'));
		if (gifs.length === 0) {
			toast.error('Please select a GIF file');
			return;
		}

		// Clean up previous
		if (gifUrl) URL.revokeObjectURL(gifUrl);
		if (resultUrl) URL.revokeObjectURL(resultUrl);
		resultUrl = null;

		gifFile = gifs[0];
		gifUrl = URL.createObjectURL(gifFile);

		// Parse metadata
		try {
			metadata = await parseGifFile(gifFile);
			gifWidth = metadata.width;
			gifHeight = metadata.height;
		} catch (e) {
			console.warn('Failed to parse GIF metadata:', e);
		}

		// Initialize crop to full image
		cropX = 0;
		cropY = 0;
		cropWidth = gifWidth || 100;
		cropHeight = gifHeight || 100;

		toast.success(`Loaded: ${gifFile.name}`);
	}

	function handleImageLoad() {
		if (imageRef) {
			gifWidth = imageRef.naturalWidth;
			gifHeight = imageRef.naturalHeight;
			cropWidth = gifWidth;
			cropHeight = gifHeight;
		}
	}

	function selectAspectPreset(presetId: string) {
		selectedAspect = presetId;
		const preset = aspectPresets.find(p => p.id === presetId);
		aspectRatio = preset?.ratio || 0;

		if (aspectRatio > 0) {
			// Adjust crop to match aspect ratio
			const currentAspect = cropWidth / cropHeight;
			if (currentAspect > aspectRatio) {
				// Too wide, reduce width
				cropWidth = Math.round(cropHeight * aspectRatio);
			} else {
				// Too tall, reduce height
				cropHeight = Math.round(cropWidth / aspectRatio);
			}
			// Ensure crop stays within bounds
			if (cropX + cropWidth > gifWidth) cropX = gifWidth - cropWidth;
			if (cropY + cropHeight > gifHeight) cropY = gifHeight - cropHeight;
		}
	}

	function getScaleFactor(): number {
		if (!containerRef || !gifWidth) return 1;
		const containerWidth = containerRef.clientWidth;
		return containerWidth / gifWidth;
	}

	function startDrag(e: MouseEvent | TouchEvent, type: typeof dragType) {
		if (!gifUrl) return;
		
		isDragging = true;
		dragType = type;
		
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
		
		dragStartX = clientX;
		dragStartY = clientY;
		initialCrop = { x: cropX, y: cropY, width: cropWidth, height: cropHeight };
		
		e.preventDefault();
	}

	function handleDrag(e: MouseEvent | TouchEvent) {
		if (!isDragging || !dragType) return;
		
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
		
		const scale = getScaleFactor();
		const deltaX = (clientX - dragStartX) / scale;
		const deltaY = (clientY - dragStartY) / scale;

		if (dragType === 'move') {
			cropX = Math.max(0, Math.min(gifWidth - cropWidth, Math.round(initialCrop.x + deltaX)));
			cropY = Math.max(0, Math.min(gifHeight - cropHeight, Math.round(initialCrop.y + deltaY)));
		} else {
			// Handle resize
			let newX = initialCrop.x;
			let newY = initialCrop.y;
			let newWidth = initialCrop.width;
			let newHeight = initialCrop.height;

			if (dragType.includes('w')) {
				newWidth = Math.max(16, initialCrop.width - deltaX);
				newX = initialCrop.x + initialCrop.width - newWidth;
				if (newX < 0) {
					newWidth += newX;
					newX = 0;
				}
			}
			if (dragType.includes('e')) {
				newWidth = Math.max(16, Math.min(gifWidth - initialCrop.x, initialCrop.width + deltaX));
			}
			if (dragType.includes('n')) {
				newHeight = Math.max(16, initialCrop.height - deltaY);
				newY = initialCrop.y + initialCrop.height - newHeight;
				if (newY < 0) {
					newHeight += newY;
					newY = 0;
				}
			}
			if (dragType.includes('s')) {
				newHeight = Math.max(16, Math.min(gifHeight - initialCrop.y, initialCrop.height + deltaY));
			}

			// Apply aspect ratio constraint if set
			if (aspectRatio > 0) {
				if (dragType.includes('e') || dragType.includes('w')) {
					newHeight = Math.round(newWidth / aspectRatio);
					if (newY + newHeight > gifHeight) {
						newHeight = gifHeight - newY;
						newWidth = Math.round(newHeight * aspectRatio);
					}
				} else {
					newWidth = Math.round(newHeight * aspectRatio);
					if (newX + newWidth > gifWidth) {
						newWidth = gifWidth - newX;
						newHeight = Math.round(newWidth / aspectRatio);
					}
				}
			}

			cropX = Math.round(newX);
			cropY = Math.round(newY);
			cropWidth = Math.round(newWidth);
			cropHeight = Math.round(newHeight);
		}
	}

	function endDrag() {
		isDragging = false;
		dragType = null;
	}

	async function handleCrop() {
		if (!gifFile || !gifUrl) return;

		isProcessing = true;
		progress = 0;
		const startTime = performance.now();

		// Clean up previous result
		if (resultUrl) {
			URL.revokeObjectURL(resultUrl);
			resultUrl = null;
		}

		try {
			const buffer = await gifFile.arrayBuffer();

			const { result, stats } = await cropGif(
				buffer,
				{
					cropX1: cropX,
					cropY1: cropY,
					cropX2: cropX + cropWidth,
					cropY2: cropY + cropHeight
				},
				(p) => {
					progress = p;
				}
			);

			processingTime = Math.round(performance.now() - startTime);
			resultBlob = new Blob([result], { type: 'image/gif' });
			resultUrl = URL.createObjectURL(resultBlob);
			resultSize = resultBlob.size;

			progress = 100;
			toast.success(`Cropped in ${(processingTime / 1000).toFixed(1)}s!`);
			
			// Auto-open comparison
			showComparison = true;
		} catch (error) {
			console.error('Crop error:', error);
			toast.error('Crop failed. Please try again.');
		} finally {
			isProcessing = false;
		}
	}

	function downloadResult() {
		if (!resultBlob || !gifFile) return;
		downloadBlob(resultBlob, gifFile.name.replace('.gif', '-cropped.gif'));
	}

	async function copyResult() {
		if (!resultBlob) return;
		const success = await copyBlobToClipboard(resultBlob);
		if (success) {
			justCopied = true;
			toast.success('Copied to clipboard!');
			setTimeout(() => { justCopied = false; }, 2000);
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
	}

	function clearGif() {
		if (gifUrl) URL.revokeObjectURL(gifUrl);
		if (resultUrl) URL.revokeObjectURL(resultUrl);
		gifFile = null;
		gifUrl = null;
		resultUrl = null;
		metadata = null;
	}

	function resetCrop() {
		cropX = 0;
		cropY = 0;
		cropWidth = gifWidth || 100;
		cropHeight = gifHeight || 100;
		selectedAspect = 'free';
		aspectRatio = 0;
	}
</script>

<svelte:window
	onmousemove={handleDrag}
	onmouseup={endDrag}
	ontouchmove={handleDrag}
	ontouchend={endDrag}
/>

<svelte:head>
	<title>Crop GIF - Swirl</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />

	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div class="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 blur-3xl"></div>
		<div class="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-orange-500/10 to-amber-500/10 blur-3xl"></div>
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-12">
		<div class="mx-auto max-w-5xl">
			<!-- Header -->
			<div class="text-center mb-8" in:fade={{ duration: 200 }}>
				<div class="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-400 mb-4">
					<Crop class="h-4 w-4" />
					Crop GIF
				</div>
				<h1 class="text-3xl font-bold text-surface-100">
					Crop GIFs to <span class="gradient-text">any size</span>
				</h1>
				<p class="mt-2 text-surface-500">
					Perfect for Discord emojis, memes, removing borders
				</p>
			</div>

			{#if !gifFile}
				<!-- Drop Zone -->
				<div in:fade={{ duration: 200 }}>
					<DropZone
						accept=".gif,image/gif"
						acceptLabel="GIF files only"
						onfiles={handleFiles}
					/>
				</div>
			{:else}
				<div class="grid gap-6 lg:grid-cols-2" in:fly={{ y: 20, duration: 300 }}>
					<!-- Left: Crop Preview -->
					<div class="glass rounded-2xl p-4">
						<div
							bind:this={containerRef}
							class="relative bg-surface-900 rounded-xl overflow-hidden select-none"
							style="max-height: 500px;"
						>
							<!-- GIF Image -->
							<img
								bind:this={imageRef}
								src={gifUrl}
								alt="GIF to crop"
								class="w-full h-auto"
								onload={handleImageLoad}
								draggable="false"
							/>

							<!-- Darkened overlay outside crop area -->
							<div
								class="absolute inset-0 pointer-events-none"
								style="
									background: linear-gradient(to right, 
										rgba(0,0,0,0.6) {cropX / gifWidth * 100}%, 
										transparent {cropX / gifWidth * 100}%, 
										transparent {(cropX + cropWidth) / gifWidth * 100}%, 
										rgba(0,0,0,0.6) {(cropX + cropWidth) / gifWidth * 100}%
									);
								"
							></div>
							<div
								class="absolute pointer-events-none"
								style="
									left: {cropX / gifWidth * 100}%;
									width: {cropWidth / gifWidth * 100}%;
									top: 0;
									height: {cropY / gifHeight * 100}%;
									background: rgba(0,0,0,0.6);
								"
							></div>
							<div
								class="absolute pointer-events-none"
								style="
									left: {cropX / gifWidth * 100}%;
									width: {cropWidth / gifWidth * 100}%;
									top: {(cropY + cropHeight) / gifHeight * 100}%;
									bottom: 0;
									background: rgba(0,0,0,0.6);
								"
							></div>

							<!-- Crop Selection Box -->
							<div
								class="absolute border-2 border-amber-400 {isDragging ? 'cursor-grabbing' : 'cursor-grab'}"
								style="
									left: {cropX / gifWidth * 100}%;
									top: {cropY / gifHeight * 100}%;
									width: {cropWidth / gifWidth * 100}%;
									height: {cropHeight / gifHeight * 100}%;
								"
								onmousedown={(e) => startDrag(e, 'move')}
								ontouchstart={(e) => startDrag(e, 'move')}
								role="slider"
								aria-label="Crop area"
								aria-valuemin={0}
								aria-valuemax={100}
								aria-valuenow={Math.round(cropWidth / gifWidth * 100)}
								tabindex="0"
							>
								<!-- Grid overlay -->
								<div class="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
									{#each Array(9) as _, i}
										<div class="border border-white/30"></div>
									{/each}
								</div>

								<!-- Corner handles - larger on mobile for touch -->
								<div
									class="absolute -top-2.5 -left-2.5 w-5 h-5 sm:w-3 sm:h-3 sm:-top-1.5 sm:-left-1.5 bg-amber-400 rounded-sm cursor-nw-resize touch-none"
									onmousedown={(e) => { e.stopPropagation(); startDrag(e, 'resize-nw'); }}
									ontouchstart={(e) => { e.stopPropagation(); startDrag(e, 'resize-nw'); }}
									role="slider"
									aria-label="Resize top-left corner"
									tabindex="0"
								></div>
								<div
									class="absolute -top-2.5 -right-2.5 w-5 h-5 sm:w-3 sm:h-3 sm:-top-1.5 sm:-right-1.5 bg-amber-400 rounded-sm cursor-ne-resize touch-none"
									onmousedown={(e) => { e.stopPropagation(); startDrag(e, 'resize-ne'); }}
									ontouchstart={(e) => { e.stopPropagation(); startDrag(e, 'resize-ne'); }}
									role="slider"
									aria-label="Resize top-right corner"
									tabindex="0"
								></div>
								<div
									class="absolute -bottom-2.5 -left-2.5 w-5 h-5 sm:w-3 sm:h-3 sm:-bottom-1.5 sm:-left-1.5 bg-amber-400 rounded-sm cursor-sw-resize touch-none"
									onmousedown={(e) => { e.stopPropagation(); startDrag(e, 'resize-sw'); }}
									ontouchstart={(e) => { e.stopPropagation(); startDrag(e, 'resize-sw'); }}
									role="slider"
									aria-label="Resize bottom-left corner"
									tabindex="0"
								></div>
								<div
									class="absolute -bottom-2.5 -right-2.5 w-5 h-5 sm:w-3 sm:h-3 sm:-bottom-1.5 sm:-right-1.5 bg-amber-400 rounded-sm cursor-se-resize touch-none"
									onmousedown={(e) => { e.stopPropagation(); startDrag(e, 'resize-se'); }}
									ontouchstart={(e) => { e.stopPropagation(); startDrag(e, 'resize-se'); }}
									role="slider"
									aria-label="Resize bottom-right corner"
									tabindex="0"
								></div>

								<!-- Edge handles - larger on mobile for touch -->
								<div
									class="absolute -top-2.5 sm:-top-1.5 left-1/2 -translate-x-1/2 w-8 h-5 sm:w-6 sm:h-3 bg-amber-400 rounded-sm cursor-n-resize touch-none"
									onmousedown={(e) => { e.stopPropagation(); startDrag(e, 'resize-n'); }}
									ontouchstart={(e) => { e.stopPropagation(); startDrag(e, 'resize-n'); }}
									role="slider"
									aria-label="Resize top edge"
									tabindex="0"
								></div>
								<div
									class="absolute -bottom-2.5 sm:-bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-5 sm:w-6 sm:h-3 bg-amber-400 rounded-sm cursor-s-resize touch-none"
									onmousedown={(e) => { e.stopPropagation(); startDrag(e, 'resize-s'); }}
									ontouchstart={(e) => { e.stopPropagation(); startDrag(e, 'resize-s'); }}
									role="slider"
									aria-label="Resize bottom edge"
									tabindex="0"
								></div>
								<div
									class="absolute -left-2.5 sm:-left-1.5 top-1/2 -translate-y-1/2 w-5 h-8 sm:w-3 sm:h-6 bg-amber-400 rounded-sm cursor-w-resize touch-none"
									onmousedown={(e) => { e.stopPropagation(); startDrag(e, 'resize-w'); }}
									ontouchstart={(e) => { e.stopPropagation(); startDrag(e, 'resize-w'); }}
									role="slider"
									aria-label="Resize left edge"
									tabindex="0"
								></div>
								<div
									class="absolute -right-2.5 sm:-right-1.5 top-1/2 -translate-y-1/2 w-5 h-8 sm:w-3 sm:h-6 bg-amber-400 rounded-sm cursor-e-resize touch-none"
									onmousedown={(e) => { e.stopPropagation(); startDrag(e, 'resize-e'); }}
									ontouchstart={(e) => { e.stopPropagation(); startDrag(e, 'resize-e'); }}
									role="slider"
									aria-label="Resize right edge"
									tabindex="0"
								></div>
							</div>
						</div>

						<!-- File info -->
						<div class="mt-4 flex items-center justify-between">
							<div class="text-sm">
								<p class="text-surface-300 font-medium truncate max-w-[200px]">{gifFile.name}</p>
								{#if metadata}
									<div class="flex items-center gap-3 text-xs text-surface-500 mt-0.5">
										<span>{metadata.width}×{metadata.height}</span>
										<span class="flex items-center gap-1">
											<Clock class="h-3 w-3" />
											{formatDuration(metadata.duration)}
										</span>
										<span class="flex items-center gap-1">
											<Film class="h-3 w-3" />
											{metadata.frameCount} frames
										</span>
									</div>
								{/if}
							</div>
							<button
								onclick={clearGif}
								class="flex items-center gap-1.5 text-sm text-surface-400 hover:text-red-400 transition-colors"
							>
								<Trash2 class="h-4 w-4" />
								Clear
							</button>
						</div>
					</div>

					<!-- Right: Settings -->
					<div class="glass rounded-2xl p-6 h-fit" in:fly={{ y: 20, delay: 100, duration: 200 }}>
						<h3 class="flex items-center gap-2 text-lg font-semibold text-surface-100 mb-6">
							<Settings class="h-5 w-5 text-amber-400" />
							Crop Settings
						</h3>

						<!-- Aspect Ratio Presets -->
						<div class="mb-6">
							<label class="block text-sm font-medium text-surface-300 mb-3">Aspect Ratio</label>
							<div class="grid grid-cols-3 gap-2">
								{#each aspectPresets as preset}
									<button
										onclick={() => selectAspectPreset(preset.id)}
										class="rounded-lg px-3 py-2 text-sm transition-all {selectedAspect === preset.id
											? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 text-surface-100'
											: 'bg-surface-800 text-surface-400 hover:bg-surface-700'}"
									>
										{preset.label}
									</button>
								{/each}
							</div>
						</div>

						<!-- Crop Dimensions Display -->
						<div class="mb-6 p-4 rounded-xl bg-surface-800/50">
							<label class="block text-sm font-medium text-surface-300 mb-3">Crop Area</label>
							<div class="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span class="text-surface-500">Position:</span>
									<span class="text-amber-400 ml-2">{cropX}, {cropY}</span>
								</div>
								<div>
									<span class="text-surface-500">Size:</span>
									<span class="text-amber-400 ml-2">{cropWidth} × {cropHeight}</span>
								</div>
							</div>
						</div>

						<!-- Reset Button -->
						<button
							onclick={resetCrop}
							class="w-full mb-4 flex items-center justify-center gap-2 rounded-xl bg-surface-700 px-4 py-2.5 text-sm font-medium text-surface-300 hover:bg-surface-600 transition-colors"
						>
							<RotateCcw class="h-4 w-4" />
							Reset Crop
						</button>

						<!-- Crop Button -->
						<button
							onclick={handleCrop}
							disabled={isProcessing || cropWidth < 16 || cropHeight < 16}
							class="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-amber-500/30 transition-all hover:shadow-xl hover:shadow-amber-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if isProcessing}
								<Loader2 class="h-5 w-5 animate-spin" />
								Cropping... ({progress}%)
							{:else}
								<Crop class="h-5 w-5" />
								Crop GIF
							{/if}
						</button>

						<!-- Progress -->
						{#if isProcessing}
							<div class="mt-4 h-2 bg-surface-800 rounded-full overflow-hidden">
								<div
									class="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
									style="width: {progress}%"
								></div>
							</div>
						{/if}

						<!-- Result -->
						{#if resultUrl}
							<div class="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30" in:fly={{ y: 10, duration: 200 }}>
								<div class="flex items-center justify-between mb-3">
									<div>
										<p class="text-green-400 font-medium">Crop complete!</p>
										<p class="text-sm text-surface-500">
											{cropWidth}×{cropHeight} • {formatBytes(resultSize)} • {(processingTime / 1000).toFixed(1)}s
										</p>
									</div>
								</div>

								<!-- Preview -->
								<div class="mb-3 rounded-lg overflow-hidden bg-surface-900 max-h-32 flex items-center justify-center">
									<img src={resultUrl} alt="Cropped result" class="max-w-full max-h-32 object-contain" />
								</div>

								<div class="flex gap-2">
									<button
										onclick={downloadResult}
										class="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-600 transition-colors"
									>
										<Download class="h-4 w-4" />
										Download
									</button>
									{#if isClipboardWriteSupported()}
										<button
											onclick={copyResult}
											class="flex items-center justify-center gap-2 rounded-xl bg-surface-700 px-4 py-2.5 text-sm font-medium text-surface-200 hover:bg-surface-600 transition-colors"
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
										onclick={() => showComparison = true}
										class="flex items-center justify-center gap-2 rounded-xl bg-surface-700 px-4 py-2.5 text-sm font-medium text-surface-200 hover:bg-surface-600 transition-colors"
										title="Compare"
									>
										<Eye class="h-4 w-4" />
									</button>
									<button
										onclick={resetResult}
										class="flex items-center justify-center gap-2 rounded-xl bg-surface-700 px-4 py-2.5 text-sm font-medium text-surface-200 hover:bg-surface-600 transition-colors"
										title="Try again with different settings"
									>
										<RefreshCw class="h-4 w-4" />
									</button>
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</main>

	<Footer />
</div>

<!-- Comparison Modal -->
{#if showComparison && gifUrl && resultUrl}
	<CompareSlider
		originalUrl={gifUrl}
		compressedUrl={resultUrl}
		originalSize={gifFile?.size || 0}
		compressedSize={resultSize}
		onclose={() => showComparison = false}
	/>
{/if}
