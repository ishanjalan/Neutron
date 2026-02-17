<script lang="ts">
	import { images, type OutputFormat } from '$lib/stores/images.svelte';
	import { Sparkles, Check, Info } from 'lucide-svelte';
	import { fade, scale } from 'svelte/transition';

	let {
		item,
		onFormatSelect,
	}: {
		item: any;
		onFormatSelect: (format: OutputFormat) => void;
	} = $props();

	// Format recommendation logic based on source format and use case
	const recommendations = $derived(() => {
		const sourceFormat = item.format;

		// Base format options
		const formats: Array<{
			format: OutputFormat;
			label: string;
			score: number;
			pros: string[];
			cons: string[];
			savingsEstimate: string;
			color: string;
			recommended?: boolean;
		}> = [];

		// SVG sources
		if (sourceFormat === 'svg') {
			formats.push(
				{
					format: 'svg',
					label: 'SVG (Optimized)',
					score: 95,
					pros: ['Infinitely scalable', 'Tiny file size', 'SEO-friendly'],
					cons: ['Complex graphics can be large'],
					savingsEstimate: '~30-60%',
					color: 'from-cyan-500 to-blue-500',
					recommended: true,
				},
				{
					format: 'webp',
					label: 'WebP',
					score: 85,
					pros: ['Great for complex SVGs', '97% browser support', 'Predictable size'],
					cons: ['Not scalable', 'Loses editability'],
					savingsEstimate: '~50-80%',
					color: 'from-green-500 to-emerald-500',
				},
				{
					format: 'png',
					label: 'PNG',
					score: 70,
					pros: ['Universal support', 'Transparency'],
					cons: ['Larger than WebP', 'Not scalable'],
					savingsEstimate: '~40-70%',
					color: 'from-blue-500 to-indigo-500',
				}
			);
		}
		// JPEG sources
		else if (sourceFormat === 'jpeg') {
			formats.push(
				{
					format: 'webp',
					label: 'WebP',
					score: 95,
					pros: ['25-35% smaller', '97% browser support', 'Better quality'],
					cons: ['None for modern web'],
					savingsEstimate: '~25-50%',
					color: 'from-green-500 to-emerald-500',
					recommended: true,
				},
				{
					format: 'avif',
					label: 'AVIF',
					score: 90,
					pros: ['40% smaller than JPEG', 'Best compression', 'HDR support'],
					cons: ['95% browser support', 'Slower encoding'],
					savingsEstimate: '~40-60%',
					color: 'from-purple-500 to-pink-500',
				},
				{
					format: 'jxl',
					label: 'JPEG XL',
					score: 85,
					pros: ['30% smaller', 'Progressive', 'Best quality'],
					cons: ['Safari only', 'Limited support'],
					savingsEstimate: '~30-55%',
					color: 'from-amber-500 to-orange-500',
				}
			);
		}
		// PNG sources
		else if (sourceFormat === 'png') {
			formats.push(
				{
					format: 'webp',
					label: 'WebP',
					score: 95,
					pros: ['70% smaller for photos', 'Transparency', 'Universal'],
					cons: ['Graphics: PNG may be better'],
					savingsEstimate: '~50-80%',
					color: 'from-green-500 to-emerald-500',
					recommended: true,
				},
				{
					format: 'png',
					label: 'PNG (Optimized)',
					score: 90,
					pros: ['Best for graphics/text', 'Lossless', '100% support'],
					cons: ['Larger for photos'],
					savingsEstimate: '~20-40%',
					color: 'from-blue-500 to-indigo-500',
				},
				{
					format: 'avif',
					label: 'AVIF',
					score: 85,
					pros: ['80% smaller than PNG', 'Transparency', 'HDR support'],
					cons: ['Photos only', '95% support'],
					savingsEstimate: '~60-85%',
					color: 'from-purple-500 to-pink-500',
				}
			);
		}
		// WebP sources
		else if (sourceFormat === 'webp') {
			formats.push(
				{
					format: 'webp',
					label: 'WebP (Re-optimize)',
					score: 95,
					pros: ['Further compression', 'Same format', 'Fast'],
					cons: ['Diminishing returns'],
					savingsEstimate: '~10-25%',
					color: 'from-green-500 to-emerald-500',
					recommended: true,
				},
				{
					format: 'avif',
					label: 'AVIF',
					score: 88,
					pros: ['30% smaller than WebP', 'Better quality'],
					cons: ['Slower encoding'],
					savingsEstimate: '~20-40%',
					color: 'from-purple-500 to-pink-500',
				}
			);
		}
		// Default fallback
		else {
			formats.push({
				format: 'webp',
				label: 'WebP',
				score: 95,
				pros: ['Best balance', 'Universal support', 'Great compression'],
				cons: ['None for modern web'],
				savingsEstimate: '~40-70%',
				color: 'from-green-500 to-emerald-500',
				recommended: true,
			});
		}

		return formats.sort((a, b) => b.score - a.score);
	})();
