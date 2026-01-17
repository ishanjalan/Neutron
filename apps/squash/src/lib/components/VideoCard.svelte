<script lang="ts">
	import { videos, type VideoItem, type OutputFormat, estimateFileSize, getEffectiveDuration } from '$lib/stores/videos.svelte';
	import { downloadVideo } from '$lib/utils/download';
	import { reprocessVideo, getOutputFilename, getCapabilitiesSync } from '$lib/utils/compress';
	import { formatBytes, formatDuration, formatETA, formatTimeInput, parseTimeInput } from '$lib/utils/format';
	import {
		Download,
		X,
		AlertCircle,
		Check,
		Loader2,
		ArrowRight,
		ChevronDown,
		RotateCcw,
		Play,
		SplitSquareHorizontal,
		Gpu,
		Scissors,
		GripVertical
	} from 'lucide-svelte';
	import { fade, scale, slide } from 'svelte/transition';
	import VideoComparison from './VideoComparison.svelte';
	import TrimTimeline from './TrimTimeline.svelte';
	import { toast } from './Toast.svelte';

	let { item }: { item: VideoItem } = $props();

	let showFormatMenu = $state(false);
	let showPreview = $state(false);
	let showComparison = $state(false);
	let showTrimUI = $state(false);
	let trimStartInput = $state('');
	let trimEndInput = $state('');
	
	// Check codec availability from cached capabilities
	const av1Available = $derived(() => {
		const caps = getCapabilitiesSync();
		return caps?.supportedVideoCodecs.includes('av1') ?? false;
	});
	
	const hevcAvailable = $derived(() => {
		const caps = getCapabilitiesSync();
		return caps?.supportedVideoCodecs.includes('hevc') ?? false;
	});

	const savings = $derived(
		item.compressedSize ? Math.round((1 - item.compressedSize / item.originalSize) * 100) : 0
	);

	const isPositiveSavings = $derived(savings > 0);
	
	// Estimated file size for pending items
	const estimatedSize = $derived(
		item.status === 'pending' ? estimateFileSize(item, videos.settings) : 0
	);
	
	// Effective duration (considering trim)
	const effectiveDuration = $derived(getEffectiveDuration(item));
	
	// Whether item has custom trim settings
	const hasTrim = $derived(item.trimStart !== undefined || item.trimEnd !== undefined);
	
	// Initialize trim inputs when showing UI
	$effect(() => {
		if (showTrimUI && item.duration) {
			trimStartInput = formatTimeInput(item.trimStart || 0);
			trimEndInput = formatTimeInput(item.trimEnd ?? item.duration);
		}
	});

	const availableFormats: { value: OutputFormat; label: string; color: string }[] = [
		{ value: 'mp4', label: 'MP4', color: 'from-orange-500 to-red-500' },
		{ value: 'webm', label: 'WebM', color: 'from-green-500 to-emerald-500' },
		{ value: 'hevc', label: 'HEVC', color: 'from-blue-500 to-cyan-500' },
		{ value: 'av1', label: 'AV1', color: 'from-purple-500 to-pink-500' }
	];

	function handleTrimUpdate() {
		const start = parseTimeInput(trimStartInput);
		const end = parseTimeInput(trimEndInput);
		const maxDuration = item.duration || 0;

		const newStart = start !== null ? Math.max(0, Math.min(start, maxDuration)) : undefined;
		const newEnd = end !== null ? Math.max(0, Math.min(end, maxDuration)) : undefined;

		// Validate: start must be before end
		if (newStart !== undefined && newEnd !== undefined && newStart >= newEnd) {
			return; // Invalid range
		}

		videos.updateItem(item.id, {
			trimStart: newStart,
			trimEnd: newEnd
		});
	}

	function clearTrim() {
		videos.updateItem(item.id, {
			trimStart: undefined,
			trimEnd: undefined
		});
		showTrimUI = false;
	}

	// Drag-out to save functionality
	function handleDragStart(e: DragEvent) {
		if (!item.compressedBlob || !item.compressedUrl) return;

		// Set the download URL for native drag-out-to-save
		const filename = getOutputFilename(item.name, item.outputFormat);
		const mimeType = item.outputFormat === 'webm' ? 'video/webm' : 'video/mp4';
		
		// Chrome/Edge support DownloadURL
		e.dataTransfer?.setData('DownloadURL', `${mimeType}:${filename}:${item.compressedUrl}`);
		
		// Also set text/plain as fallback
		e.dataTransfer?.setData('text/plain', item.compressedUrl);
		
		// Set drag image
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'copy';
		}
	}

	function handleRemove() {
		videos.removeItem(item.id);
	}

	function handleDownload() {
		downloadVideo(item);
	}

	async function handleFormatChange(format: OutputFormat) {
		showFormatMenu = false;
		if (format !== item.outputFormat) {
			toast.info(`Re-compressing as ${format.toUpperCase()}...`);
			videos.updateItem(item.id, { outputFormat: format });
			await reprocessVideo(item.id);
		}
	}

	async function handleRetry() {
		await reprocessVideo(item.id);
	}

	function getCurrentFormatColor() {
		const format = availableFormats.find((f) => f.value === item.outputFormat);
		return format?.color || 'from-gray-500 to-gray-600';
	}

