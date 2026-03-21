<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { onMount, onDestroy } from 'svelte';
	import { GripVertical, Check, X } from 'lucide-svelte';
	import { renderAllPagesGS } from '$lib/utils/ghostscript';

	interface Props {
		file: File;
		selectedPages?: number[];
		onSelectionChange?: (pages: number[]) => void;
		onOrderChange?: (newOrder: number[]) => void;
		selectionMode?: 'single' | 'multiple' | 'reorder';
	}

	const {
		file,
		selectedPages = [],
		onSelectionChange,
		onOrderChange,
		selectionMode = 'multiple',
	}: Props = $props();

	// Parallel batch size — render 4 thumbnails at a time to balance speed vs memory
	const BATCH_SIZE = 4;

	let thumbnails = $state<Array<{ pageNum: number; dataUrl: string }>>([]);
	let pageCount = $state(0);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let selection = $derived.by(() => new SvelteSet(selectedPages));
	let pageOrder = $state<number[]>([]);

	// O(1) thumbnail lookup map — avoids O(n²) find() in the template
	const thumbnailMap = $derived.by(() => new Map(thumbnails.map((t) => [t.pageNum, t])));

	// Abort flag — set to true on unmount to stop in-progress renders
	let aborted = false;

	// Dragging state for reorder mode
	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	async function loadThumbnails() {
		isLoading = true;
		error = null;
		thumbnails = [];
		aborted = false;

		try {
			const arrayBuffer = await file.arrayBuffer();
			if (aborted) return;

			// Render all pages at 22 DPI (≈ scale 0.3) in one GhostPDL call
			const pngBuffers = await renderAllPagesGS(arrayBuffer, 22);
			if (aborted) return;

			pageCount = pngBuffers.length;
			pageOrder = Array.from({ length: pageCount }, (_, i) => i + 1);

			// Decode PNG buffers to dataURLs in batches
			for (let i = 0; i < pngBuffers.length; i += BATCH_SIZE) {
				if (aborted) break;

				const batchPngs = pngBuffers.slice(i, i + BATCH_SIZE);
				const results = await Promise.all(
					batchPngs.map(
						async (pngBuffer, j): Promise<{ pageNum: number; dataUrl: string } | null> => {
							if (aborted) return null;
							try {
								const bitmap = await createImageBitmap(
									new Blob([pngBuffer], { type: 'image/png' })
								);
								const canvas = document.createElement('canvas');
								canvas.width = bitmap.width;
								canvas.height = bitmap.height;
								const ctx = canvas.getContext('2d')!;
								ctx.drawImage(bitmap, 0, 0);
								bitmap.close();
								const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
								canvas.width = 0;
								canvas.height = 0;
								return { pageNum: i + j + 1, dataUrl };
							} catch (err) {
								console.error(`Failed to decode thumbnail for page ${i + j + 1}:`, err);
								return null;
							}
						}
					)
				);

				if (aborted) break;

				const valid = results.filter((r): r is { pageNum: number; dataUrl: string } => r !== null);
				thumbnails = [...thumbnails, ...valid];
			}
		} catch (err) {
			if (!aborted) {
				error = err instanceof Error ? err.message : 'Failed to load thumbnails';
				console.error('Thumbnail error:', err);
			}
		} finally {
			if (!aborted) isLoading = false;
		}
	}

	function togglePage(pageNum: number) {
		if (selectionMode === 'reorder') return;

		const newSelection = new SvelteSet(selection);
		if (newSelection.has(pageNum)) {
			newSelection.delete(pageNum);
		} else {
			if (selectionMode === 'single') {
				newSelection.clear();
			}
			newSelection.add(pageNum);
		}
		onSelectionChange?.(Array.from(newSelection).sort((a, b) => a - b));
	}

	function selectAll() {
		const all = Array.from({ length: pageCount }, (_, i) => i + 1);
		onSelectionChange?.(all);
	}

	function selectNone() {
		onSelectionChange?.([]);
	}

	function handleDragStart(index: number) {
		if (selectionMode !== 'reorder') return;
		draggedIndex = index;
	}

	function handleDragOver(e: DragEvent, index: number) {
		if (selectionMode !== 'reorder' || draggedIndex === null) return;
		e.preventDefault();
		dragOverIndex = index;
	}

	function handleDragEnd() {
		if (selectionMode !== 'reorder' || draggedIndex === null || dragOverIndex === null) {
			draggedIndex = null;
			dragOverIndex = null;
			return;
		}

		const newOrder = [...pageOrder];
		const [moved] = newOrder.splice(draggedIndex, 1);
		newOrder.splice(dragOverIndex, 0, moved);
		pageOrder = newOrder;
		onOrderChange?.(pageOrder);

		draggedIndex = null;
		dragOverIndex = null;
	}

	onDestroy(() => {
		aborted = true;
	});

	$effect(() => {
		loadThumbnails();
	});
