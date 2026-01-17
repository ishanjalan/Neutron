<script lang="ts">
	import { onMount } from 'svelte';
	import { formatTimeInput } from '$lib/utils/format';

	interface Props {
		videoUrl: string;
		duration: number;
		trimStart: number;
		trimEnd: number;
		onchange: (start: number, end: number) => void;
	}

	let { videoUrl, duration, trimStart, trimEnd, onchange }: Props = $props();

	let containerRef: HTMLDivElement | undefined = $state(undefined);
	let thumbnails = $state<string[]>([]);
	let isDraggingStart = $state(false);
	let isDraggingEnd = $state(false);
	let previewTime = $state<number | null>(null);
	let previewPosition = $state(0);
	let isGeneratingThumbnails = $state(true);

	// Local state for smooth dragging
	let localStart = $state(trimStart);
	let localEnd = $state(trimEnd);

	// Sync with props
	$effect(() => {
		if (!isDraggingStart && !isDraggingEnd) {
			localStart = trimStart;
			localEnd = trimEnd;
		}
	});

	// Generate frame thumbnails on mount
	onMount(async () => {
		try {
			const video = document.createElement('video');
			video.src = videoUrl;
			video.crossOrigin = 'anonymous';
			video.muted = true;
			
			await new Promise<void>((resolve, reject) => {
				video.onloadedmetadata = () => resolve();
				video.onerror = () => reject(new Error('Failed to load video'));
				setTimeout(() => reject(new Error('Video load timeout')), 5000);
			});

			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d')!;
			
			const frameCount = Math.min(8, Math.max(4, Math.ceil(duration / 5)));
			const frames: string[] = [];
			
			canvas.width = 160;
			canvas.height = 90;

			for (let i = 0; i < frameCount; i++) {
				const targetTime = (duration / frameCount) * i + (duration / frameCount / 2);
				video.currentTime = targetTime;
				
				await new Promise<void>((resolve) => {
					video.onseeked = () => resolve();
					setTimeout(resolve, 500); // Fallback timeout
				});
				
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
				frames.push(canvas.toDataURL('image/jpeg', 0.5));
			}
			
			thumbnails = frames;
		} catch (e) {
			console.warn('Could not generate thumbnails:', e);
		} finally {
			isGeneratingThumbnails = false;
		}
	});

	function handleMouseDown(e: MouseEvent, handle: 'start' | 'end') {
		e.preventDefault();
		e.stopPropagation();
		if (handle === 'start') {
			isDraggingStart = true;
		} else {
			isDraggingEnd = true;
		}
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);
	}

	function handleMouseMove(e: MouseEvent) {
		if (!containerRef) return;
		
		const rect = containerRef.getBoundingClientRect();
		const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
		const percentage = x / rect.width;
		const time = percentage * duration;

		if (isDraggingStart) {
			// Start can't exceed end - 0.5s
			const maxStart = localEnd - 0.5;
			localStart = Math.max(0, Math.min(time, maxStart));
		} else if (isDraggingEnd) {
			// End can't be less than start + 0.5s
			const minEnd = localStart + 0.5;
			localEnd = Math.max(minEnd, Math.min(time, duration));
		}
	}

	function handleMouseUp() {
		if (isDraggingStart || isDraggingEnd) {
			onchange(localStart, localEnd);
		}
		isDraggingStart = false;
		isDraggingEnd = false;
		window.removeEventListener('mousemove', handleMouseMove);
		window.removeEventListener('mouseup', handleMouseUp);
	}

	function handleTrackHover(e: MouseEvent) {
		if (!containerRef || isDraggingStart || isDraggingEnd) return;
		
		const rect = containerRef.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const percentage = Math.max(0, Math.min(1, x / rect.width));
		previewTime = percentage * duration;
		previewPosition = x;
	}

	function handleTrackLeave() {
		previewTime = null;
	}

	function handleKeyDown(e: KeyboardEvent) {
		const step = e.shiftKey ? 1 : 0.1; // 1s with Shift, 0.1s without
		
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			if (e.target === document.activeElement) {
				const newStart = Math.max(0, localStart - step);
				if (newStart < localEnd - 0.5) {
					localStart = newStart;
					onchange(localStart, localEnd);
				}
			}
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			if (e.target === document.activeElement) {
				const newEnd = Math.min(duration, localEnd + step);
				if (newEnd > localStart + 0.5) {
					localEnd = newEnd;
					onchange(localStart, localEnd);
				}
			}
		}
	}

	// Calculate derived values
	const startPercent = $derived((localStart / duration) * 100);
	const endPercent = $derived((localEnd / duration) * 100);
	const trimmedDuration = $derived(localEnd - localStart);
