<script lang="ts">
	import { pdfs, TOOLS, type PDFTool } from '$lib/stores/pdfs.svelte';
	import {
		Minimize2,
		Layers,
		Scissors,
		Image,
		FileText,
		Lock,
		Unlock,
		FileSearch,
		Hash,
		Stamp,
		Tag,
		FileX,
		PenTool,
	} from 'lucide-svelte';

	const iconMap = {
		Minimize2,
		Layers,
		Scissors,
		Image,
		FileText,
		Lock,
		Unlock,
		FileSearch,
		Hash,
		Stamp,
		Tag,
		FileX,
		PenTool,
	};

	// Page-level operations are now direct thumbnail interactions — exclude from toolbar
	const PAGE_OPS = new Set(['rotate', 'delete-pages', 'reorder', 'reverse-pages']);

	const visibleTools = TOOLS.filter((t) => !PAGE_OPS.has(t.value));

	function getIcon(iconName: string) {
		return iconMap[iconName as keyof typeof iconMap] || FileText;
	}

	function handleToolSelect(tool: PDFTool) {
		pdfs.setTool(tool);
	}
</script>

<div class="flex h-full items-stretch gap-0.5 overflow-x-auto px-1">
	{#each visibleTools as tool, i (tool.value)}
		{@const Icon = getIcon(tool.icon)}
		{@const isActive = pdfs.settings.tool === tool.value}

		<!-- Separator before security and enhance groups -->
		{#if i > 0 && tool.category !== visibleTools[i - 1].category && (tool.category === 'security' || tool.category === 'enhance')}
			<div class="bg-surface-700/40 mx-1 my-2.5 w-px flex-shrink-0"></div>
		{/if}

		<button
			onclick={() => handleToolSelect(tool.value)}
			title={tool.desc}
			class="relative flex flex-shrink-0 flex-col items-center justify-center gap-1 rounded-md px-3 py-1.5 transition-all
				{isActive
				? 'bg-surface-700 text-surface-50'
				: 'text-surface-500 hover:text-surface-200 hover:bg-surface-800/70'}"
		>
			{#if isActive}
				<div
					class="from-accent-start to-accent-end absolute inset-x-3 top-0 h-[2px] rounded-full bg-gradient-to-r"
				></div>
			{/if}
			<Icon class="h-[15px] w-[15px] flex-shrink-0" />
			<span class="line-clamp-2 w-14 text-center text-[10px] leading-tight font-medium"
				>{tool.label}</span
			>
		</button>
	{/each}
</div>