</script>

<div class="space-y-3">
	<!-- Header with selection controls -->
	{#if selectionMode === 'multiple' && pageCount > 0}
		<div class="flex items-center justify-between">
			<span class="text-surface-400 text-sm">
				{selection.size} of {pageCount} pages selected
			</span>
			<div class="flex gap-2">
				<button
					onclick={selectAll}
					class="text-surface-400 hover:text-surface-200 bg-surface-800 rounded-lg px-2 py-1 text-xs transition-colors"
				>
					Select All
				</button>
				<button
					onclick={selectNone}
					class="text-surface-400 hover:text-surface-200 bg-surface-800 rounded-lg px-2 py-1 text-xs transition-colors"
				>
					Clear
				</button>
			</div>
		</div>
	{/if}

	<!-- Loading state -->
	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<div class="text-surface-500 flex items-center gap-2">
				<svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24">
					<circle
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
						fill="none"
						opacity="0.25"
					/>
					<path
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					/>
				</svg>
				<span
					>Loading pages{thumbnails.length > 0
						? ` (${thumbnails.length}/${pageCount})`
						: ''}...</span
				>
			</div>
		</div>
	{/if}

	<!-- Error state -->
	{#if error}
		<div class="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
			<p class="text-sm text-red-400">{error}</p>
		</div>
	{/if}

	<!-- Thumbnails grid — show progressively as batches complete -->
	{#if thumbnails.length > 0}
		<div class="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
			{#each selectionMode === 'reorder' ? pageOrder : thumbnails.map((t) => t.pageNum) as pageNum, index (pageNum)}
				{@const thumb = thumbnailMap.get(pageNum)}
				{#if thumb}
					<button
						class="group relative aspect-[3/4] overflow-hidden rounded-lg border-2 transition-all
							{selection.has(pageNum)
							? 'border-accent-start ring-accent-start/30 ring-2'
							: 'border-surface-700 hover:border-surface-500'}
							{dragOverIndex === index ? 'border-accent-end scale-105' : ''}
							{selectionMode === 'reorder' ? 'cursor-grab active:cursor-grabbing' : ''}"
						onclick={() => togglePage(pageNum)}
						draggable={selectionMode === 'reorder'}
						ondragstart={() => handleDragStart(index)}
						ondragover={(e) => handleDragOver(e, index)}
						ondragend={handleDragEnd}
					>
						<img src={thumb.dataUrl} alt="Page {pageNum}" class="h-full w-full object-cover" />

						<!-- Page number badge -->
						<div
							class="absolute right-1 bottom-1 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white"
						>
							{pageNum}
						</div>

						<!-- Selection indicator -->
						{#if selectionMode !== 'reorder'}
							<div class="absolute top-1 left-1">
								{#if selection.has(pageNum)}
									<div class="bg-accent-start flex h-5 w-5 items-center justify-center rounded">
										<Check class="h-3 w-3 text-white" />
									</div>
								{:else}
									<div
										class="h-5 w-5 rounded border-2 border-white/50 transition-colors group-hover:border-white"
									/>
								{/if}
							</div>
						{/if}

						<!-- Drag handle for reorder mode -->
						{#if selectionMode === 'reorder'}
							<div
								class="absolute top-1 left-1 rounded bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<GripVertical class="h-3 w-3 text-white" />
							</div>
						{/if}
					</button>
				{/if}
			{/each}
		</div>
	{/if}

	<!-- Empty state -->
	{#if !isLoading && !error && thumbnails.length === 0}
		<div class="text-surface-500 py-8 text-center">
			<p>No pages to display</p>
		</div>
	{/if}
</div>
