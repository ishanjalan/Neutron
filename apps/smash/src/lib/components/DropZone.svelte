<script lang="ts">
	import { DropZone as SharedDropZone } from '@neutron/ui';
	import { pdfs, TOOLS } from '$lib/stores/pdfs.svelte';
	import { FileText, Image } from 'lucide-svelte';

	interface Props {
		accept?: string;
		compact?: boolean;
		onfiles?: (files: File[]) => void;
	}

	let { accept, compact = false, onfiles }: Props = $props();

	const currentTool = $derived(TOOLS.find((t) => t.value === pdfs.settings.tool));
	const acceptedFormats = $derived(accept ?? currentTool?.accepts ?? '.pdf');
	const isImageTool = $derived(pdfs.settings.tool === 'images-to-pdf');
	const hasItems = $derived(pdfs.items.length > 0);

	const formatBadges = $derived(
		isImageTool
			? [
					{ name: 'JPG', color: 'from-orange-500 to-red-500' },
					{ name: 'PNG', color: 'from-green-500 to-emerald-500' },
					{ name: 'WebP', color: 'from-purple-500 to-pink-500' },
				]
			: [{ name: 'PDF', color: 'from-sky-500 to-cyan-500' }]
	);

	function handleFiles(files: File[]) {
		if (onfiles) {
			onfiles(files);
		} else {
			pdfs.addFiles(files);
		}
	}
</script>

{#snippet iconSnippet(isDragging: boolean)}
	{#if isImageTool}
		<Image
			class="text-accent-start h-10 w-10 transition-transform {isDragging ? 'scale-110' : ''}"
		/>
	{:else}
		<FileText
			class="text-accent-start h-10 w-10 transition-transform {isDragging ? 'scale-110' : ''}"
		/>
	{/if}
{/snippet}

<SharedDropZone
	accept={acceptedFormats}
	compact={compact || hasItems}
	onfiles={handleFiles}
	{formatBadges}
	title={isImageTool ? 'Drop images here' : 'Drop PDFs here'}
	subtitle="click to browse"
	compactLabel={isImageTool ? 'Add more files' : 'Add more files'}
	icon={iconSnippet}
/>
