<script lang="ts">
	export interface RelatedTool {
		label: string;
		href: string;
		description: string;
	}

	interface Props {
		tools: RelatedTool[];
	}

	let { tools }: Props = $props();
</script>

<section class="border-surface-800 mt-16 border-t pt-10 pb-2">
	<div class="mx-auto max-w-3xl px-4">
		<h2 class="text-surface-300 mb-5 text-base font-semibold">Related tools</h2>
		<ul class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			{#each tools as { label, href, description } (href)}
				<li>
					<a
						{href}
						class="border-surface-800 hover:border-surface-600 hover:bg-surface-900 block rounded-lg border p-4 transition-colors"
					>
						<span class="text-surface-200 block text-sm font-medium">{label}</span>
						<span class="text-surface-500 mt-0.5 block text-xs leading-relaxed">{description}</span>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</section>
