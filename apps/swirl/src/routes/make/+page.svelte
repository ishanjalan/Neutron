<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import CompareSlider from '$lib/components/CompareSlider.svelte';
	import { toast } from '@neutron/ui';
	import { Images, Settings, Download, Play, Pause, Trash2, GripVertical, Plus, Loader2, Copy, Check, Eye, RefreshCw } from 'lucide-svelte';
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
		const imageFiles = files.filter(f => f.type.startsWith('image/') && !f.type.includes('gif'));
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
				height
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
		const frame = frames.find(f => f.id === id);
		if (frame) {
			URL.revokeObjectURL(frame.url);
		}
		frames = frames.filter(f => f.id !== id);
	}

	function updateFrameDelay(id: string, delay: number) {
		frames = frames.map(f => f.id === id ? { ...f, delay } : f);
	}

	function applyGlobalDelay() {
		frames = frames.map(f => ({ ...f, delay: globalDelay }));
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
		
		const sourceIndex = frames.findIndex(f => f.id === draggedFrame!.id);
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
				quality // gifski quality 1-100
			});

			let finalBuffer = gifBuffer;
			
			// Optimize if enabled
			if (optimizeOutput) {
				progressStage = 'Optimizing GIF...';
				progress = 80;
				
				const { result } = await optimizeGif(
					gifBuffer.buffer,
					{ lossy: lossyLevel, colors: 256 },
					(p) => { progress = 80 + Math.round(p * 0.15); }
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
		progressStage = '';
	}

	function clearAll() {
		stopPreview();
		frames.forEach(f => URL.revokeObjectURL(f.url));
		frames = [];
		if (resultUrl) {
			URL.revokeObjectURL(resultUrl);
			resultUrl = null;
		}
		currentFrameIndex = 0;
	}

	// Derived
	const totalDuration = $derived(frames.reduce((sum, f) => sum + f.delay, 0));
	const estimatedFps = $derived(frames.length > 0 ? Math.round(1000 / (totalDuration / frames.length)) : 0);
</script>

<svelte:head>
	<title>GIF Maker - Swirl</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />

	<!-- Background decoration -->
	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div class="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-green-500/10 to-emerald-500/10 blur-3xl"></div>
		<div class="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-emerald-500/10 to-green-500/10 blur-3xl"></div>
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-12">
		<div class="mx-auto max-w-5xl">
			<!-- Header -->
			<div class="text-center mb-8" in:fade={{ duration: 200 }}>
				<div class="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-1.5 text-sm font-medium text-green-400 mb-4">
					<Images class="h-4 w-4" />
					GIF Maker
				</div>
				<h1 class="text-3xl font-bold text-surface-100">
					Create GIF from <span class="gradient-text">images</span>
				</h1>
				<p class="mt-2 text-surface-500">
					Combine PNG, JPG, or WebP images into an animated GIF
				</p>
			</div>

			<div class="grid gap-6 lg:grid-cols-2">
				<!-- Left: Preview and Frames -->
				<div>
					<!-- Preview -->
					{#if frames.length > 0}
						<div class="glass rounded-2xl p-4 mb-4" in:fly={{ y: -10, duration: 200 }}>
							<div class="aspect-video bg-surface-900 rounded-xl overflow-hidden relative flex items-center justify-center">
								{#if resultUrl}
									<img src={resultUrl} alt="Result GIF" class="max-w-full max-h-full object-contain" />
								{:else if frames[currentFrameIndex]}
									<img 
										src={frames[currentFrameIndex].url} 
										alt="Frame {currentFrameIndex + 1}" 
										class="max-w-full max-h-full object-contain"
									/>
								{/if}
								
								<!-- Play overlay -->
								<button
									onclick={togglePreview}
									class="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
								>
									<div class="h-16 w-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
										{#if isPlaying}
											<Pause class="h-8 w-8 text-white" />
										{:else}
											<Play class="h-8 w-8 text-white ml-1" />
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
							<div class="flex items-center justify-between mb-2">
								<h3 class="text-sm font-medium text-surface-300">Frames ({frames.length})</h3>
								<button
									onclick={clearAll}
									class="text-xs text-surface-500 hover:text-red-400 transition-colors"
								>
									Clear all
								</button>
							</div>
							
							{#each frames as frame, index (frame.id)}
								<div 
									class="glass rounded-xl p-3 flex items-center gap-3 cursor-move {dragOverIndex === index ? 'ring-2 ring-accent-start' : ''}"
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
									
									<div class="h-12 w-12 rounded-lg bg-surface-800 overflow-hidden flex-shrink-0">
										<img src={frame.url} alt="" class="w-full h-full object-cover" />
									</div>
									
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium text-surface-200 truncate">Frame {index + 1}</p>
										<p class="text-xs text-surface-500">{frame.width}×{frame.height}</p>
									</div>
									
									<label class="flex items-center gap-2">
										<input
											type="number"
											value={frame.delay}
											min="10"
											max="5000"
											step="10"
											onchange={(e) => updateFrameDelay(frame.id, parseInt(e.currentTarget.value) || 100)}
											class="w-16 rounded-lg bg-surface-800 px-2 py-1 text-sm text-surface-100 text-center"
										/>
										<span class="text-xs text-surface-500">ms</span>
									</label>
									
									<button
										onclick={() => removeFrame(frame.id)}
										class="p-2 text-surface-500 hover:text-red-400 transition-colors"
									>
										<Trash2 class="h-4 w-4" />
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Right: Settings -->
				<div class="glass rounded-2xl p-6 h-fit" in:fly={{ y: 20, delay: 100, duration: 200 }}>
					<h3 class="flex items-center gap-2 text-lg font-semibold text-surface-100 mb-6">
						<Settings class="h-5 w-5 text-accent-start" />
						Settings
					</h3>

					<div class="space-y-5">
						<!-- Global Delay -->
						<div>
							<label class="block text-sm font-medium text-surface-300 mb-2">
								Frame Delay: <span class="text-accent-start">{globalDelay}ms</span>
							</label>
							<div class="flex gap-2">
								<input
									type="range"
									bind:value={globalDelay}
									min="10"
									max="1000"
									step="10"
									class="flex-1 accent-accent-start"
								/>
								<button
									onclick={applyGlobalDelay}
									class="px-3 py-1 rounded-lg bg-surface-700 text-xs text-surface-300 hover:bg-surface-600 transition-colors"
								>
									Apply all
								</button>
							</div>
							<div class="flex justify-between text-xs text-surface-500 mt-1">
								<span>10ms (fast)</span>
								<span>1000ms (slow)</span>
							</div>
						</div>

						<!-- Output Width -->
						<div>
							<label class="block text-sm font-medium text-surface-300 mb-2">
								Width: <span class="text-accent-start">{outputWidth}px</span>
							</label>
							<input
								type="range"
								bind:value={outputWidth}
								min="100"
								max="1080"
								step="20"
								class="w-full accent-accent-start"
							/>
							<div class="flex justify-between text-xs text-surface-500 mt-1">
								<span>100px</span>
								<span>1080px</span>
							</div>
						</div>

						<!-- Quality -->
						<div>
							<label class="block text-sm font-medium text-surface-300 mb-2">
								Quality: <span class="text-accent-start">{quality}%</span>
							</label>
							<input
								type="range"
								bind:value={quality}
								min="10"
								max="100"
								class="w-full accent-accent-start"
							/>
							<div class="flex justify-between text-xs text-surface-500 mt-1">
								<span>Smaller file</span>
								<span>Better colors</span>
							</div>
						</div>

						<!-- Loop -->
						<div>
							<label class="block text-sm font-medium text-surface-300 mb-2">
								Loop: <span class="text-accent-start">{loop === 0 ? 'Infinite' : loop + ' times'}</span>
							</label>
							<input
								type="range"
								bind:value={loop}
								min="0"
								max="10"
								class="w-full accent-accent-start"
							/>
							<div class="flex justify-between text-xs text-surface-500 mt-1">
								<span>Infinite</span>
								<span>10 times</span>
							</div>
						</div>

						<!-- Optimize Output -->
						<div class="p-4 rounded-xl bg-surface-800/50 space-y-3">
							<label class="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									bind:checked={optimizeOutput}
									class="w-5 h-5 rounded bg-surface-700 border-surface-600 text-accent-start focus:ring-accent-start"
								/>
								<div>
									<span class="text-sm font-medium text-surface-200">Optimize output</span>
									<p class="text-xs text-surface-500">Compress GIF further after creation</p>
								</div>
							</label>
							
							{#if optimizeOutput}
								<div class="pt-2 border-t border-surface-700">
									<label class="block text-sm font-medium text-surface-300 mb-2">
										Compression: <span class="text-accent-start">{lossyLevel}</span>
									</label>
									<input
										type="range"
										bind:value={lossyLevel}
										min="0"
										max="200"
										class="w-full accent-accent-start"
									/>
									<div class="flex justify-between text-xs text-surface-500 mt-1">
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
							class="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-start to-accent-end px-6 py-3 text-base font-semibold text-white shadow-lg shadow-accent-start/30 transition-all hover:shadow-xl hover:shadow-accent-start/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
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
							<div class="h-2 bg-surface-800 rounded-full overflow-hidden">
								<div 
									class="h-full bg-gradient-to-r from-accent-start to-accent-end transition-all duration-300"
									style="width: {progress}%"
								></div>
							</div>
						{/if}

						<!-- Result -->
						{#if resultUrl}
							<div class="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30" in:fly={{ y: 10, duration: 200 }}>
								<div class="flex items-center justify-between mb-3">
									<div>
										<p class="text-green-400 font-medium">GIF created!</p>
										<p class="text-sm text-surface-500">
											{formatBytes(resultSize)} • {frames.length} frames
										</p>
									</div>
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
		onclose={() => showComparison = false}
	/>
{/if}
