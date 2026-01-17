<script lang="ts">
	import { X, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import { createFocusTrap } from '@neutron/utils';

	interface Props {
		originalUrl: string;
		compressedUrl: string;
		originalSize: number;
		compressedSize: number;
		onclose: () => void;
	}

	let { originalUrl, compressedUrl, originalSize, compressedSize, onclose }: Props = $props();

	let sliderPosition = $state(50);
	let isDragging = $state(false);
	let containerRef: HTMLDivElement;
	let modalRef = $state<HTMLDivElement | undefined>(undefined);

	// Focus trap for accessibility
	$effect(() => {
		if (modalRef) {
			const cleanup = createFocusTrap(modalRef);
			return cleanup;
		}
	});

	const savings = $derived(Math.round((1 - compressedSize / originalSize) * 100));

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	function handleMouseDown(e: MouseEvent) {
		isDragging = true;
		updatePosition(e);
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging) return;
		updatePosition(e);
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleTouchStart(e: TouchEvent) {
		isDragging = true;
		updatePositionFromTouch(e);
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isDragging) return;
		e.preventDefault();
		updatePositionFromTouch(e);
	}

	function handleTouchEnd() {
		isDragging = false;
	}

	function updatePosition(e: MouseEvent) {
		if (!containerRef) return;
		const rect = containerRef.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
		sliderPosition = percentage;
	}

	function updatePositionFromTouch(e: TouchEvent) {
		if (!containerRef || !e.touches[0]) return;
		const rect = containerRef.getBoundingClientRect();
		const x = e.touches[0].clientX - rect.left;
		const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
		sliderPosition = percentage;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		} else if (e.key === 'ArrowLeft') {
			sliderPosition = Math.max(0, sliderPosition - 5);
		} else if (e.key === 'ArrowRight') {
			sliderPosition = Math.min(100, sliderPosition + 5);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} onmouseup={handleMouseUp} onmousemove={handleMouseMove} />

<div
	bind:this={modalRef}
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
	role="dialog"
	aria-modal="true"
	aria-label="Video comparison"
	transition:fade={{ duration: 200 }}
>
	<!-- Close button -->
	<button
		onclick={onclose}
		class="absolute right-4 top-4 z-20 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
		aria-label="Close comparison"
	>
		<X class="h-6 w-6" />
	</button>

	<!-- Info badges -->
	<div class="absolute left-4 top-4 z-20 flex items-center gap-4">
		<div class="bg-surface-800/90 rounded-xl px-4 py-2 backdrop-blur-sm">
			<div class="text-surface-400 text-xs uppercase tracking-wide">Original</div>
			<div class="text-lg font-bold text-white">{formatBytes(originalSize)}</div>
		</div>
		<div class="from-accent-start to-accent-end rounded-xl bg-gradient-to-r px-4 py-2 shadow-lg">
			<div class="text-xs uppercase tracking-wide text-white/80">Compressed</div>
			<div class="text-lg font-bold text-white">
				{formatBytes(compressedSize)}
				<span class="ml-2 text-sm font-normal">(-{savings}%)</span>
			</div>
		</div>
	</div>

	<!-- Comparison container -->
	<div
		bind:this={containerRef}
		class="relative max-h-[80vh] max-w-[95vw] select-none overflow-hidden rounded-2xl shadow-2xl"
		onmousedown={handleMouseDown}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		role="slider"
		aria-label="Comparison slider"
		aria-valuenow={Math.round(sliderPosition)}
		aria-valuemin={0}
		aria-valuemax={100}
		tabindex="0"
	>
		<!-- Original video (full width, behind) -->
		<div class="relative">
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				src={originalUrl}
				class="block max-h-[80vh] max-w-[95vw]"
				muted
				loop
				autoplay
				playsinline
			></video>
			<div
				class="absolute bottom-4 left-4 rounded-lg bg-black/70 px-3 py-1.5 text-sm font-medium text-white"
			>
				Original
			</div>
		</div>

		<!-- Compressed video (clipped) -->
		<div class="absolute inset-0 overflow-hidden" style="clip-path: inset(0 0 0 {sliderPosition}%)">
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				src={compressedUrl}
				class="block max-h-[80vh] max-w-[95vw]"
				muted
				loop
				autoplay
				playsinline
			></video>
			<div
				class="from-accent-start to-accent-end absolute bottom-4 right-4 rounded-lg bg-gradient-to-r px-3 py-1.5 text-sm font-bold text-white shadow-lg"
			>
				Compressed
			</div>
		</div>

		<!-- Slider handle -->
		<div
			class="absolute bottom-0 top-0 z-10 w-1 cursor-ew-resize transition-transform"
			style="left: {sliderPosition}%; transform: translateX(-50%)"
		>
			<!-- Line -->
			<div class="absolute inset-0 bg-white shadow-lg"></div>

			<!-- Handle -->
			<div
				class="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-xl transition-transform {isDragging
					? 'scale-110'
					: 'hover:scale-105'}"
			>
				<ChevronLeft class="text-surface-600 -mr-1 h-5 w-5" />
				<ChevronRight class="text-surface-600 -ml-1 h-5 w-5" />
			</div>
		</div>
	</div>

	<!-- Instructions -->
	<div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
		<p class="text-surface-400 text-sm">
			Drag slider to compare • Press <kbd class="bg-surface-800 rounded px-2 py-0.5">←</kbd>
			<kbd class="bg-surface-800 rounded px-2 py-0.5">→</kbd>
			to adjust • <kbd class="bg-surface-800 rounded px-2 py-0.5">Esc</kbd> to close
		</p>
	</div>
</div>
