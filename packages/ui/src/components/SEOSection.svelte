<script lang="ts">
	export interface FAQ {
		q: string;
		a: string;
	}

	interface Props {
		intro: string;
		faqs: FAQ[];
	}

	let { intro, faqs }: Props = $props();

	const jsonLd = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faqs.map(({ q, a }) => ({
			'@type': 'Question',
			name: q,
			acceptedAnswer: { '@type': 'Answer', text: a },
		})),
	});
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html `<script type="application/ld+json">${jsonLd}</` + 'script>'}
</svelte:head>

<section class="border-surface-800 mt-16 border-t pt-12 pb-8">
	<div class="mx-auto max-w-3xl px-4">
		<p class="text-surface-400 mb-10 leading-relaxed">{intro}</p>
		<h2 class="text-surface-300 mb-6 text-base font-semibold">Frequently asked questions</h2>
		<dl class="space-y-6">
			{#each faqs as { q, a } (q)}
				<div>
					<dt class="text-surface-300 mb-1 font-medium">{q}</dt>
					<dd class="text-surface-400 text-sm leading-relaxed">{a}</dd>
				</div>
			{/each}
		</dl>
	</div>
</section>
