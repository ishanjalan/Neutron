<script lang="ts">
	import { images, formatBytes } from '$lib';
	import ImageCard from './ImageCard.svelte';
	import { flip } from 'svelte/animate';
	import { GripVertical, CheckSquare, Square, Download, Trash2 } from 'lucide-svelte';
	import { downloadAllAsZip, downloadImage } from '$lib/utils/download';
	import { toast } from '@neutron/ui';

	let draggedId = $state<string | null>(null);
	let dragOverId = $state<string | null>(null);
	let focusedIndex = $state<number | null>(null);
	let listRef: HTMLDivElement;

	const selectedCount = $derived(images.selectedIds.size);
	const hasSelection = $derived(selectedCount > 0);
	const allSelected = $derived(selectedCount === images.items.length && images.items.length > 0);

	// Get the currently focused item
	const focusedId = $derived(
		focusedIndex !== null && focusedIndex < images.items.length
			? images.items[focusedIndex].id
			: null
	);

	function handleKeydown(e: KeyboardEvent) {
		const itemCount = images.items.length;
		if (itemCount === 0) return;

		// Only handle navigation keys
		if (
			![
				'ArrowUp',
				'ArrowDown',
				'ArrowLeft',
				'ArrowRight',
				'Enter',
				'Delete',
				'Backspace',
				' ',
			].includes(e.key)
		) {
			return;
		}

		// Initialize focus if not set
		if (focusedIndex === null) {
			if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) {
				focusedIndex = 0;
				e.preventDefault();
				return;
			}
			return;
		}

		switch (e.key) {
			case 'ArrowDown':
			case 'ArrowRight':
				e.preventDefault();
				focusedIndex = Math.min(focusedIndex + 1, itemCount - 1);
				break;
			case 'ArrowUp':
			case 'ArrowLeft':
				e.preventDefault();
				focusedIndex = Math.max(focusedIndex - 1, 0);
				break;
			case 'Enter': {
				e.preventDefault();
				const item = images.items[focusedIndex];
				if (item && item.status === 'completed' && item.compressedBlob) {
					downloadImage(item);
					toast.success(`Downloaded ${item.name}`);
				}
				break;
			}
			case 'Delete':
			case 'Backspace': {
				e.preventDefault();
				const itemToRemove = images.items[focusedIndex];
				if (itemToRemove) {
					images.removeItem(itemToRemove.id);
					toast.info(`Removed ${itemToRemove.name}`);
					// Adjust focus after removal
					if (focusedIndex >= images.items.length) {
						focusedIndex = images.items.length > 0 ? images.items.length - 1 : null;
					}
				}
				break;
			}
			case ' ': {
				// Space to toggle selection
				e.preventDefault();
				const itemToSelect = images.items[focusedIndex];
				if (itemToSelect) {
					images.toggleSelection(itemToSelect.id);
				}
				break;
			}
		}
	}

	function handleFocus() {
		if (focusedIndex === null && images.items.length > 0) {
			focusedIndex = 0;
		}
	}

	function handleBlur(e: FocusEvent) {
		// Only clear focus if focus is leaving the list entirely
		if (listRef && !listRef.contains(e.relatedTarget as Node)) {
			focusedIndex = null;
		}
	}

	function handleCardFocus(index: number) {
		focusedIndex = index;
	}

	function handleSelectAll() {
		if (allSelected) {
			images.selectNone();
		} else {
			images.selectAll();
		}
	}

	async function handleDownloadSelected() {
		const selected = images
			.getSelectedItems()
			.filter((i) => i.status === 'completed' && i.compressedBlob);
		if (selected.length > 0) {
			await downloadAllAsZip(selected);
			const savedBytes = selected.reduce(
				(acc, i) => acc + (i.originalSize - (i.compressedSize || 0)),
				0
			);
			const savedFormatted = formatBytes(savedBytes);
			toast.success(
				`Downloaded ${selected.length} image${selected.length !== 1 ? 's' : ''} as ZIP (${savedFormatted} saved!)`
			);
		}
	}

	function handleRemoveSelected() {
		const count = selectedCount;
		images.removeSelected();
		toast.info(`Removed ${count} image${count !== 1 ? 's' : ''}`);
	}

	function handleDragStart(e: DragEvent, id: string) {
		draggedId = id;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', id);
		}
	}

	function handleDragEnd() {
		draggedId = null;
		dragOverId = null;
	}

	function handleDragOver(e: DragEvent, id: string) {
		e.preventDefault();
		if (draggedId && draggedId !== id) {
			dragOverId = id;
		}
	}

	function handleDragLeave() {
		dragOverId = null;
	}

	function handleDrop(e: DragEvent, targetId: string) {
		e.preventDefault();
		if (draggedId && draggedId !== targetId) {
			images.reorderItems(draggedId, targetId);
		}
		draggedId = null;
		dragOverId = null;
	}
