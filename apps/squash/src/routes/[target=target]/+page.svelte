<script lang="ts">
	import SquashApp from '#lib/components/SquashApp.svelte';

	let { data } = $props();
</script>

<SquashApp target={data.target} />
