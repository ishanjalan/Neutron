<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { X, Eye, Loader2 } from 'lucide-svelte';
	import { createFocusTrap } from '$lib/utils/focus-trap';
	import { QUALITY_PRESETS, type VideoItem } from '$lib/stores/videos.svelte';

	interface Props {
		item: VideoItem;
		quality: keyof typeof QUALITY_PRESETS;
		onclose: () => void;
	}

	let { item, quality, onclose }: Props = $props();

	let modalRef = $state<HTMLDivElement | undefined>(undefined);
	let originalFrame = $state<string | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	// Focus trap
	$effect(() => {
		if (modalRef) {
			const cleanup = createFocusTrap(modalRef);
			return cleanup;
		}
	});

	// Extract frame on mount
	$effect(() => {
		extractFrame();
	});

	async function extractFrame() {
		try {
			isLoading = true;
			error = null;

			const video = document.createElement('video');
			video.src = item.originalUrl;
			video.crossOrigin = 'anonymous';
			video.muted = true;

			await new Promise<void>((resolve, reject) => {
				video.onloadedmetadata = () => resolve();
				video.onerror = () => reject(new Error('Failed to load video'));
				setTimeout(() => reject(new Error('Video load timeout')), 5000);
			});

			// Seek to middle of video
			const targetTime = (item.duration || 0) / 2;
			video.currentTime = targetTime;

			await new Promise<void>((resolve) => {
				video.onseeked = () => resolve();
				setTimeout(resolve, 1000);
			});

			const canvas = document.createElement('canvas');
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(video, 0, 0);

			originalFrame = canvas.toDataURL('image/jpeg', 0.95);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to extract frame';
		} finally {
			isLoading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}

	const preset = QUALITY_PRESETS[quality];
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center p-4"
	transition:fade={{ duration: 150 }}
>
	<!-- Backdrop -->
	<button
		class="absolute inset-0 bg-black/90 backdrop-blur-sm cursor-default"
		onclick={onclose}
		aria-label="Close preview"
	></button>

	<!-- Modal -->
	<div
		bind:this={modalRef}
		class="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-surface-900 shadow-2xl ring-1 ring-white/10"
		role="dialog"
		aria-modal="true"
		aria-label="Quality preview"
		onkeydown={handleKeydown}
		tabindex="-1"
		transition:scale={{ duration: 200, start: 0.95 }}
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-surface-700/50 px-6 py-4">
			<div class="flex items-center gap-3">
				<div class="p-2 rounded-lg bg-accent-start/20">
					<Eye class="h-5 w-5 text-accent-start" />
				</div>
				<div>
					<h2 class="font-semibold text-surface-100">Quality Preview</h2>
					<p class="text-sm text-surface-400">
						{preset.label} quality (CRF {preset.crf})
					</p>
				</div>
			</div>
			<button
				onclick={onclose}
				class="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-surface-200 transition-colors"
				aria-label="Close"
			>
				<X class="h-5 w-5" />
			</button>
		</div>

		<!-- Content -->
		<div class="p-6">
			{#if isLoading}
				<div class="flex flex-col items-center justify-center py-16">
					<Loader2 class="h-8 w-8 text-accent-start animate-spin mb-4" />
					<p class="text-surface-400">Extracting preview frame...</p>
				</div>
			{:else if error}
				<div class="flex flex-col items-center justify-center py-16">
					<p class="text-red-400">{error}</p>
					<button
						onclick={extractFrame}
						class="mt-4 px-4 py-2 rounded-lg bg-surface-800 text-surface-200 hover:bg-surface-700 transition-colors"
					>
						Try Again
					</button>
				</div>
			{:else if originalFrame}
				<div class="relative rounded-xl overflow-hidden bg-surface-800">
					<img
						src={originalFrame}
						alt="Preview frame"
						class="w-full h-auto"
					/>
					<div class="absolute bottom-4 left-4 rounded-lg bg-black/70 px-3 py-1.5 text-sm font-medium text-white">
						Original Frame
					</div>
				</div>
				<p class="mt-4 text-sm text-surface-500 text-center">
					This preview shows a frame from your video. Actual compression results may vary based on video content and motion.
				</p>
			{/if}
		</div>

		<!-- Footer info -->
		<div class="border-t border-surface-700/50 bg-surface-900/50 px-6 py-4">
			<div class="flex items-center justify-between text-sm">
				<div class="text-surface-400">
					<span class="font-medium text-surface-300">{preset.label}</span> preset uses CRF {preset.crf} — {preset.desc.toLowerCase()}
				</div>
				<button
					onclick={onclose}
					class="px-4 py-2 rounded-lg bg-surface-800 text-surface-200 hover:bg-surface-700 transition-colors"
				>
					Close
				</button>
			</div>
		</div>
	</div>
</div>
