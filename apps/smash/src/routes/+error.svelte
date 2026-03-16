<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { ErrorPage } from '@neutron/ui';
</script>

<ErrorPage
	status={$page.status}
	message={$page.error?.message}
	homeHref={resolve('/')}
	accentClass="bg-sky-500/10 text-sky-400 hover:bg-sky-500/20"
/>
