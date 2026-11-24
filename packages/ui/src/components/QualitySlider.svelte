<script lang="ts" module>
	export interface QualityStop {
		key: string;
		/** Short name shown on the slider, e.g. "Balanced". */
		label: string;
		/** One line on what to expect, shown under the slider. */
		hint: string;
	}

	export interface QualityEstimate {
		/** Predicted output size in bytes. */
		bytes: number;
		/** How much smaller than the original, 0–100, if known. */
		savedPercent: number | null;
	}
</script>

<script lang="ts">
	import { formatBytes } from '@neutron/utils';

	interface Props {
		stops: QualityStop[];
		/** Key of the selected stop. */
		value: string;
		onchange: (key: string) => void;
		/** Predicted size per stop key. Missing = not known (yet). */
		estimates?: Record<string, QualityEstimate | undefined>;
		/** What the estimate covers when it is not a single file, e.g. "for all 3 videos". */
		estimateScope?: string;
		/** True while estimates are still being worked out. */
		estimating?: boolean;
		disabled?: boolean;
		/** Why it is disabled, shown instead of the hint. */
		disabledNote?: string;
		/** Accessible name, also shown as the caption. */
		label?: string;
		/** Captions for the two ends of the slider. */
		ends?: [string, string];
	}

	let {
		stops,
		value,
		onchange,
		estimates = {},
		estimateScope,
		estimating = false,
		disabled = false,
		disabledNote,
		label = 'Quality',
		ends = ['Smaller file', 'Better quality'],
	}: Props = $props();

	const index = $derived(
		Math.max(
			0,
			stops.findIndex((s) => s.key === value)
		)
	);
	const current = $derived(stops[index]);
	const estimate = $derived(estimates[current.key]);

	const estimateText = $derived(
		estimate
			? `≈ ${formatBytes(estimate.bytes)}${
					estimate.savedPercent !== null && estimate.savedPercent > 0
						? ` · ${estimate.savedPercent}% smaller`
						: ''
				}`
			: ''
	);

	function handleInput(e: Event) {
		const next = stops[Number((e.currentTarget as HTMLInputElement).value)];
		if (next && next.key !== value) onchange(next.key);
	}
</script>

<div class="flex min-w-[16rem] flex-1 flex-col gap-1.5" class:opacity-60={disabled}>
	<div
		class="text-surface-500 flex items-baseline justify-between text-[10px] tracking-wider uppercase"
	>
		<span>{label}</span>
		<span class="hidden normal-case sm:inline">{ends[0]} → {ends[1]}</span>
	</div>

	<input
		type="range"
		min="0"
		max={stops.length - 1}
		step="1"
		value={index}
		{disabled}
		oninput={handleInput}
		aria-label={label}
		aria-valuetext="{current.label}{estimateText ? `, ${estimateText.replace('≈', 'about')}` : ''}"
		class="accent-accent-start h-2 w-full cursor-pointer disabled:cursor-not-allowed"
	/>

	<div class="text-surface-500 hidden justify-between text-xs sm:flex" aria-hidden="true">
		{#each stops as stop, i (stop.key)}
			<span class:text-surface-200={i === index} class:font-medium={i === index}>{stop.label}</span>
		{/each}
	</div>

	<p class="text-surface-300 flex flex-wrap items-baseline gap-x-2 text-sm" aria-live="polite">
		<span class="text-surface-100 font-medium">{current.label}</span>
		{#if disabled && disabledNote}
			<span class="text-surface-500 text-xs">{disabledNote}</span>
		{:else}
			<span class="text-surface-400 text-xs">{current.hint}</span>
			{#if estimateText}
				<span class="text-accent-readable font-mono text-xs"
					>{estimateText}{estimateScope ? ` ${estimateScope}` : ''}</span
				>
			{:else if estimating}
				<span class="text-surface-500 text-xs">Estimating size…</span>
			{/if}
		{/if}
	</p>
</div>
