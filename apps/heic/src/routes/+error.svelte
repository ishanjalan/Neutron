<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { ErrorPage } from '@neutron/ui';
</script>

<ErrorPage
	status={$page.status}
	message={$page.error?.message}
	homeHref={resolve('/')}
	accentClass="bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
/>
