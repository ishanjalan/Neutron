<script lang="ts">
	import { DropZone as SharedDropZone } from '@neutron/ui';
	import { pdfs, TOOLS, formatBytes, LARGE_FILE_THRESHOLD_BYTES } from '$lib/stores/pdfs.svelte';
	import { FileText, Image, AlertTriangle } from 'lucide-svelte';

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
	const hasPendingLargeFiles = $derived(pdfs.pendingLargeFiles.length > 0);

	const formatBadges = $derived(
		isImageTool
			? [
					{ name: 'JPG', color: 'from-orange-500 to-red-500' },
					{ name: 'PNG', color: 'from-green-500 to-emerald-500' },
					{ name: 'WebP', color: 'from-purple-500 to-pink-500' },
				]
			: [{ name: 'PDF', color: 'from-sky-500 to-cyan-500' }]
	);

	async function handleFiles(files: File[]) {
		if (onfiles) {
			onfiles(files);
		} else {
			await pdfs.addFiles(files);
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

<!-- Large file confirmation warning -->
{#if hasPendingLargeFiles}
	<div class="border-amber-500/40 bg-amber-500/10 mb-3 rounded-xl border p-4">
		<div class="flex items-start gap-3">
			<AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
			<div class="flex-1 min-w-0">
				<p class="text-amber-300 mb-1 text-sm font-semibold">Large file detected</p>
				<div class="text-amber-400/80 mb-3 space-y-0.5 text-xs">
					{#each pdfs.pendingLargeFiles as f (f.name)}
						<p>{f.name} — {formatBytes(f.size)}</p>
					{/each}
				</div>
				<p class="text-amber-400/70 mb-3 text-xs">
					Files over {formatBytes(LARGE_FILE_THRESHOLD_BYTES)} may be slow to process or cause the
					browser to run out of memory.
				</p>
				<div class="flex gap-2">
					<button
						onclick={() => pdfs.confirmLargeFiles()}
						class="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-amber-400"
					>
						Continue anyway
					</button>
					<button
						onclick={() => pdfs.dismissLargeFiles()}
						class="text-amber-400 hover:text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

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
