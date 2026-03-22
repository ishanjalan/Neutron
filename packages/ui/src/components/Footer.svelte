<script lang="ts">
	import { Heart, Github, Shield, Linkedin, Coffee } from 'lucide-svelte';
	import { NEUTRON_APPS_LIST, type AppId } from '@neutron/utils/apps';

	let {
		currentApp,
		privacyText = 'Your files never leave your device',
	}: {
		currentApp: AppId;
		privacyText?: string;
	} = $props();

	const currentAppData = $derived(NEUTRON_APPS_LIST.find((app) => app.id === currentApp)!);
</script>

<footer class="border-surface-800/50 bg-surface-900/30 relative mt-16 border-t backdrop-blur-sm">
	<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- App links row -->
		<div class="mb-6 flex flex-wrap items-center justify-center gap-5 sm:gap-8">
			{#each NEUTRON_APPS_LIST as app (app.id)}
				{@const isCurrent = app.id === currentApp}
				{#if isCurrent}
					<span class="text-surface-100 flex items-center gap-2 text-sm font-semibold">
						<span class="h-2 w-2 flex-shrink-0 rounded-full" style="background: {app.gradient}"
						></span>
						{app.name}
					</span>
				{:else}
					<a
						href={app.url}
						class="text-surface-500 hover:text-surface-200 flex items-center gap-2 text-sm transition-colors"
						title="Visit {app.name}"
					>
						<span class="bg-surface-600 h-2 w-2 flex-shrink-0 rounded-full"></span>
						{app.name}
					</a>
				{/if}
			{/each}
		</div>

		<!-- Divider -->
		<div class="bg-surface-800/50 my-5 h-px"></div>

		<!-- Bottom section -->
		<div
			class="text-surface-500 flex flex-col items-center gap-4 text-xs sm:flex-row sm:justify-between"
		>
			<!-- Privacy badge -->
			<div class="flex items-center gap-1.5">
				<Shield class="h-3.5 w-3.5" strokeWidth={1.5} />
				<span>{privacyText}</span>
			</div>

			<!-- Social links -->
			<div class="flex items-center gap-3">
				<a
					href={currentAppData.github}
					target="_blank"
					rel="noopener noreferrer"
					class="hover:text-surface-200 flex items-center gap-1.5 transition-colors"
				>
					<Github class="h-3.5 w-3.5" strokeWidth={1.5} />
					<span>View Source</span>
				</a>
				<span class="text-surface-700">·</span>
				<a
					href="https://www.linkedin.com/in/ishanjalan93/"
					target="_blank"
					rel="noopener noreferrer"
					class="hover:text-surface-200 flex items-center gap-1.5 transition-colors"
				>
					<Linkedin class="h-3.5 w-3.5" strokeWidth={1.5} />
					<span>LinkedIn</span>
				</a>
				<span class="text-surface-700">·</span>
				<a
					href="https://buymeacoffee.com/ishanjalan"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-1.5 transition-colors hover:text-amber-400"
				>
					<Coffee class="h-3.5 w-3.5" strokeWidth={1.5} />
					<span>Buy me a coffee</span>
				</a>
			</div>

			<!-- Attribution -->
			<div class="flex items-center gap-1">
				<span>Crafted with</span>
				<Heart class="h-3 w-3 fill-red-500 text-red-500" />
				<span>by</span>
				<a
					href="https://github.com/ishanjalan"
					target="_blank"
					rel="noopener noreferrer"
					class="text-surface-400 hover:text-surface-100 font-medium transition-colors"
				>
					Ishan Jalan
				</a>
			</div>
		</div>
	</div>
</footer>