</script>

<!-- Selection toolbar -->
{#if images.items.length > 1}
	<div class="mt-6 flex items-center justify-between gap-4 sm:mt-8">
		<button
			onclick={handleSelectAll}
			class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors {allSelected
				? 'text-accent-start bg-accent-start/10'
				: 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'}"
		>
			{#if allSelected}
				<CheckSquare class="h-4 w-4" />
			{:else}
				<Square class="h-4 w-4" />
			{/if}
			{allSelected ? 'Deselect All' : 'Select All'}
		</button>

		{#if hasSelection}
			<div class="flex items-center gap-2">
				<span class="text-surface-400 text-sm">
					{selectedCount} selected
				</span>
				<button
					onclick={handleDownloadSelected}
					class="bg-accent-start/10 text-accent-start hover:bg-accent-start/20 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
				>
					<Download class="h-4 w-4" />
					Download
				</button>
				<button
					onclick={handleRemoveSelected}
					class="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/20"
				>
					<Trash2 class="h-4 w-4" />
					Remove
				</button>
			</div>
		{/if}
	</div>
{/if}

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	bind:this={listRef}
	class="mt-4 grid grid-cols-1 gap-4 outline-none sm:mt-6 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4"
	tabindex="0"
	role="grid"
	aria-label="Image list - use arrow keys to navigate, Enter to download, Delete to remove, Space to select"
	onkeydown={handleKeydown}
	onfocus={handleFocus}
	onfocusout={handleBlur}
>
	{#each images.items as item, index (item.id)}
		<div
			class="relative {draggedId === item.id ? 'opacity-50' : ''} {dragOverId === item.id
				? 'ring-accent-start ring-offset-surface-900 rounded-2xl ring-2 ring-offset-2'
				: ''}"
			animate:flip={{ duration: 200 }}
			draggable="true"
			ondragstart={(e) => handleDragStart(e, item.id)}
			ondragend={handleDragEnd}
			ondragover={(e) => handleDragOver(e, item.id)}
			ondragleave={handleDragLeave}
			ondrop={(e) => handleDrop(e, item.id)}
			role="gridcell"
			tabindex="-1"
		>
			<!-- Drag handle indicator -->
			<div
				class="pointer-events-none absolute left-3 top-3 z-10 flex h-8 w-8 cursor-grab items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity active:cursor-grabbing group-hover:opacity-100"
			>
				<GripVertical class="h-4 w-4" />
			</div>
			<ImageCard
				{item}
				showSelectionMode={hasSelection}
				isFocused={focusedId === item.id}
				onFocus={() => handleCardFocus(index)}
			/>
		</div>
	{/each}
</div>

{#if images.items.length > 1}
	<p class="text-surface-400 mt-6 text-center text-sm">
		Drag to reorder • Arrow keys to navigate • Enter to download • Delete to remove • Space to
		select
	</p>
{/if}
