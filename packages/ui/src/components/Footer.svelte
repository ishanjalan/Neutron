<script lang="ts">
	import { Heart, Shield } from 'lucide-svelte';
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
					<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path
							d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
						/>
					</svg>
					<span>View Source</span>
				</a>
				<span class="text-surface-700">·</span>
				<a
					href="https://www.linkedin.com/in/ishanjalan93/"
					target="_blank"
					rel="noopener noreferrer"
					class="hover:text-surface-200 flex items-center gap-1.5 transition-colors"
				>
					<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path
							d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
						/>
					</svg>
					<span>LinkedIn</span>
				</a>
				<span class="text-surface-700">·</span>
				<a
					href="https://buymeacoffee.com/ishanjalan"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-1.5 transition-colors hover:text-amber-400"
				>
					<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path
							d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 01-1.157-.107c-.086-.01-.18-.025-.258-.036-.243-.036-.484-.08-.724-.13-.111-.027-.111-.185 0-.212h.005c.277-.06.557-.108.838-.147h.002c.131-.009.263-.032.394-.048a25.076 25.076 0 013.426-.12c.674.019 1.347.067 2.017.144l.228.031c.267.04.533.088.798.145.392.085.895.113 1.07.542.055.137.08.288.111.431l.319 1.484a.237.237 0 01-.199.284h-.003c-.037.006-.075.01-.112.015a36.704 36.704 0 01-4.743.295 37.059 37.059 0 01-4.699-.304c-.14-.017-.293-.042-.417-.06-.326-.048-.649-.108-.973-.161-.393-.065-.768-.032-1.123.161-.29.16-.527.404-.675.701-.154.316-.199.66-.267 1-.069.34-.176.707-.135 1.056.087.753.613 1.365 1.37 1.502a39.69 39.69 0 0011.343.376.483.483 0 01.535.53l-.071.697-1.018 9.907c-.041.41-.047.832-.125 1.237-.122.637-.553 1.028-1.182 1.171-.577.131-1.165.2-1.756.205-.656.004-1.31-.025-1.966-.022-.699.004-1.556-.06-2.095-.58-.475-.458-.54-1.174-.605-1.793l-.731-7.013-.322-3.094c-.037-.351-.286-.695-.678-.678-.336.015-.718.3-.678.679l.228 2.185.949 9.112c.147 1.344 1.174 2.068 2.446 2.272.742.12 1.503.144 2.257.156.966.016 1.942.053 2.892-.122 1.408-.258 2.465-1.198 2.616-2.657.34-3.332.683-6.663 1.024-9.995l.215-2.087a.484.484 0 01.39-.426c.402-.078.787-.212 1.074-.518.455-.488.546-1.124.385-1.766zm-1.478.772c-.145.137-.363.201-.578.233-2.416.359-4.866.54-7.308.46-1.748-.06-3.477-.254-5.207-.498-.17-.024-.353-.055-.47-.18-.22-.236-.111-.71-.054-.995.052-.26.152-.609.463-.646.484-.057 1.046.148 1.526.22.577.088 1.156.159 1.737.212 2.48.226 5.002.19 7.472-.14.45-.06.899-.13 1.345-.21.399-.072.84-.206 1.08.206.166.281.188.657.162.974a.544.544 0 01-.169.364zm-6.159 3.9c-.862.37-1.84.788-3.109.788a5.884 5.884 0 01-1.569-.217l.877 9.004c.065.78.717 1.38 1.5 1.38 0 0 1.243.065 1.658.065.447 0 1.786-.065 1.786-.065.783 0 1.434-.6 1.499-1.38l.94-9.95a3.996 3.996 0 00-1.322-.238c-.826 0-1.491.284-2.26.613z"
						/>
					</svg>
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
