<script lang="ts">
	import { pdfs } from '$lib/stores/pdfs.svelte';
	import PDFCard from './PDFCard.svelte';
	import { flip } from 'svelte/animate';

	// Allow reordering for merge and images-to-pdf
	const canReorder = $derived(
		pdfs.settings.tool === 'merge' || pdfs.settings.tool === 'images-to-pdf'
	);

</script>

{#if pdfs.items.length > 0}
	<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5">
		{#each pdfs.items as item, index (item.id)}
			<div animate:flip={{ duration: 200 }}>
				<PDFCard {item} {index} {canReorder} />
			</div>
		{/each}
	</div>
{/if}
