<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import CompareSlider from '$lib/components/CompareSlider.svelte';
	import { toast } from '@neutron/ui';
	import {
		Images,
		Settings,
		Download,
		Play,
		Pause,
		Trash2,
		GripVertical,
		Plus,
		Loader2,
		Copy,
		Check,
		Eye,
		RefreshCw,
	} from 'lucide-svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import encode from 'gifski-wasm';
	import { formatBytes, copyBlobToClipboard, isClipboardWriteSupported } from '@neutron/utils';
	import { optimizeGif } from '$lib/utils/gifsicle';

	interface Frame {
		id: string;
		file: File;
		url: string;
		delay: number; // ms
		width: number;
		height: number;
	}

	// State
	let frames = $state<Frame[]>([]);
	let isProcessing = $state(false);
	let progress = $state(0);
	let progressStage = $state('');
	let resultUrl = $state<string | null>(null);
	let resultBlob = $state<Blob | null>(null);
	let resultSize = $state(0);
	let justCopied = $state(false);

	// Settings
	let globalDelay = $state(100); // ms
	let loop = $state(0); // 0 = infinite
	let outputWidth = $state(480);
	let quality = $state(80);

	// Optimization
	let optimizeOutput = $state(false);
	let lossyLevel = $state(80);

	// Preview
	let isPlaying = $state(false);
	let currentFrameIndex = $state(0);
	let previewInterval: ReturnType<typeof setInterval> | null = null;

	// Comparison modal
	let showComparison = $state(false);

	// Drag and drop reordering
	let draggedFrame: Frame | null = null;
	let dragOverIndex: number | null = null;

	function generateId(): string {
		return `frame-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	async function handleFiles(files: File[]) {
		const imageFiles = files.filter((f) => f.type.startsWith('image/') && !f.type.includes('gif'));
		if (imageFiles.length === 0) {
			toast.error('Please select image files (PNG, JPG, WebP)');
			return;
		}

		// Load images and get dimensions
		const newFrames: Frame[] = [];
		for (const file of imageFiles) {
			const url = URL.createObjectURL(file);
			const { width, height } = await getImageDimensions(url);
			newFrames.push({
				id: generateId(),
				file,
				url,
				delay: globalDelay,
				width,
				height,
			});
		}

		frames = [...frames, ...newFrames];

		// Auto-set output width based on first frame if no frames existed
		if (frames.length === newFrames.length && newFrames.length > 0) {
			outputWidth = Math.min(newFrames[0].width, 480);
		}

		toast.success(`Added ${newFrames.length} frame(s)`);

		// Clear previous result
		if (resultUrl) {
			URL.revokeObjectURL(resultUrl);
			resultUrl = null;
		}
	}

	function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => resolve({ width: img.width, height: img.height });
			img.onerror = () => resolve({ width: 480, height: 480 });
			img.src = url;
		});
	}

	function removeFrame(id: string) {
		const frame = frames.find((f) => f.id === id);
		if (frame) {
			URL.revokeObjectURL(frame.url);
		}
		frames = frames.filter((f) => f.id !== id);
	}

	function updateFrameDelay(id: string, delay: number) {
		frames = frames.map((f) => (f.id === id ? { ...f, delay } : f));
	}

	function applyGlobalDelay() {
		frames = frames.map((f) => ({ ...f, delay: globalDelay }));
		toast.success('Applied delay to all frames');
	}

	// Drag and drop handlers
	function handleDragStart(frame: Frame) {
		draggedFrame = frame;
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		dragOverIndex = index;
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	function handleDrop(targetIndex: number) {
		if (!draggedFrame) return;

		const sourceIndex = frames.findIndex((f) => f.id === draggedFrame!.id);
		if (sourceIndex === targetIndex) {
			draggedFrame = null;
			dragOverIndex = null;
			return;
		}

		const newFrames = [...frames];
		newFrames.splice(sourceIndex, 1);
		newFrames.splice(targetIndex, 0, draggedFrame);
		frames = newFrames;

		draggedFrame = null;
		dragOverIndex = null;
	}

	function handleDragEnd() {
		draggedFrame = null;
		dragOverIndex = null;
	}

	// Preview animation
	function togglePreview() {
		if (isPlaying) {
			stopPreview();
		} else {
			startPreview();
		}
	}

	function startPreview() {
		if (frames.length === 0) return;
		isPlaying = true;
		playNextFrame();
	}

	function playNextFrame() {
		if (!isPlaying || frames.length === 0) return;

		const frame = frames[currentFrameIndex];
		previewInterval = setTimeout(() => {
			currentFrameIndex = (currentFrameIndex + 1) % frames.length;
			playNextFrame();
		}, frame.delay);
	}

	function stopPreview() {
		isPlaying = false;
		if (previewInterval) {
			clearTimeout(previewInterval);
			previewInterval = null;
		}
	}

	async function handleCreate() {
		if (frames.length < 2) {
			toast.error('Add at least 2 frames to create a GIF');
			return;
		}

		isProcessing = true;
		progress = 0;
		progressStage = 'Preparing frames...';
		stopPreview();

		// Clear previous result
		if (resultUrl) {
			URL.revokeObjectURL(resultUrl);
			resultUrl = null;
		}

		try {
			// Calculate output dimensions
			const firstFrame = frames[0];
			const aspectRatio = firstFrame.height / firstFrame.width;
			const outputHeight = Math.round(outputWidth * aspectRatio);

			// Create canvas for resizing
			const canvas = document.createElement('canvas');
			canvas.width = outputWidth;
			canvas.height = outputHeight;
			const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

			// Prepare frames as ImageData for gifski
			const frameDataList: ImageData[] = [];
			const frameDurations: number[] = [];

			// Process each frame
			for (let i = 0; i < frames.length; i++) {
				const frame = frames[i];
				progressStage = `Processing frame ${i + 1}/${frames.length}`;
				progress = Math.round(((i + 1) / frames.length) * 50);

				// Load and draw image
				const img = await loadImage(frame.url);
				ctx.clearRect(0, 0, outputWidth, outputHeight);
				ctx.drawImage(img, 0, 0, outputWidth, outputHeight);

				// Get image data
				const imageData = ctx.getImageData(0, 0, outputWidth, outputHeight);
				frameDataList.push(imageData);
				frameDurations.push(frame.delay);
			}

			progressStage = 'Encoding GIF with gifski...';
			progress = 55;

			// Use gifski-wasm for high-quality GIF encoding
			const gifBuffer = await encode({
				frames: frameDataList,
				width: outputWidth,
				height: outputHeight,
				frameDurations, // Per-frame durations in ms
				quality, // gifski quality 1-100
			});

			let finalBuffer = gifBuffer;

			// Optimize if enabled
			if (optimizeOutput) {
				progressStage = 'Optimizing GIF...';
				progress = 80;

				const { result } = await optimizeGif(
					gifBuffer.buffer,
					{ lossy: lossyLevel, colors: 256 },
					(p) => {
						progress = 80 + Math.round(p * 0.15);
					}
				);
				finalBuffer = new Uint8Array(result);
			}

			progressStage = 'Finalizing GIF...';
			progress = 98;

			// Create blob
			const blob = new Blob([finalBuffer], { type: 'image/gif' });
			resultBlob = blob;
			resultUrl = URL.createObjectURL(blob);
			resultSize = blob.size;

			progress = 100;
			progressStage = 'Complete!';
			toast.success('GIF created successfully!');
		} catch (error) {
			console.error('GIF creation error:', error);
			toast.error('Failed to create GIF');
		} finally {
			isProcessing = false;
		}
	}

	function loadImage(src: string): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = reject;
			img.src = src;
		});
	}

	function downloadResult() {
		if (!resultUrl) return;
		const a = document.createElement('a');
		a.href = resultUrl;
		a.download = `swirl-animation-${Date.now()}.gif`;
		a.click();
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
		stopPreview();
		frames.forEach((f) => URL.revokeObjectURL(f.url));
		frames = [];
		if (resultUrl) {
			URL.revokeObjectURL(resultUrl);
			resultUrl = null;
		}
		currentFrameIndex = 0;
	}

	// Derived
	const totalDuration = $derived(frames.reduce((sum, f) => sum + f.delay, 0));
	const estimatedFps = $derived(
		frames.length > 0 ? Math.round(1000 / (totalDuration / frames.length)) : 0
	);
</script>

<svelte:head>
	<title>GIF Maker - Swirl</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />

	<!-- Background decoration -->
	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -right-1/4 -top-1/2 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-green-500/10 to-emerald-500/10 blur-3xl"
		></div>
		<div
			class="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-emerald-500/10 to-green-500/10 blur-3xl"
		></div>
	</div>

	<main class="flex-1 px-4 pb-12 pt-28 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-5xl">
			<!-- Header -->
			<div class="mb-8 text-center" in:fade={{ duration: 200 }}>
				<div
					class="mb-4 inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-1.5 text-sm font-medium text-green-400"
				>
					<Images class="h-4 w-4" />
					GIF Maker
				</div>
				<h1 class="text-surface-100 text-3xl font-bold">
					Create GIF from <span class="gradient-text">images</span>
				</h1>
				<p class="text-surface-500 mt-2">Combine PNG, JPG, or WebP images into an animated GIF</p>
			</div>

			<div class="grid gap-6 lg:grid-cols-2">
				<!-- Left: Preview and Frames -->
				<div>
					<!-- Preview -->
					{#if frames.length > 0}
						<div class="glass mb-4 rounded-2xl p-4" in:fly={{ y: -10, duration: 200 }}>
							<div
								class="bg-surface-900 relative flex aspect-video items-center justify-center overflow-hidden rounded-xl"
							>
								{#if resultUrl}
									<img
										src={resultUrl}
										alt="Result GIF"
										class="max-h-full max-w-full object-contain"
									/>
								{:else if frames[currentFrameIndex]}
									<img
										src={frames[currentFrameIndex].url}
										alt="Frame {currentFrameIndex + 1}"
										class="max-h-full max-w-full object-contain"
									/>
								{/if}

								<!-- Play overlay -->
								<button
									onclick={togglePreview}
									class="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity hover:opacity-100"
								>
									<div
										class="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur"
									>
										{#if isPlaying}
											<Pause class="h-8 w-8 text-white" />
										{:else}
											<Play class="ml-1 h-8 w-8 text-white" />
										{/if}
									</div>
								</button>
							</div>

							<!-- Preview info -->
							<div class="mt-3 flex items-center justify-between text-sm">
								<span class="text-surface-400">
									Frame {currentFrameIndex + 1} / {frames.length}
								</span>
								<span class="text-surface-500">
									{(totalDuration / 1000).toFixed(2)}s • ~{estimatedFps} FPS
								</span>
							</div>
						</div>
					{/if}

					<!-- Drop Zone -->
					<DropZone
						accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
						acceptLabel="PNG, JPG, WebP"
						onfiles={handleFiles}
						compact={frames.length > 0}
					/>

					<!-- Frame List -->
					{#if frames.length > 0}
						<div class="mt-4 space-y-2" in:fly={{ y: 20, duration: 200 }}>
							<div class="mb-2 flex items-center justify-between">
								<h3 class="text-surface-300 text-sm font-medium">Frames ({frames.length})</h3>
								<button
									onclick={clearAll}
									class="text-surface-500 text-xs transition-colors hover:text-red-400"
								>
									Clear all
								</button>
							</div>

							{#each frames as frame, index (frame.id)}
								<div
									class="glass flex cursor-move items-center gap-3 rounded-xl p-3 {dragOverIndex ===
									index
										? 'ring-accent-start ring-2'
										: ''}"
									draggable="true"
									ondragstart={() => handleDragStart(frame)}
									ondragover={(e) => handleDragOver(e, index)}
									ondragleave={handleDragLeave}
									ondrop={() => handleDrop(index)}
									ondragend={handleDragEnd}
									animate:flip={{ duration: 200 }}
									in:slide={{ duration: 200 }}
								>
									<div class="text-surface-600 cursor-grab active:cursor-grabbing">
										<GripVertical class="h-5 w-5" />
									</div>

									<div class="bg-surface-800 h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
										<img src={frame.url} alt="" class="h-full w-full object-cover" />
									</div>

									<div class="min-w-0 flex-1">
										<p class="text-surface-200 truncate text-sm font-medium">Frame {index + 1}</p>
										<p class="text-surface-500 text-xs">{frame.width}×{frame.height}</p>
									</div>

									<label class="flex items-center gap-2">
										<input
											type="number"
											value={frame.delay}
											min="10"
											max="5000"
											step="10"
											onchange={(e) =>
												updateFrameDelay(frame.id, parseInt(e.currentTarget.value) || 100)}
											class="bg-surface-800 text-surface-100 w-16 rounded-lg px-2 py-1 text-center text-sm"
										/>
										<span class="text-surface-500 text-xs">ms</span>
									</label>

									<button
										onclick={() => removeFrame(frame.id)}
										class="text-surface-500 p-2 transition-colors hover:text-red-400"
									>
										<Trash2 class="h-4 w-4" />
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Right: Settings -->
				<div class="glass h-fit rounded-2xl p-6" in:fly={{ y: 20, delay: 100, duration: 200 }}>
					<h3 class="text-surface-100 mb-6 flex items-center gap-2 text-lg font-semibold">
						<Settings class="text-accent-start h-5 w-5" />
						Settings
					</h3>

					<div class="space-y-5">
						<!-- Global Delay -->
						<div>
							<label class="text-surface-300 mb-2 block text-sm font-medium">
								Frame Delay: <span class="text-accent-start">{globalDelay}ms</span>
							</label>
							<div class="flex gap-2">
								<input
									type="range"
									bind:value={globalDelay}
									min="10"
									max="1000"
									step="10"
									class="accent-accent-start flex-1"
								/>
								<button
									onclick={applyGlobalDelay}
									class="bg-surface-700 text-surface-300 hover:bg-surface-600 rounded-lg px-3 py-1 text-xs transition-colors"
								>
									Apply all
								</button>
							</div>
							<div class="text-surface-500 mt-1 flex justify-between text-xs">
								<span>10ms (fast)</span>
								<span>1000ms (slow)</span>
							</div>
						</div>

						<!-- Output Width -->
						<div>
							<label class="text-surface-300 mb-2 block text-sm font-medium">
								Width: <span class="text-accent-start">{outputWidth}px</span>
							</label>
							<input
								type="range"
								bind:value={outputWidth}
								min="100"
								max="1080"
								step="20"
								class="accent-accent-start w-full"
							/>
							<div class="text-surface-500 mt-1 flex justify-between text-xs">
								<span>100px</span>
								<span>1080px</span>
							</div>
						</div>

						<!-- Quality -->
						<div>
							<label class="text-surface-300 mb-2 block text-sm font-medium">
								Quality: <span class="text-accent-start">{quality}%</span>
							</label>
							<input
								type="range"
								bind:value={quality}
								min="10"
								max="100"
								class="accent-accent-start w-full"
							/>
							<div class="text-surface-500 mt-1 flex justify-between text-xs">
								<span>Smaller file</span>
								<span>Better colors</span>
							</div>
						</div>

						<!-- Loop -->
						<div>
							<label class="text-surface-300 mb-2 block text-sm font-medium">
								Loop: <span class="text-accent-start"
									>{loop === 0 ? 'Infinite' : loop + ' times'}</span
								>
							</label>
							<input
								type="range"
								bind:value={loop}
								min="0"
								max="10"
								class="accent-accent-start w-full"
							/>
							<div class="text-surface-500 mt-1 flex justify-between text-xs">
								<span>Infinite</span>
								<span>10 times</span>
							</div>
						</div>

						<!-- Optimize Output -->
						<div class="bg-surface-800/50 space-y-3 rounded-xl p-4">
							<label class="flex cursor-pointer items-center gap-3">
								<input
									type="checkbox"
									bind:checked={optimizeOutput}
									class="bg-surface-700 border-surface-600 text-accent-start focus:ring-accent-start h-5 w-5 rounded"
								/>
								<div>
									<span class="text-surface-200 text-sm font-medium">Optimize output</span>
									<p class="text-surface-500 text-xs">Compress GIF further after creation</p>
								</div>
							</label>

							{#if optimizeOutput}
								<div class="border-surface-700 border-t pt-2">
									<label class="text-surface-300 mb-2 block text-sm font-medium">
										Compression: <span class="text-accent-start">{lossyLevel}</span>
									</label>
									<input
										type="range"
										bind:value={lossyLevel}
										min="0"
										max="200"
										class="accent-accent-start w-full"
									/>
									<div class="text-surface-500 mt-1 flex justify-between text-xs">
										<span>Lossless</span>
										<span>Maximum compression</span>
									</div>
								</div>
							{/if}
						</div>

						<!-- Create Button -->
						<button
							onclick={handleCreate}
							disabled={frames.length < 2 || isProcessing}
							class="from-accent-start to-accent-end shadow-accent-start/30 hover:shadow-accent-start/40 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#if isProcessing}
								<Loader2 class="h-5 w-5 animate-spin" />
								{progressStage} ({progress}%)
							{:else}
								<Images class="h-5 w-5" />
								Create GIF
							{/if}
						</button>

						<!-- Progress -->
						{#if isProcessing}
							<div class="bg-surface-800 h-2 overflow-hidden rounded-full">
								<div
									class="from-accent-start to-accent-end h-full bg-gradient-to-r transition-all duration-300"
									style="width: {progress}%"
								></div>
							</div>
						{/if}

						<!-- Result -->
						{#if resultUrl}
							<div
								class="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 p-4"
								in:fly={{ y: 10, duration: 200 }}
							>
								<div class="mb-3 flex items-center justify-between">
									<div>
										<p class="font-medium text-green-400">GIF created!</p>
										<p class="text-surface-500 text-sm">
											{formatBytes(resultSize)} • {frames.length} frames
										</p>
									</div>
								</div>

								<div class="flex gap-2">
									<button
										onclick={downloadResult}
										class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-600"
									>
										<Download class="h-4 w-4" />
										Download
									</button>
									{#if isClipboardWriteSupported()}
										<button
											onclick={copyResult}
											class="bg-surface-700 text-surface-200 hover:bg-surface-600 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
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
										class="bg-surface-700 text-surface-200 hover:bg-surface-600 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
										title="Compare"
									>
										<Eye class="h-4 w-4" />
									</button>
									<button
										onclick={resetResult}
										class="bg-surface-700 text-surface-200 hover:bg-surface-600 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
										title="Try again with different settings"
									>
										<RefreshCw class="h-4 w-4" />
									</button>
								</div>
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
{#if showComparison && frames.length > 0 && resultUrl}
	<CompareSlider
		originalUrl={frames[0].url}
		compressedUrl={resultUrl}
		originalSize={frames.reduce((sum, f) => sum + f.file.size, 0)}
		compressedSize={resultSize}
		onclose={() => (showComparison = false)}
	/>
{/if}