</script>

<div class="select-none">
	<!-- Timeline Track -->
	<div
		bind:this={containerRef}
		class="relative h-14 rounded-lg bg-surface-800 overflow-hidden cursor-crosshair"
		onmousemove={handleTrackHover}
		onmouseleave={handleTrackLeave}
		role="slider"
		aria-label="Trim timeline"
		aria-valuenow={Math.round(trimmedDuration)}
		aria-valuemin={0}
		aria-valuemax={Math.round(duration)}
		tabindex="0"
		onkeydown={handleKeyDown}
	>
		<!-- Thumbnail strip -->
		{#if thumbnails.length > 0}
			<div class="absolute inset-0 flex">
				{#each thumbnails as thumb}
					<img src={thumb} alt="" class="h-full flex-1 object-cover opacity-40" />
				{/each}
			</div>
		{:else if isGeneratingThumbnails}
			<div class="absolute inset-0 flex items-center justify-center">
				<div class="w-4 h-4 border-2 border-surface-600 border-t-accent-start rounded-full animate-spin"></div>
			</div>
		{/if}

		<!-- Dimmed regions (before start and after end) -->
		<div
			class="absolute top-0 bottom-0 left-0 bg-black/60"
			style="width: {startPercent}%"
		></div>
		<div
			class="absolute top-0 bottom-0 right-0 bg-black/60"
			style="width: {100 - endPercent}%"
		></div>

		<!-- Selected region border -->
		<div
			class="absolute top-0 bottom-0 border-y-2 border-purple-500/70"
			style="left: {startPercent}%; right: {100 - endPercent}%"
		></div>

		<!-- Start handle -->
		<div
			class="absolute top-0 bottom-0 w-3 cursor-ew-resize bg-purple-500 flex items-center justify-center z-10 transition-all {isDraggingStart ? 'ring-2 ring-purple-300' : 'hover:bg-purple-400'}"
			style="left: {startPercent}%; transform: translateX(-50%)"
			onmousedown={(e) => handleMouseDown(e, 'start')}
			role="slider"
			aria-label="Trim start"
			aria-valuenow={Math.round(localStart * 10) / 10}
			tabindex="0"
		>
			<div class="w-0.5 h-6 bg-white/80 rounded-full"></div>
		</div>

		<!-- End handle -->
		<div
			class="absolute top-0 bottom-0 w-3 cursor-ew-resize bg-purple-500 flex items-center justify-center z-10 transition-all {isDraggingEnd ? 'ring-2 ring-purple-300' : 'hover:bg-purple-400'}"
			style="left: {endPercent}%; transform: translateX(-50%)"
			onmousedown={(e) => handleMouseDown(e, 'end')}
			role="slider"
			aria-label="Trim end"
			aria-valuenow={Math.round(localEnd * 10) / 10}
			tabindex="0"
		>
			<div class="w-0.5 h-6 bg-white/80 rounded-full"></div>
		</div>

		<!-- Hover preview time -->
		{#if previewTime !== null && !isDraggingStart && !isDraggingEnd}
			<div
				class="absolute -top-8 transform -translate-x-1/2 px-2 py-1 rounded bg-surface-700 text-xs text-surface-200 whitespace-nowrap z-20"
				style="left: {previewPosition}px"
			>
				{formatTimeInput(previewTime)}
			</div>
		{/if}
	</div>

	<!-- Time labels -->
	<div class="flex items-center justify-between mt-2 text-xs">
		<div class="flex items-center gap-2">
			<span class="text-surface-500">Start:</span>
			<span class="font-mono text-purple-400">{formatTimeInput(localStart)}</span>
		</div>
		<div class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-500/20">
			<span class="text-surface-400">Duration:</span>
			<span class="font-mono font-semibold text-purple-400">{formatTimeInput(trimmedDuration)}</span>
		</div>
		<div class="flex items-center gap-2">
			<span class="text-surface-500">End:</span>
			<span class="font-mono text-purple-400">{formatTimeInput(localEnd)}</span>
		</div>
	</div>
</div>
