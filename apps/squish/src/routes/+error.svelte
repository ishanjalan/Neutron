<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { ErrorPage } from '@neutron/ui';
</script>

<ErrorPage
	status={$page.status}
	message={$page.error?.message}
	homeHref={resolve('/')}
	bgClass="bg-surface-950"
	accentClass="bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
/>
