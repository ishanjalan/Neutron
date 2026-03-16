<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { ErrorPage } from '@neutron/ui';
</script>

<ErrorPage
	status={$page.status}
	message={$page.error?.message}
	homeHref={resolve('/')}
	accentClass="bg-fuchsia-500/10 text-fuchsia-400 hover:bg-fuchsia-500/20"
/>