</script>

<div class="space-y-3">
	<div class="mb-2 flex items-center gap-2">
		<Sparkles class="text-accent-start h-4 w-4" />
		<h3 class="text-surface-300 text-sm font-semibold uppercase tracking-wide">
			Recommended for You
		</h3>
	</div>

	{#each recommendations as rec (rec.format)}
		{@const isSelected = item.outputFormat === rec.format}
		{@const isRecommended = rec.recommended}

		<button
			onclick={() => onFormatSelect(rec.format)}
			class="group relative w-full overflow-hidden rounded-xl border-2 text-left transition-all {isSelected
				? 'border-accent-start bg-accent-start/10 shadow-accent-start/20 shadow-lg'
				: 'border-surface-700 bg-surface-800/30 hover:border-surface-600 hover:bg-surface-800/50'}"
		>
			{#if isRecommended && !isSelected}
				<div
					class="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-gradient-to-r {rec.color} px-2 py-0.5 text-[10px] font-bold text-white"
				>
					<Sparkles class="h-3 w-3" />
					BEST
				</div>
			{/if}

			{#if isSelected}
				<div
					class="bg-accent-start absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-white"
					in:scale={{ duration: 300 }}
				>
					<Check class="h-4 w-4" />
				</div>
			{/if}

			<div class="p-4">
				<!-- Header -->
				<div class="mb-2 flex items-baseline justify-between">
					<div class="flex items-baseline gap-2">
						<h4 class="text-surface-100 text-base font-bold">{rec.label}</h4>
						<span class="text-surface-500 text-xs">{rec.score}/100</span>
					</div>
					<span
						class="text-accent-start bg-accent-start/10 rounded-full px-2 py-0.5 text-xs font-semibold"
					>
						{rec.savingsEstimate}
					</span>
				</div>

				<!-- Pros -->
				<div class="mb-1 space-y-1">
					{#each rec.pros as pro}
						<p class="text-surface-400 flex items-start gap-1.5 text-xs">
							<span class="text-green-400">✓</span>
							{pro}
						</p>
					{/each}
				</div>

				<!-- Cons (if any) -->
				{#if rec.cons.length > 0}
					<div class="space-y-1">
						{#each rec.cons as con}
							<p class="text-surface-500 flex items-start gap-1.5 text-xs">
								<span class="text-amber-400">•</span>
								{con}
							</p>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Visual indicator bar -->
			<div
				class="h-1 w-full bg-gradient-to-r {rec.color} opacity-{isSelected ? '100' : '40'}"
			></div>
		</button>
	{/each}

	<div class="bg-surface-800/30 flex items-start gap-2 rounded-lg p-3">
		<Info class="text-surface-500 h-4 w-4 flex-shrink-0" />
		<p class="text-surface-500 text-xs">
			Estimates based on typical images. Actual savings vary by content complexity.
		</p>
	</div>
</div>
