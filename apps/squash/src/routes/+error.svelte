<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { ErrorPage } from '@neutron/ui';
</script>

<ErrorPage
	status={$page.status}
	message={$page.error?.message}
	homeHref={resolve('/')}
	accentClass="bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
/>
