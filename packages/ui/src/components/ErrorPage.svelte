<script lang="ts">
	interface Props {
		status: number;
		message?: string;
		homeHref: string;
		/** Tailwind bg color class, e.g. "bg-surface-950" */
		bgClass?: string;
		/** Tailwind accent color class for the button, e.g. "bg-sky-500/10 text-sky-400 hover:bg-sky-500/20" */
		accentClass?: string;
	}

	let {
		status,
		message = 'Something went wrong',
		homeHref,
		bgClass = 'bg-surface-950',
		accentClass = 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20',
	}: Props = $props();
</script>

<div class="flex min-h-screen items-center justify-center {bgClass}">
	<div class="text-center">
		<h1 class="text-surface-100 text-6xl font-bold">{status}</h1>
		<p class="text-surface-400 mt-3 text-lg">{message}</p>
		<a
			href={homeHref}
			class="mt-6 inline-block rounded-xl px-6 py-3 text-sm font-medium transition {accentClass}"
		>
			Go home
		</a>
	</div>
</div>
