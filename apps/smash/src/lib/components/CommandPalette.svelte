<script lang="ts">
	import { pdfs, TOOLS, type PDFTool } from '$lib/stores/pdfs.svelte';
	import {
		Minimize2,
		Layers,
		Scissors,
		RotateCw,
		Trash2,
		ArrowUpDown,
		Image,
		FileText,
		Lock,
		Unlock,
		FileSearch,
		Hash,
		Stamp,
		Tag,
		ArrowLeftRight,
		FileX,
		PenTool,
		Search,
		Download,
		X,
		Clock,
	} from 'lucide-svelte';
	import { fly, fade } from 'svelte/transition';
	import { tick } from 'svelte';

	interface Props {
		open: boolean;
		onClose: () => void;
		onDownload?: () => void;
		onClear?: () => void;
		onOpenFile?: () => void;
	}

	const { open, onClose, onDownload, onClear, onOpenFile }: Props = $props();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const TOOL_ICON_MAP: Record<string, any> = {
		Minimize2,
		Layers,
		Scissors,
		RotateCw,
		Trash2,
		ArrowUpDown,
		Image,
		FileText,
		Lock,
		Unlock,
		FileSearch,
		Hash,
		Stamp,
		Tag,
		ArrowLeftRight,
		FileX,
		PenTool,
	};

	interface PaletteItem {
		id: string;
		label: string;
		description?: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon: any;
		shortcut?: string;
		action: () => void;
		type: 'tool' | 'action';
	}

	let query = $state('');
	// eslint-disable-next-line svelte/prefer-writable-derived
	let selectedIndex = $state(0);
	let inputEl = $state<HTMLInputElement | null>(null);

	// Recent tools history (persisted in memory)
	let recentTools = $state<PDFTool[]>([]);

	const allItems = $derived<PaletteItem[]>([
		// Tools
		...TOOLS.map((t) => ({
			id: `tool-${t.value}`,
			label: t.label,
			description: t.desc,
			icon: TOOL_ICON_MAP[t.icon] ?? FileText,
			type: 'tool' as const,
			action: () => {
				pdfs.setTool(t.value);
				recentTools = [t.value, ...recentTools.filter((r) => r !== t.value)].slice(0, 5);
				onClose();
			},
		})),
		// Actions
		{
			id: 'action-open',
			label: 'Open File',
			description: 'Add a PDF to the workspace',
			icon: FileText,
			shortcut: '⌘O',
			type: 'action' as const,
			action: () => {
				onOpenFile?.();
				onClose();
			},
		},
		{
			id: 'action-download',
			label: 'Download',
			description: 'Download processed files',
			icon: Download,
			shortcut: '⌘S',
			type: 'action' as const,
			action: () => {
				onDownload?.();
				onClose();
			},
		},
		{
			id: 'action-clear',
			label: 'Clear All',
			description: 'Remove all files',
			icon: X,
			type: 'action' as const,
			action: () => {
				onClear?.();
				onClose();
			},
		},
	]);

	// Fuzzy match: return score (higher = better match)
	function fuzzyScore(str: string, q: string): number {
		if (!q) return 1;
		const lower = str.toLowerCase();
		const queryLower = q.toLowerCase();
		if (lower.includes(queryLower)) return 2;
		// Check if all query chars appear in order
		let qi = 0;
		for (const ch of lower) {
			if (ch === queryLower[qi]) qi++;
			if (qi === queryLower.length) return 1;
		}
		return 0;
	}

	const filteredItems = $derived.by(() => {
		if (!query.trim()) {
			// Show recent tools first, then all
			const recent = recentTools
				.map((t) => allItems.find((i) => i.id === `tool-${t}`))
				.filter(Boolean) as PaletteItem[];
			return recent.length > 0 ? recent : allItems.slice(0, 8);
		}

		return allItems
			.map((item) => ({
				item,
				score: Math.max(fuzzyScore(item.label, query), fuzzyScore(item.description ?? '', query)),
			}))
			.filter(({ score }) => score > 0)
			.sort((a, b) => b.score - a.score)
			.map(({ item }) => item);
	});

	$effect(() => {
		// Reset selection when filtered items change
		selectedIndex = 0;
	});

	$effect(() => {
		if (open) {
			tick().then(() => inputEl?.focus());
		} else {
			query = '';
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, filteredItems.length - 1);
			scrollItemIntoView();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
			scrollItemIntoView();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			filteredItems[selectedIndex]?.action();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
		}
	}

	function scrollItemIntoView() {
		// Let the browser handle scrolling inside the list
		tick().then(() => {
			const el = document.querySelector('[data-palette-item-active]');
			el?.scrollIntoView({ block: 'nearest' });
		});
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
		transition:fade={{ duration: 120 }}
	>
		<button
			class="fixed inset-0 cursor-default bg-black/60 backdrop-blur-sm"
			onclick={onClose}
			aria-label="Close command palette"
		></button>

		<!-- Palette panel -->
		<div
			class="bg-surface-900 border-surface-700 relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border shadow-2xl"
			transition:fly={{ y: -16, duration: 180 }}
		>
			<!-- Search input -->
			<div class="border-surface-800 flex items-center gap-3 border-b px-4 py-3">
				<Search class="text-surface-500 h-4 w-4 flex-shrink-0" />
				<input
					bind:this={inputEl}
					bind:value={query}
					placeholder="Search tools and actions…"
					class="text-surface-100 placeholder-surface-600 flex-1 bg-transparent text-sm outline-none"
				/>
				{#if query}
					<button onclick={() => (query = '')} class="text-surface-600 hover:text-surface-400">
						<X class="h-3.5 w-3.5" />
					</button>
				{:else}
					<kbd class="bg-surface-800 text-surface-500 rounded px-1.5 py-0.5 font-mono text-[10px]"
						>ESC</kbd
					>
				{/if}
			</div>

			<!-- Results list -->
			<div class="max-h-[360px] overflow-y-auto py-2">
				{#if filteredItems.length === 0}
					<div class="text-surface-600 py-8 text-center text-sm">No results for "{query}"</div>
				{:else}
					{#if !query.trim() && recentTools.length > 0}
						<div
							class="text-surface-600 flex items-center gap-1 px-4 pt-2 pb-1 text-[10px] font-semibold tracking-wider uppercase"
						>
							<Clock class="h-3 w-3" />
							Recent
						</div>
					{:else if !query.trim()}
						<div
							class="text-surface-600 px-4 pt-2 pb-1 text-[10px] font-semibold tracking-wider uppercase"
						>
							All Tools & Actions
						</div>
					{/if}

					{#each filteredItems as paletteItem, i (paletteItem.id)}
						{@const isActive = i === selectedIndex}
						{@const isCurrentTool =
							paletteItem.type === 'tool' &&
							pdfs.settings.tool === paletteItem.id.replace('tool-', '')}
						<button
							onclick={paletteItem.action}
							onmouseenter={() => (selectedIndex = i)}
							data-palette-item-active={isActive ? '' : undefined}
							class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors {isActive
								? 'bg-surface-800'
								: 'hover:bg-surface-800/50'}"
						>
							<div
								class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg {isCurrentTool
									? 'from-accent-start to-accent-end bg-gradient-to-br'
									: 'bg-surface-700/60'}"
							>
								<paletteItem.icon
									class="h-4 w-4 {isCurrentTool ? 'text-white' : 'text-surface-300'}"
								/>
							</div>
							<div class="min-w-0 flex-1">
								<div class="text-surface-200 text-sm font-medium">{paletteItem.label}</div>
								{#if paletteItem.description}
									<div class="text-surface-500 truncate text-xs">{paletteItem.description}</div>
								{/if}
							</div>
							{#if paletteItem.shortcut}
								<kbd
									class="bg-surface-800 text-surface-500 rounded px-1.5 py-0.5 font-mono text-[10px]"
								>
									{paletteItem.shortcut}
								</kbd>
							{/if}
							{#if isCurrentTool}
								<span class="text-accent-start text-[10px] font-medium">Active</span>
							{/if}
						</button>
					{/each}
				{/if}
			</div>

			<!-- Footer hint -->
			<div
				class="border-surface-800 text-surface-600 flex items-center gap-3 border-t px-4 py-2 text-[10px]"
			>
				<span>↑↓ navigate</span>
				<span>↵ select</span>
				<span>ESC close</span>
			</div>
		</div>
	</div>
{/if}
