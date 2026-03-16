<script lang="ts">
	interface Props {
		status: number;
		message?: string;
		homeHref: string;
		/** Tailwind bg color class, e.g. "bg-[#09090b]" */
		bgClass?: string;
		/** Tailwind accent color class for the button, e.g. "bg-sky-500/10 text-sky-400 hover:bg-sky-500/20" */
		accentClass?: string;
	}

	let {
		status,
		message = 'Something went wrong',
		homeHref,
		bgClass = 'bg-[#09090b]',
		accentClass = 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20',
	}: Props = $props();
</script>

<div class="flex min-h-screen items-center justify-center {bgClass}">
	<div class="text-center">
		<h1 class="text-6xl font-bold text-white">{status}</h1>
		<p class="mt-3 text-lg text-gray-400">{message}</p>
		<a
			href={homeHref}
			class="mt-6 inline-block rounded-xl px-6 py-3 text-sm font-medium transition {accentClass}"
		>
			Go home
		</a>
	</div>
</div>
