<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
</script>

<div class="flex min-h-screen items-center justify-center bg-[#09090b]">
	<div class="text-center">
		<h1 class="text-6xl font-bold text-white">{$page.status}</h1>
		<p class="mt-3 text-lg text-gray-400">{$page.error?.message ?? 'Something went wrong'}</p>
		<a
			href={resolve('/')}
			class="mt-6 inline-block rounded-xl bg-orange-500/10 px-6 py-3 text-sm font-medium text-orange-400 transition hover:bg-orange-500/20"
		>
			Go home
		</a>
	</div>
</div>
