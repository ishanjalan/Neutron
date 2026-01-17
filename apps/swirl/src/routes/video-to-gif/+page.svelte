<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import CompareSlider from '$lib/components/CompareSlider.svelte';
	import { toast } from '@neutron/ui';
	import TimelineSlider from '$lib/components/TimelineSlider.svelte';
	import {
		Film,
		Settings,
		Download,
		Play,
		Pause,
		RotateCcw,
		Eye,
		Copy,
		Check,
		RefreshCw,
	} from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import encode from 'gifski-wasm';
	import { extractFramesFromVideo, checkBrowserSupport } from '$lib/utils/webcodecs';
	import { formatBytes, copyBlobToClipboard, isClipboardWriteSupported } from '@neutron/utils';
	import { optimizeGif } from '$lib/utils/gifsicle';

	// State
	let videoFile = $state<File | null>(null);
	let videoUrl = $state<string | null>(null);
	let videoElement: HTMLVideoElement;
	let isPlaying = $state(false);
	let duration = $state(0);
	let currentTime = $state(0);
	let videoWidth = $state(0);
	let videoHeight = $state(0);

	// Settings
	let fps = $state(15);
	let width = $state(480);
	let quality = $state(80);
	let startTime = $state(0);
	let endTime = $state(0);

	// Optimization
	let optimizeOutput = $state(false);
	let lossyLevel = $state(80);

	// Processing
	let isProcessing = $state(false);
	let progress = $state(0);
	let progressStage = $state('');
	let resultUrl = $state<string | null>(null);
	let resultBlob = $state<Blob | null>(null);
	let resultSize = $state(0);
	let processingTime = $state(0);
	let justCopied = $state(false);

	// Comparison modal
	let showComparison = $state(false);

	// Derived estimates
	const clipDuration = $derived(endTime - startTime);
	const estimatedFrames = $derived(Math.ceil(clipDuration * fps));
	const estimatedHeight = $derived(
		videoWidth > 0 ? Math.round(width * (videoHeight / videoWidth)) : 0
	);
	// Rough GIF size estimate: frames * width * height * 0.05 bytes (very rough, depends on content)
	const estimatedSizeBytes = $derived(estimatedFrames * width * estimatedHeight * 0.05);
	const estimatedSizeStr = $derived(estimatedSizeBytes > 0 ? formatBytes(estimatedSizeBytes) : '—');

	function handleFiles(files: File[]) {
		const videoFiles = files.filter((f) => f.type.startsWith('video/'));
		if (videoFiles.length === 0) {
			toast.error('Please select a video file');
			return;
		}

		videoFile = videoFiles[0];
		if (videoUrl) URL.revokeObjectURL(videoUrl);
		videoUrl = URL.createObjectURL(videoFile);

		// Reset result
		if (resultUrl) URL.revokeObjectURL(resultUrl);
		resultUrl = null;

		toast.success(`Loaded: ${videoFile.name}`);
	}

	async function handleVideoLoaded() {
		if (videoElement) {
			duration = videoElement.duration;
			videoWidth = videoElement.videoWidth;
			videoHeight = videoElement.videoHeight;
			endTime = Math.min(duration, 10); // Default to first 10 seconds

			// Auto-set width based on video aspect ratio
			const aspectRatio = videoHeight / videoWidth;
			if (videoWidth < 480) {
				width = videoWidth;
			}
		}
	}

	function togglePlayback() {
		if (!videoElement) return;
		if (isPlaying) {
			videoElement.pause();
		} else {
			videoElement.play();
		}
		isPlaying = !isPlaying;
	}

	function handleTimeUpdate() {
		if (videoElement) {
			currentTime = videoElement.currentTime;
		}
	}

	function seekTo(time: number) {
		if (videoElement) {
			videoElement.currentTime = time;
			currentTime = time;
		}
	}

	async function handleConvert() {
		if (!videoFile || !videoElement) return;

		isProcessing = true;
		progress = 0;
		progressStage = 'Initializing...';
		const startProcessTime = performance.now();

		// Clean up previous result
		if (resultUrl) {
			URL.revokeObjectURL(resultUrl);
			resultUrl = null;
		}

		try {
			// Pause video during processing
			videoElement.pause();
			isPlaying = false;

			// Calculate dimensions
			const aspectRatio = videoHeight / videoWidth;
			const targetHeight = Math.round(width * aspectRatio);

			progressStage = 'Extracting frames...';

			// Extract frames using WebCodecs-enhanced extraction
			const frames = await extractFramesFromVideo(
				videoFile,
				{
					startTime,
					endTime,
					fps,
					width,
					height: targetHeight,
				},
				(frameProgress) => {
					progress = Math.round(frameProgress.progress * 0.5); // 0-50% for extraction
					progressStage = `Extracting frame ${frameProgress.currentFrame}/${frameProgress.totalFrames}`;
				}
			);

			progressStage = 'Encoding GIF with gifski...';
			progress = 55;

			// Use gifski-wasm for high-quality GIF encoding
			// gifski expects ImageData frames or Uint8Array RGBA data
			const gifBuffer = await encode({
				frames,
				width,
				height: targetHeight,
				fps,
				quality, // gifski quality 1-100
			});

			let finalBuffer = gifBuffer;

			// Optimize if enabled
			if (optimizeOutput) {
				progressStage = 'Optimizing GIF...';
				progress = 85;

				const { result } = await optimizeGif(
					gifBuffer.buffer,
					{ lossy: lossyLevel, colors: 256 },
					(p) => {
						progress = 85 + Math.round(p * 0.1);
					}
				);
				finalBuffer = new Uint8Array(result);
			}

			progressStage = 'Finalizing...';
			progress = 98;

			// Create blob and URL
			const blob = new Blob([finalBuffer], { type: 'image/gif' });
			resultBlob = blob;
			resultUrl = URL.createObjectURL(blob);
			resultSize = blob.size;

			progress = 100;
			progressStage = 'Complete!';
			processingTime = Math.round((performance.now() - startProcessTime) / 1000);

			toast.success(`Conversion complete in ${processingTime}s!`);
		} catch (error) {
			console.error('Conversion error:', error);
			toast.error('Conversion failed. Please try again.');
		} finally {
			isProcessing = false;
		}
	}

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function clearVideo() {
		if (videoUrl) URL.revokeObjectURL(videoUrl);
		if (resultUrl) URL.revokeObjectURL(resultUrl);
		videoFile = null;
		videoUrl = null;
		resultUrl = null;
		startTime = 0;
		endTime = 0;
	}

	function downloadResult() {
		if (!resultUrl || !videoFile) return;
		const a = document.createElement('a');
		a.href = resultUrl;
		a.download = videoFile.name.replace(/\.[^/.]+$/, '') + '.gif';
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
</script>

<svelte:head>
	<title>Video to GIF - Swirl</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />

	<!-- Background decoration -->
	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -right-1/4 -top-1/2 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-pink-500/10 to-rose-500/10 blur-3xl"
		></div>
		<div
			class="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-rose-500/10 to-pink-500/10 blur-3xl"
		></div>
	</div>

	<main class="flex-1 px-4 pb-12 pt-28 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-5xl">
			<!-- Header -->
			<div class="mb-8 text-center" in:fade={{ duration: 200 }}>
				<div
					class="mb-4 inline-flex items-center gap-2 rounded-full bg-pink-500/10 px-4 py-1.5 text-sm font-medium text-pink-400"
				>
					<Film class="h-4 w-4" />
					Video to GIF
				</div>
				<h1 class="text-surface-100 text-3xl font-bold">
					Convert video to <span class="gradient-text">animated GIF</span>
				</h1>
				<p class="text-surface-500 mt-2">Upload MP4, WebM, or MOV and convert to animated GIF</p>
			</div>

			{#if !videoFile}
				<!-- Drop Zone -->
				<div in:fade={{ duration: 200 }}>
					<DropZone
						accept=".mp4,.webm,.mov,.avi,.mkv,video/*"
						acceptLabel="MP4, WebM, MOV, AVI"
						onfiles={handleFiles}
					/>
				</div>
			{:else}
				<!-- Editor -->
				<div class="grid gap-6 lg:grid-cols-2" in:fly={{ y: 20, duration: 300 }}>
					<!-- Preview -->
					<div class="glass rounded-2xl p-4">
						<div class="bg-surface-900 relative aspect-video overflow-hidden rounded-xl">
							<!-- svelte-ignore a11y_media_has_caption -->
							<video
								bind:this={videoElement}
								src={videoUrl}
								class="h-full w-full object-contain"
								onloadedmetadata={handleVideoLoaded}
								ontimeupdate={handleTimeUpdate}
								onended={() => (isPlaying = false)}
							></video>

							<!-- Play overlay -->
							<button
								onclick={togglePlayback}
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

						<!-- Timeline Scrubber -->
						<div class="mt-4">
							<TimelineSlider
								{duration}
								bind:startTime
								bind:endTime
								{currentTime}
								onseek={seekTo}
							/>
						</div>

						<!-- File info -->
						<div class="text-surface-500 mt-4 flex items-center justify-between text-sm">
							<span class="truncate">{videoFile.name}</span>
							<button
								onclick={clearVideo}
								class="text-surface-400 flex items-center gap-1.5 transition-colors hover:text-red-400"
							>
								<RotateCcw class="h-4 w-4" />
								Clear
							</button>
						</div>
					</div>

					<!-- Settings -->
					<div class="glass rounded-2xl p-6">
						<h3 class="text-surface-100 mb-6 flex items-center gap-2 text-lg font-semibold">
							<Settings class="text-accent-start h-5 w-5" />
							Settings
						</h3>

						<div class="space-y-5">
							<!-- FPS -->
							<div>
								<label class="text-surface-300 mb-2 block text-sm font-medium">
									Frame Rate: <span class="text-accent-start">{fps} FPS</span>
								</label>
								<input
									type="range"
									bind:value={fps}
									min="5"
									max="30"
									class="accent-accent-start w-full"
								/>
								<div class="text-surface-500 mt-1 flex justify-between text-xs">
									<span>5 fps (smaller)</span>
									<span>30 fps (smoother)</span>
								</div>
							</div>

							<!-- Width -->
							<div>
								<label class="text-surface-300 mb-2 block text-sm font-medium">
									Width: <span class="text-accent-start">{width}px</span>
								</label>
								<input
									type="range"
									bind:value={width}
									min="240"
									max="1080"
									step="40"
									class="accent-accent-start w-full"
								/>
								<div class="text-surface-500 mt-1 flex justify-between text-xs">
									<span>240px</span>
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
									<span>Better quality</span>
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

							<!-- Estimate Preview -->
							{#if videoFile && clipDuration > 0}
								<div class="bg-surface-800/50 border-surface-700 rounded-xl border p-4">
									<p class="text-surface-400 mb-2 text-xs font-medium uppercase tracking-wider">
										Estimated Output
									</p>
									<div class="grid grid-cols-3 gap-3 text-center">
										<div>
											<p class="text-surface-100 text-lg font-semibold">
												{width}×{estimatedHeight}
											</p>
											<p class="text-surface-500 text-xs">Dimensions</p>
										</div>
										<div>
											<p class="text-surface-100 text-lg font-semibold">{estimatedFrames}</p>
											<p class="text-surface-500 text-xs">Frames</p>
										</div>
										<div>
											<p class="text-accent-start text-lg font-semibold">~{estimatedSizeStr}</p>
											<p class="text-surface-500 text-xs">Est. Size</p>
										</div>
									</div>
								</div>
							{/if}

							<!-- Convert Button -->
							<button
								onclick={handleConvert}
								disabled={isProcessing}
								class="from-accent-start to-accent-end shadow-accent-start/30 hover:shadow-accent-start/40 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
							>
								{#if isProcessing}
									<div
										class="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
									></div>
									{progressStage} ({progress}%)
								{:else}
									<Film class="h-5 w-5" />
									Convert to GIF
								{/if}
							</button>

							<!-- Progress -->
							{#if isProcessing}
								<div class="space-y-2">
									<div class="bg-surface-800 h-2 overflow-hidden rounded-full">
										<div
											class="from-accent-start to-accent-end h-full bg-gradient-to-r transition-all duration-300"
											style="width: {progress}%"
										></div>
									</div>
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
											<p class="font-medium text-green-400">Conversion complete!</p>
											<p class="text-surface-500 text-sm">
												Size: {formatBytes(resultSize)} • Time: {processingTime}s
											</p>
										</div>
									</div>

									<!-- Preview -->
									<div class="bg-surface-900 mb-3 overflow-hidden rounded-lg">
										<img
											src={resultUrl}
											alt="Result"
											class="h-auto max-h-40 w-full object-contain"
										/>
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
			{/if}
		</div>
	</main>

	<Footer />
</div>

<!-- Comparison Modal -->
{#if showComparison && videoUrl && resultUrl}
	<CompareSlider
		originalUrl={videoUrl}
		compressedUrl={resultUrl}
		originalSize={videoFile?.size || 0}
		compressedSize={resultSize}
		onclose={() => (showComparison = false)}
	/>
{/if}
