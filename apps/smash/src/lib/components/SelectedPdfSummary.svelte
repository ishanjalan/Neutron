<script lang="ts">
	import { FileText, Trash2 } from 'lucide-svelte';
	import { formatBytes } from '#lib/stores/pdfs.svelte.ts';

	interface Props {
		file: File;
		thumbnail?: string;
		pageCount?: number;
		onremove: () => void;
	}

	let { file, thumbnail, pageCount, onremove }: Props = $props();
</script>

<div class="flex items-start gap-4">
	<div class="bg-surface-800 h-24 w-20 flex-shrink-0 overflow-hidden rounded-lg">
		{#if thumbnail}
			<img src={thumbnail} alt="" class="h-full w-full object-cover" />
		{:else}
			<div class="flex h-full w-full items-center justify-center">
				<FileText class="text-surface-500 h-10 w-10" />
			</div>
		{/if}
	</div>
	<div class="min-w-0 flex-1">
		<p class="text-surface-200 truncate font-medium">{file.name}</p>
		<p class="text-surface-500 mt-1 text-sm">
			{formatBytes(file.size)} • {pageCount} pages
		</p>
		<button
			onclick={onremove}
			class="mt-2 flex items-center gap-1 text-sm text-red-400 hover:text-red-300"
		>
			<Trash2 class="h-3 w-3" /> Remove
		</button>
	</div>
</div>