</script>

<div
	class="glass group relative rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/20"
	in:scale={{ duration: 200, start: 0.95 }}
	out:fade={{ duration: 150 }}
	draggable={item.status === 'completed' && !!item.compressedBlob}
	ondragstart={handleDragStart}
	role={item.status === 'completed' && item.compressedBlob ? 'listitem' : undefined}
>
	<!-- Remove button -->
	<button
		onclick={handleRemove}
		class="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-surface-700 text-surface-400 opacity-0 shadow-lg transition-all hover:bg-red-500 hover:text-white group-hover:opacity-100"
		aria-label="Remove video"
	>
		<X class="h-3.5 w-3.5" />
	</button>

	<!-- Thumbnail -->
	<div class="relative w-full aspect-video overflow-hidden rounded-t-2xl bg-surface-800">
		<!-- svelte-ignore a11y_media_has_caption -->
		<video
			src={item.compressedUrl || item.originalUrl}
			class="h-full w-full object-cover"
			muted
			preload="metadata"
		></video>

		{#if item.status === 'processing'}
			<div
				class="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
			>
				<Loader2 class="h-8 w-8 text-white animate-spin mb-2" />
				<span class="text-white text-sm font-medium">{item.progress}%</span>
				{#if item.progressStage}
					<span class="text-white/60 text-xs mt-1">{item.progressStage}</span>
				{/if}
			</div>
		{:else}
			<!-- Play button overlay -->
			<button
				onclick={() => (showPreview = true)}
				class="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors"
			>
				<div
					class="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
				>
					<Play class="h-5 w-5 text-surface-800 ml-0.5" fill="currentColor" />
				</div>
			</button>
		{/if}

		<!-- Status badge (top-right) -->
		{#if item.status === 'completed'}
			<div class="absolute top-2 right-2">
				{#if isPositiveSavings}
					<span class="flex items-center gap-1 rounded-full bg-green-500 px-2 py-1 text-xs font-bold text-white shadow-lg">
						<Check class="h-3 w-3" />
						-{savings}%
					</span>
					<!-- Confetti for high savings -->
					{#if savings > 50}
						<div class="absolute inset-0 pointer-events-none overflow-visible">
							{#each Array(12) as _, i}
								<div
									class="absolute w-1.5 h-1.5 rounded-full animate-confetti"
									style="
										background: {['#f97316', '#eab308', '#22c55e', '#8b5cf6', '#ec4899'][i % 5]};
										left: {50 + (Math.random() - 0.5) * 60}%;
										top: 50%;
										animation-delay: {Math.random() * 0.4}s;
									"
								></div>
							{/each}
						</div>
					{/if}
				{:else}
					<span class="rounded-full bg-amber-500 px-2 py-1 text-xs font-bold text-white shadow-lg">
						+{Math.abs(savings)}%
					</span>
				{/if}
			</div>
		{:else if item.status === 'pending' && hasTrim}
			<div class="absolute top-2 right-2">
				<span class="flex items-center gap-1 rounded-full bg-purple-500/80 px-2 py-1 text-xs font-medium text-white shadow-lg">
					<Scissors class="h-3 w-3" />
					Trimmed
				</span>
			</div>
		{/if}

		<!-- Duration badge (bottom-left) -->
		{#if item.duration}
			<div class="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
				{#if hasTrim}
					<span class="text-purple-300">{formatDuration(effectiveDuration)}</span>
				{:else}
					{formatDuration(item.duration)}
				{/if}
			</div>
		{/if}

		<!-- Resolution badge (bottom-right) -->
		{#if item.width && item.height}
			<div class="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
				{item.width}×{item.height}
			</div>
		{/if}

		<!-- Drag hint for completed items (top-left on hover) -->
		{#if item.status === 'completed' && item.compressedBlob}
			<div
				class="absolute top-2 left-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity"
			>
				<GripVertical class="h-3 w-3" />
				Drag to save
			</div>
		{/if}
	</div>

	<!-- Info section -->
	<div class="p-3">
		<!-- Filename row -->
		<div class="flex items-center justify-between gap-2 mb-2">
			<p class="truncate text-sm font-medium text-surface-200" title={item.name}>
				{item.name}
			</p>
			<span class="flex-shrink-0 text-xs font-mono text-surface-400">
				{#if item.status === 'completed' && item.compressedSize}
					{formatBytes(item.compressedSize)}
				{:else if estimatedSize > 0}
					~{formatBytes(estimatedSize)}
				{/if}
			</span>
		</div>

		<!-- Status-specific content -->
		{#if item.status === 'pending'}
			<!-- Pending: Show trim option inline -->
			<div class="flex items-center justify-between gap-2">
				<span class="text-xs text-surface-500">
					{item.format?.toUpperCase()} → {item.outputFormat.toUpperCase()}
				</span>
				{#if item.duration}
					<button
						onclick={() => (showTrimUI = !showTrimUI)}
						class="flex items-center gap-1.5 px-3 py-2 sm:py-1 text-sm sm:text-xs font-medium rounded-lg transition-all {showTrimUI || hasTrim
							? 'bg-purple-500/20 text-purple-400'
							: 'text-surface-500 hover:text-surface-300 hover:bg-surface-700/50'}"
					>
						<Scissors class="h-3.5 w-3.5 sm:h-3 sm:w-3" />
						{hasTrim ? formatDuration(effectiveDuration) : 'Trim'}
					</button>
				{/if}
			</div>

			<!-- Trim UI (expandable) -->
			{#if showTrimUI && item.duration}
				<div class="mt-3" transition:slide={{ duration: 200 }}>
					<TrimTimeline
						videoUrl={item.originalUrl}
						duration={item.duration}
						trimStart={item.trimStart || 0}
						trimEnd={item.trimEnd ?? item.duration}
						onchange={(start, end) => {
							videos.updateItem(item.id, { 
								trimStart: start > 0 ? start : undefined, 
								trimEnd: end < item.duration ? end : undefined 
							});
						}}
					/>
					{#if hasTrim}
						<button
							onclick={clearTrim}
							class="mt-2 w-full py-1.5 text-xs text-surface-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
							aria-label="Clear trim"
						>
							Reset to full duration
						</button>
					{/if}
				</div>
			{/if}

		{:else if item.status === 'processing'}
			<div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-700">
				<div
					class="h-full rounded-full bg-gradient-to-r from-accent-start to-accent-end transition-all duration-300"
					style="width: {item.progress}%"
				></div>
			</div>

		{:else if item.status === 'error'}
			<div class="space-y-2">
				<!-- Error message -->
				<div class="flex items-start gap-1.5 text-xs text-red-400">
					<AlertCircle class="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
					<span class="break-words">{item.error || 'Compression failed'}</span>
				</div>
				<!-- Retry options -->
				<div class="flex items-center justify-between">
					<!-- Format selector for retry -->
					<div class="relative">
						<button
							onclick={() => (showFormatMenu = !showFormatMenu)}
							class="flex items-center gap-1 rounded bg-gradient-to-r {getCurrentFormatColor()} px-2 py-0.5 text-xs font-bold uppercase text-white transition-all hover:opacity-90"
						>
							{item.outputFormat.toUpperCase()}
							<ChevronDown class="h-3 w-3" />
						</button>

						{#if showFormatMenu}
							<button
								class="fixed inset-0 z-40"
								onclick={() => (showFormatMenu = false)}
								aria-label="Close"
							></button>
							<div
								class="absolute left-0 bottom-full z-50 mb-1 min-w-[100px] overflow-hidden rounded-lg bg-surface-800 shadow-xl ring-1 ring-white/10"
								transition:scale={{ duration: 100, start: 0.95 }}
							>
								{#each availableFormats as format}
									{@const isDisabled = (format.value === 'av1' && !av1Available()) || (format.value === 'hevc' && !hevcAvailable())}
									{@const isHardwareCodec = format.value === 'av1' || format.value === 'hevc'}
									{@const isAvailable = (format.value === 'av1' && av1Available()) || (format.value === 'hevc' && hevcAvailable())}
									<button
										onclick={() => !isDisabled && handleFormatChange(format.value)}
										disabled={isDisabled}
										class="flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors {isDisabled 
											? 'opacity-40 cursor-not-allowed' 
											: 'hover:bg-surface-700'} {item.outputFormat === format.value ? 'bg-surface-700/50' : ''}"
										title={isDisabled ? `${format.label} not available on this device` : ''}
									>
										<span class="h-2 w-2 rounded-full bg-gradient-to-r {format.color} {isDisabled ? 'opacity-50' : ''}"></span>
										<span class="font-medium {isDisabled ? 'text-surface-500 line-through' : 'text-surface-300'}">{format.label}</span>
										{#if isHardwareCodec && isAvailable}
											<span class="ml-auto text-[9px] text-purple-400">GPU</span>
										{:else if isHardwareCodec && isDisabled}
											<span class="ml-auto text-[9px] text-surface-500">N/A</span>
										{/if}
									</button>
								{/each}
							</div>
						{/if}
					</div>
					<button
						onclick={handleRetry}
						class="flex items-center gap-1.5 px-4 py-2.5 sm:py-1.5 text-sm sm:text-xs font-medium rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
					>
						<RotateCcw class="h-4 w-4 sm:h-3 sm:w-3" />
						Retry
					</button>
				</div>
			</div>

		{:else if item.status === 'completed'}
			<!-- Completed: Format selector + actions -->
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-1.5">
					<span class="text-xs text-surface-500">{item.format}</span>
					<ArrowRight class="h-3 w-3 text-surface-600" />
					<!-- Format dropdown -->
					<div class="relative">
						<button
							onclick={() => (showFormatMenu = !showFormatMenu)}
							class="flex items-center gap-1 rounded bg-gradient-to-r {getCurrentFormatColor()} px-2 py-0.5 text-xs font-bold uppercase text-white transition-all hover:opacity-90"
							title="Re-compress as different format"
						>
							<span class="text-[9px] font-normal opacity-80 hidden sm:inline mr-0.5">as</span>
							{item.outputFormat.toUpperCase()}
							<ChevronDown class="h-3 w-3" />
						</button>

						{#if showFormatMenu}
							<button
								class="fixed inset-0 z-40"
								onclick={() => (showFormatMenu = false)}
								aria-label="Close"
							></button>
							<div
								class="absolute left-0 bottom-full z-50 mb-1 min-w-[100px] overflow-hidden rounded-lg bg-surface-800 shadow-xl ring-1 ring-white/10"
								transition:scale={{ duration: 100, start: 0.95 }}
							>
								{#each availableFormats as format}
									{@const isDisabled = (format.value === 'av1' && !av1Available()) || (format.value === 'hevc' && !hevcAvailable())}
									{@const isHardwareCodec = format.value === 'av1' || format.value === 'hevc'}
									{@const isAvailable = (format.value === 'av1' && av1Available()) || (format.value === 'hevc' && hevcAvailable())}
									<button
										onclick={() => !isDisabled && handleFormatChange(format.value)}
										disabled={isDisabled}
										class="flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors {isDisabled 
											? 'opacity-40 cursor-not-allowed' 
											: 'hover:bg-surface-700'} {item.outputFormat === format.value ? 'bg-surface-700/50' : ''}"
										title={isDisabled ? `${format.label} not available on this device` : ''}
									>
										<span class="h-2 w-2 rounded-full bg-gradient-to-r {format.color} {isDisabled ? 'opacity-50' : ''}"></span>
										<span class="font-medium {isDisabled ? 'text-surface-500 line-through' : 'text-surface-300'}">{format.label}</span>
										{#if isHardwareCodec && isAvailable}
											<span class="ml-auto text-[9px] text-purple-400">GPU</span>
										{:else if isHardwareCodec && isDisabled}
											<span class="ml-auto text-[9px] text-surface-500">N/A</span>
										{/if}
									</button>
								{/each}
							</div>
						{/if}
					</div>

					<!-- GPU badge (WebCodecs always uses hardware) -->
					<span class="inline-flex items-center gap-0.5 rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-medium text-purple-400">
						<Gpu class="h-2.5 w-2.5" />
						GPU
					</span>

					{#if item.compressionDuration}
						<span class="text-[10px] text-surface-500">{(item.compressionDuration / 1000).toFixed(1)}s</span>
					{/if}
				</div>

				<!-- Action buttons -->
				<div class="flex items-center gap-1">
					{#if item.compressedUrl}
						<button
							onclick={() => (showComparison = true)}
							class="flex h-10 w-10 sm:h-7 sm:w-7 items-center justify-center rounded-lg sm:rounded text-surface-400 transition-all hover:bg-surface-700 hover:text-surface-200"
							title="Compare"
						>
							<SplitSquareHorizontal class="h-4 w-4 sm:h-3.5 sm:w-3.5" />
						</button>
					{/if}
					<button
						onclick={handleDownload}
						class="flex h-10 sm:h-7 items-center gap-1.5 rounded-lg sm:rounded bg-gradient-to-r from-accent-start to-accent-end px-3 sm:px-2.5 text-sm sm:text-xs font-medium text-white transition-all hover:opacity-90"
					>
						<Download class="h-4 w-4 sm:h-3.5 sm:w-3.5" />
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Video Preview Modal -->
{#if showPreview}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
		onclick={() => (showPreview = false)}
		onkeydown={(e) => e.key === 'Escape' && (showPreview = false)}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		transition:fade={{ duration: 150 }}
	>
		<button
			onclick={() => (showPreview = false)}
			class="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
			aria-label="Close preview"
		>
			<X class="h-6 w-6" />
		</button>
		<!-- svelte-ignore a11y_media_has_caption -->
		<video
			src={item.compressedUrl || item.originalUrl}
			class="max-h-[85vh] max-w-[95vw] rounded-2xl shadow-2xl"
			controls
			autoplay
			onclick={(e) => e.stopPropagation()}
		></video>
	</div>
{/if}

<!-- Video Comparison Modal -->
{#if showComparison && item.compressedUrl && item.compressedSize}
	<VideoComparison
		originalUrl={item.originalUrl}
		compressedUrl={item.compressedUrl}
		originalSize={item.originalSize}
		compressedSize={item.compressedSize}
		onclose={() => (showComparison = false)}
	/>
{/if}
