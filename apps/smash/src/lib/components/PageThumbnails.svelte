<script lang="ts">
	import { onMount } from 'svelte';
	import { GripVertical, Check, X } from 'lucide-svelte';
	import { generateThumbnail, getPageCount } from '$lib/utils/pdf';
	import * as pdfjsLib from 'pdfjs-dist';

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
		selectionMode = 'multiple'
	}: Props = $props();

	let thumbnails = $state<Array<{ pageNum: number; dataUrl: string }>>([]);
	let pageCount = $state(0);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let selection = $state<Set<number>>(new Set(selectedPages));
	let pageOrder = $state<number[]>([]);

	// Dragging state for reorder mode
	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	async function loadThumbnails() {
		isLoading = true;
		error = null;
		thumbnails = [];

		try {
			const arrayBuffer = await file.arrayBuffer();
			const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
			pageCount = pdf.numPages;
			pageOrder = Array.from({ length: pageCount }, (_, i) => i + 1);

			// Generate thumbnails for each page
			const scale = 0.3;
			for (let i = 1; i <= pageCount; i++) {
				const page = await pdf.getPage(i);
				const viewport = page.getViewport({ scale });

				const canvas = document.createElement('canvas');
				canvas.width = viewport.width;
				canvas.height = viewport.height;
				const ctx = canvas.getContext('2d');

				if (ctx) {
					await page.render({ canvasContext: ctx, viewport }).promise;
					const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
					thumbnails = [...thumbnails, { pageNum: i, dataUrl }];
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load thumbnails';
			console.error('Thumbnail error:', err);
		} finally {
			isLoading = false;
		}
	}

	function togglePage(pageNum: number) {
		if (selectionMode === 'reorder') return;

		const newSelection = new Set(selection);
		if (newSelection.has(pageNum)) {
			newSelection.delete(pageNum);
		} else {
			if (selectionMode === 'single') {
				newSelection.clear();
			}
			newSelection.add(pageNum);
		}
		selection = newSelection;
		onSelectionChange?.(Array.from(selection).sort((a, b) => a - b));
	}

	function selectAll() {
		selection = new Set(Array.from({ length: pageCount }, (_, i) => i + 1));
		onSelectionChange?.(Array.from(selection));
	}

	function selectNone() {
		selection = new Set();
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

	$effect(() => {
		loadThumbnails();
	});

	$effect(() => {
		selection = new Set(selectedPages);
	});
</script>

<div class="space-y-3">
	<!-- Header with selection controls -->
	{#if selectionMode === 'multiple' && pageCount > 0}
		<div class="flex items-center justify-between">
			<span class="text-sm text-surface-400">
				{selection.size} of {pageCount} pages selected
			</span>
			<div class="flex gap-2">
				<button
					onclick={selectAll}
					class="px-2 py-1 text-xs text-surface-400 hover:text-surface-200 bg-surface-800 rounded-lg transition-colors"
				>
					Select All
				</button>
				<button
					onclick={selectNone}
					class="px-2 py-1 text-xs text-surface-400 hover:text-surface-200 bg-surface-800 rounded-lg transition-colors"
				>
					Clear
				</button>
			</div>
		</div>
	{/if}

	<!-- Loading state -->
	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<div class="flex items-center gap-2 text-surface-500">
				<svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
					<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25" />
					<path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
				</svg>
				<span>Loading pages...</span>
			</div>
		</div>
	{/if}

	<!-- Error state -->
	{#if error}
		<div class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
			<p class="text-sm text-red-400">{error}</p>
		</div>
	{/if}

	<!-- Thumbnails grid -->
	{#if !isLoading && !error && thumbnails.length > 0}
		<div class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
			{#each selectionMode === 'reorder' ? pageOrder : thumbnails.map(t => t.pageNum) as pageNum, index}
				{@const thumb = thumbnails.find(t => t.pageNum === pageNum)}
				{#if thumb}
					<button
						class="group relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all
							{selection.has(pageNum)
								? 'border-accent-start ring-2 ring-accent-start/30'
								: 'border-surface-700 hover:border-surface-500'}
							{dragOverIndex === index ? 'border-accent-end scale-105' : ''}
							{selectionMode === 'reorder' ? 'cursor-grab active:cursor-grabbing' : ''}"
						onclick={() => togglePage(pageNum)}
						draggable={selectionMode === 'reorder'}
						ondragstart={() => handleDragStart(index)}
						ondragover={(e) => handleDragOver(e, index)}
						ondragend={handleDragEnd}
					>
						<img
							src={thumb.dataUrl}
							alt="Page {pageNum}"
							class="w-full h-full object-cover"
						/>

						<!-- Page number badge -->
						<div class="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-xs text-white font-medium">
							{pageNum}
						</div>

						<!-- Selection indicator -->
						{#if selectionMode !== 'reorder'}
							<div class="absolute top-1 left-1">
								{#if selection.has(pageNum)}
									<div class="w-5 h-5 bg-accent-start rounded flex items-center justify-center">
										<Check class="h-3 w-3 text-white" />
									</div>
								{:else}
									<div class="w-5 h-5 border-2 border-white/50 rounded group-hover:border-white transition-colors" />
								{/if}
							</div>
						{/if}

						<!-- Drag handle for reorder mode -->
						{#if selectionMode === 'reorder'}
							<div class="absolute top-1 left-1 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
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
		<div class="text-center py-8 text-surface-500">
			<p>No pages to display</p>
		</div>
	{/if}
</div>
