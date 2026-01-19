<script lang="ts">
	import {
		Heart,
		Github,
		Shield,
		Image,
		Film,
		FileText,
		Disc3,
		Coffee,
		Linkedin,
		Sparkles,
	} from 'lucide-svelte';

	type AppName = 'squish' | 'squash' | 'smash' | 'swirl';

	interface App {
		id: AppName;
		name: string;
		url: string;
		github: string;
		icon: typeof Image;
		gradient: string;
	}

	const apps: App[] = [
		{
			id: 'squish',
			name: 'Squish',
			url: 'https://ishanjalan.github.io/ImageOptimser/',
			github: 'https://github.com/ishanjalan/Neutron/tree/main/apps/squish',
			icon: Image,
			gradient: 'linear-gradient(135deg, rgb(16 185 129), rgb(20 184 166))',
		},
		{
			id: 'squash',
			name: 'Squash',
			url: 'https://ishanjalan.github.io/Squash/',
			github: 'https://github.com/ishanjalan/Neutron/tree/main/apps/squash',
			icon: Film,
			gradient: 'linear-gradient(135deg, rgb(249 115 22), rgb(251 191 36))',
		},
		{
			id: 'smash',
			name: 'Smash',
			url: 'https://ishanjalan.github.io/Smash/',
			github: 'https://github.com/ishanjalan/Neutron/tree/main/apps/smash',
			icon: FileText,
			gradient: 'linear-gradient(135deg, rgb(14 165 233), rgb(34 211 238))',
		},
		{
			id: 'swirl',
			name: 'Swirl',
			url: 'https://ishanjalan.github.io/Swirl/',
			github: 'https://github.com/ishanjalan/Neutron/tree/main/apps/swirl',
			icon: Disc3,
			gradient: 'linear-gradient(135deg, rgb(217 70 239), rgb(244 114 182))',
		},
	];

	let {
		currentApp,
		privacyText = 'Your files never leave your device',
	}: {
		currentApp: AppName;
		privacyText?: string;
	} = $props();

	const currentAppData = $derived(apps.find((app) => app.id === currentApp)!);
</script>

<footer class="relative mt-16 border-t border-white/5 bg-black/30 backdrop-blur-sm">
	<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
		<!-- Neutron Suite Header -->
		<div class="mb-10 text-center">
			<div
				class="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/50"
			>
				<Sparkles class="h-3.5 w-3.5 text-amber-400" />
				<span>The Neutron Suite</span>
				<Sparkles class="h-3.5 w-3.5 text-amber-400" />
			</div>

			<!-- App Cards - Always 4 columns -->
			<div class="grid grid-cols-4 gap-3 sm:gap-4">
				{#each apps as app}
					{@const isCurrent = app.id === currentApp}
					{#if isCurrent}
						<!-- Current App -->
						<div
							class="relative overflow-hidden rounded-xl p-px"
							style="background: {app.gradient}"
						>
							<div
								class="relative flex flex-col items-center gap-2 rounded-xl bg-black/70 px-3 py-5 backdrop-blur-sm sm:gap-3 sm:py-6"
							>
								<!-- Icon -->
								<div
									class="flex h-10 w-10 items-center justify-center rounded-lg sm:h-12 sm:w-12"
									style="background: {app.gradient}"
								>
									<svelte:component this={app.icon} class="h-5 w-5 text-white sm:h-6 sm:w-6" />
								</div>

								<!-- Name -->
								<span class="text-xs font-bold uppercase tracking-wide text-white sm:text-sm"
									>{app.name}</span
								>

								<!-- Active Badge -->
								<div
									class="absolute right-1.5 top-1.5 flex h-1.5 w-1.5 sm:right-2 sm:top-2 sm:h-2 sm:w-2"
								>
									<span
										class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
									></span>
									<span class="relative inline-flex h-full w-full rounded-full bg-green-500"></span>
								</div>
							</div>
						</div>
					{:else}
						<!-- Other Apps -->
						<a
							href={app.url}
							class="group relative overflow-hidden rounded-xl bg-white/5 transition-all duration-200 hover:scale-105 hover:bg-white/10 active:scale-95"
							title="Visit {app.name}"
						>
							<div class="flex flex-col items-center gap-2 px-3 py-5 sm:gap-3 sm:py-6">
								<!-- Icon -->
								<div
									class="hover-bg flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 transition-all duration-200 group-hover:scale-110 sm:h-12 sm:w-12"
									style="--hover-bg: {app.gradient}"
								>
									<svelte:component
										this={app.icon}
										class="h-5 w-5 text-white/40 transition-colors duration-200 group-hover:text-white sm:h-6 sm:w-6"
									/>
								</div>

								<!-- Name -->
								<span
									class="text-xs font-bold uppercase tracking-wide text-white/40 transition-colors duration-200 group-hover:text-white sm:text-sm"
									>{app.name}</span
								>
							</div>

							<!-- Hover overlay -->
							<div
								class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
							>
								<div class="absolute inset-0 opacity-5" style="background: {app.gradient}"></div>
							</div>
						</a>
					{/if}
				{/each}
			</div>
		</div>

		<!-- Divider -->
		<div class="my-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

		<!-- Bottom Section -->
		<div class="space-y-6 text-center">
			<!-- Privacy Badge -->
			<div
				class="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 ring-1 ring-green-500/20 transition-all duration-200 hover:bg-green-500/15"
			>
				<Shield class="h-3.5 w-3.5 text-green-400" />
				<span class="text-xs font-medium text-green-400 sm:text-sm">{privacyText}</span>
			</div>

			<!-- Social Links -->
			<div class="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
				<a
					href={currentAppData.github}
					target="_blank"
					rel="noopener noreferrer"
					class="group inline-flex items-center gap-1.5 rounded-full bg-white/5 px-4 py-2 text-xs font-medium text-white/70 ring-1 ring-white/10 transition-all duration-200 hover:bg-white/10 hover:text-white sm:text-sm"
				>
					<Github class="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />
					<span>View Source</span>
				</a>
				<a
					href="https://www.linkedin.com/in/ishanjalan93/"
					target="_blank"
					rel="noopener noreferrer"
					class="group inline-flex items-center gap-1.5 rounded-full bg-white/5 px-4 py-2 text-xs font-medium text-white/70 ring-1 ring-white/10 transition-all duration-200 hover:bg-sky-500/20 hover:text-sky-400 hover:ring-sky-500/30 sm:text-sm"
				>
					<Linkedin class="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />
					<span>Connect</span>
				</a>
				<a
					href="https://buymeacoffee.com/ishanjalan"
					target="_blank"
					rel="noopener noreferrer"
					class="group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 px-4 py-2 text-xs font-medium text-amber-400 ring-1 ring-amber-500/30 transition-all duration-200 hover:from-amber-500/25 hover:to-orange-500/25 sm:text-sm"
				>
					<Coffee
						class="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-12 group-hover:scale-110"
					/>
					<span>Buy me a coffee</span>
				</a>
			</div>

			<!-- Made With Love -->
			<div class="flex items-center justify-center gap-1.5 text-xs text-white/40 sm:text-sm">
				<span>Crafted with</span>
				<Heart class="h-3.5 w-3.5 fill-red-500 text-red-500" />
				<span>by</span>
				<a
					href="https://github.com/ishanjalan"
					target="_blank"
					rel="noopener noreferrer"
					class="font-medium text-white/60 transition-colors hover:text-white"
				>
					Ishan Jalan
				</a>
			</div>
		</div>
	</div>
</footer>

<style>
	.group:hover .hover-bg {
		background: var(--hover-bg);
	}
</style>
