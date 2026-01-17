<script lang="ts">
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	interface Props {
		value: number;
		duration?: number;
		format?: (n: number) => string;
	}

	const { value, duration = 500, format = (n: number) => Math.round(n).toString() }: Props = $props();

	const animatedValue = tweened(0, {
		duration: 500,
		easing: cubicOut
	});

	$effect(() => {
		animatedValue.set(value);
	});
</script>

<span class="tabular-nums">{format($animatedValue)}</span>
