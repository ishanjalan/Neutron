<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
</script>

<div class="flex min-h-screen items-center justify-center bg-[#0a0e1a]">
	<div class="text-center">
		<h1 class="text-6xl font-bold text-white">{$page.status}</h1>
		<p class="mt-3 text-lg text-gray-400">{$page.error?.message ?? 'Something went wrong'}</p>
		<a
			href={resolve('/')}
			class="mt-6 inline-block rounded-xl bg-cyan-500/10 px-6 py-3 text-sm font-medium text-cyan-400 transition hover:bg-cyan-500/20"
		>
			Go home
		</a>
	</div>
</div>
