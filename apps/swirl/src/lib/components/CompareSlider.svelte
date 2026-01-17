<script lang="ts">
	import { X } from 'lucide-svelte';
	import { scale, fade } from 'svelte/transition';
	import { formatBytes } from '@neutron/utils';

	let {
		originalUrl,
		compressedUrl,
		originalSize,
		compressedSize,
		onclose
	}: {
		originalUrl: string;
		compressedUrl: string;
		originalSize: number;
		compressedSize: number;
		onclose: () => void;
	} = $props();

	let sliderPosition = $state(50);
	let isDragging = $state(false);
	let containerRef: HTMLDivElement;

	const savings = $derived(originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0);

	function getPositionFromEvent(clientX: number): number {
		if (!containerRef) return sliderPosition;
		const rect = containerRef.getBoundingClientRect();
		const x = clientX - rect.left;
		return Math.max(0, Math.min(100, (x / rect.width) * 100));
	}

	function handlePointerDown(e: PointerEvent) {
		e.preventDefault();
		isDragging = true;
		sliderPosition = getPositionFromEvent(e.clientX);
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging) return;
		e.preventDefault();
		sliderPosition = getPositionFromEvent(e.clientX);
	}

	function handlePointerUp(e: PointerEvent) {
		isDragging = false;
		(e.target as HTMLElement).releasePointerCapture(e.pointerId);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			sliderPosition = Math.max(0, sliderPosition - 2);
		}
		if (e.key === 'ArrowRight') {
			e.preventDefault();
			sliderPosition = Math.min(100, sliderPosition + 2);
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
<!-- Backdrop -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
	onclick={handleBackdropClick}
	transition:fade={{ duration: 150 }}
	role="dialog"
	aria-modal="true"
	aria-label="GIF comparison"
	tabindex="-1"
>
	<!-- Close button -->
	<button
		onclick={onclose}
		class="absolute top-4 right-4 z-20 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
		aria-label="Close comparison"
	>
		<X class="h-6 w-6" />
	</button>

	<!-- Size badges -->
	<div class="absolute top-4 left-4 z-20 flex items-center gap-4">
		<div class="rounded-xl bg-surface-800/90 px-4 py-2 backdrop-blur-sm">
			<div class="text-xs text-surface-400 uppercase tracking-wide">Original</div>
			<div class="text-lg font-bold text-white">{formatBytes(originalSize)}</div>
		</div>
		<div class="rounded-xl bg-gradient-to-r from-accent-start to-accent-end px-4 py-2 shadow-lg">
			<div class="text-xs text-white/80 uppercase tracking-wide">Compressed</div>
			<div class="text-lg font-bold text-white">
				{formatBytes(compressedSize)}
				{#if savings > 0}
					<span class="ml-2 text-sm font-normal">(-{savings}%)</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Instructions -->
	<div class="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm hidden md:block">
		Drag slider to compare • Use arrow keys • Press Esc to close
	</div>

	<!-- Comparison container -->
	<div
		bind:this={containerRef}
		class="relative w-[95vw] max-w-4xl aspect-auto select-none overflow-hidden rounded-2xl touch-none shadow-2xl bg-surface-900"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerUp}
		role="slider"
		aria-valuenow={Math.round(sliderPosition)}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label="Comparison slider"
		tabindex="0"
		transition:scale={{ duration: 200, start: 0.95 }}
	>
		<!-- Compressed GIF (full, bottom layer) -->
		<img
			src={compressedUrl}
			alt="Compressed"
			class="block w-full h-auto max-h-[80vh] object-contain pointer-events-none"
			draggable="false"
		/>

		<!-- Original GIF (clipped, top layer) -->
		<div
			class="absolute inset-0 overflow-hidden pointer-events-none"
			style="clip-path: polygon(0 0, {sliderPosition}% 0, {sliderPosition}% 100%, 0 100%)"
		>
			<img
				src={originalUrl}
				alt="Original"
				class="block w-full h-auto max-h-[80vh] object-contain"
				draggable="false"
			/>
		</div>

		<!-- Slider line -->
		<div
			class="absolute top-0 bottom-0 w-1 -ml-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none"
			style="left: {sliderPosition}%"
		>
			<!-- Handle circle -->
			<div
				class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-xl transition-transform {isDragging ? 'scale-110' : ''}"
			>
				<svg class="h-6 w-6 text-surface-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M18 8L22 12L18 16" />
					<path d="M6 8L2 12L6 16" />
				</svg>
			</div>
		</div>

		<!-- Labels -->
		<div class="absolute bottom-4 left-4 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm pointer-events-none">
			Original
		</div>
		<div class="absolute bottom-4 right-4 rounded-full bg-gradient-to-r from-accent-start to-accent-end px-3 py-1.5 text-xs font-semibold text-white shadow-lg pointer-events-none">
			Compressed
		</div>
	</div>

	<!-- Mobile instructions -->
	<div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-center md:hidden">
		<p class="text-sm text-surface-400">Drag to compare</p>
	</div>
</div>
