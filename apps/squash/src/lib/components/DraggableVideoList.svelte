<script lang="ts">
	import { videos, type VideoItem } from '$lib/stores/videos.svelte';
	import VideoCard from './VideoCard.svelte';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';

	let draggedItem: VideoItem | null = $state(null);
	let dragOverIndex: number | null = $state(null);

	function handleDragStart(e: DragEvent, item: VideoItem, index: number) {
		draggedItem = item;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', item.id);
		}
		// Add a slight delay before showing drag state
		setTimeout(() => {
			const target = e.target as HTMLElement;
			target.classList.add('opacity-50', 'scale-95');
		}, 0);
	}

	function handleDragEnd(e: DragEvent) {
		draggedItem = null;
		dragOverIndex = null;
		const target = e.target as HTMLElement;
		target.classList.remove('opacity-50', 'scale-95');
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (!draggedItem) return;
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		dragOverIndex = index;
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	function handleDrop(e: DragEvent, toIndex: number) {
		e.preventDefault();
		if (!draggedItem) return;

		const fromIndex = videos.items.findIndex((i) => i.id === draggedItem!.id);
		if (fromIndex !== -1 && fromIndex !== toIndex) {
			videos.reorderItems(fromIndex, toIndex);
		}

		draggedItem = null;
		dragOverIndex = null;
	}

	// Touch support for mobile drag and drop
	let touchStartY = 0;
	let touchedItem: VideoItem | null = null;

	function handleTouchStart(e: TouchEvent, item: VideoItem) {
		touchStartY = e.touches[0].clientY;
		touchedItem = item;
	}

	function handleTouchMove(e: TouchEvent) {
		if (!touchedItem) return;
		// Could implement visual feedback here
	}

	function handleTouchEnd() {
		touchedItem = null;
	}
</script>

<div class="mt-6 sm:mt-8">
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-lg font-semibold text-surface-200">
			Videos
			<span class="text-surface-500 font-normal">({videos.items.length})</span>
		</h2>
		<p class="text-xs text-surface-500">
			Drag to reorder • Processing order: top to bottom
		</p>
	</div>

	<div class="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
		{#each videos.items as item, index (item.id)}
			<div
				class="relative transition-transform duration-200 {dragOverIndex === index &&
				draggedItem?.id !== item.id
					? 'translate-y-2 opacity-70'
					: ''}"
				draggable={item.status !== 'processing'}
				ondragstart={(e) => handleDragStart(e, item, index)}
				ondragend={handleDragEnd}
				ondragover={(e) => handleDragOver(e, index)}
				ondragleave={handleDragLeave}
				ondrop={(e) => handleDrop(e, index)}
				ontouchstart={(e) => handleTouchStart(e, item)}
				ontouchmove={handleTouchMove}
				ontouchend={handleTouchEnd}
				role="listitem"
				aria-label="Video item, drag to reorder"
				animate:flip={{ duration: 300 }}
			>
				<!-- Drop indicator -->
				{#if dragOverIndex === index && draggedItem?.id !== item.id}
					<div
						class="absolute -top-2 left-0 right-0 h-1 rounded-full bg-accent-start"
						transition:fade={{ duration: 150 }}
					></div>
				{/if}

				<VideoCard {item} />

				<!-- Queue position indicator -->
				{#if item.status === 'pending'}
					<div
						class="absolute -top-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface-700 text-xs font-bold text-surface-300 ring-2 ring-surface-900"
					>
						{index + 1}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
