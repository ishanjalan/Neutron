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
	} from 'lucide-svelte';

	const iconMap = {
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
	};

	function getIcon(iconName: string) {
		return iconMap[iconName as keyof typeof iconMap] || FileText;
	}

	function handleToolSelect(tool: PDFTool) {
		pdfs.setTool(tool);
	}

	// Group tools by category for visual separators
	const grouped = [
		{ id: 'core', tools: TOOLS.filter((t) => t.category === 'core') },
		{ id: 'pages', tools: TOOLS.filter((t) => t.category === 'pages') },
		{ id: 'convert', tools: TOOLS.filter((t) => t.category === 'convert') },
		{ id: 'security', tools: TOOLS.filter((t) => t.category === 'security') },
		{ id: 'enhance', tools: TOOLS.filter((t) => t.category === 'enhance') },
	] as const;
</script>

<div class="bg-surface-900/90 flex h-full items-stretch overflow-x-auto px-2">
	{#each grouped as group, gi (group.id)}
		{#if gi > 0}
			<div class="bg-surface-700/50 my-2 mx-1 w-px flex-shrink-0"></div>
		{/if}
		{#each group.tools as tool (tool.value)}
			{@const Icon = getIcon(tool.icon)}
			{@const isActive = pdfs.settings.tool === tool.value}
			<button
				onclick={() => handleToolSelect(tool.value)}
				title={tool.desc}
				class="relative flex flex-shrink-0 flex-col items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 transition-all
					{isActive
					? 'from-accent-start/20 to-accent-end/20 text-accent-start bg-gradient-to-b'
					: 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'}"
			>
				{#if isActive}
					<div class="from-accent-start to-accent-end absolute inset-x-2 top-0 h-0.5 rounded-full bg-gradient-to-r"></div>
				{/if}
				<Icon class="h-4 w-4 flex-shrink-0" />
				<span class="text-[10px] font-medium leading-none whitespace-nowrap">{tool.label}</span>
			</button>
		{/each}
	{/each}
</div>
