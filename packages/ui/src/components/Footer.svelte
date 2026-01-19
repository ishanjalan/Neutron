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
		tagline: string;
		url: string;
		github: string;
		icon: typeof Image;
		gradient: string;
		accentColor: string;
	}

	const apps: App[] = [
		{
			id: 'squish',
			name: 'Squish',
			tagline: 'Image Compressor',
			url: 'https://ishanjalan.github.io/ImageOptimser/',
			github: 'https://github.com/ishanjalan/Neutron/tree/main/apps/squish',
			icon: Image,
			gradient: 'linear-gradient(135deg, rgb(16 185 129), rgb(20 184 166))',
			accentColor: 'rgb(16 185 129)',
		},
		{
			id: 'squash',
			name: 'Squash',
			tagline: 'Video Compressor',
			url: 'https://ishanjalan.github.io/Squash/',
			github: 'https://github.com/ishanjalan/Neutron/tree/main/apps/squash',
			icon: Film,
			gradient: 'linear-gradient(135deg, rgb(249 115 22), rgb(251 191 36))',
			accentColor: 'rgb(249 115 22)',
		},
		{
			id: 'smash',
			name: 'Smash',
			tagline: 'PDF Toolkit',
			url: 'https://ishanjalan.github.io/Smash/',
			github: 'https://github.com/ishanjalan/Neutron/tree/main/apps/smash',
			icon: FileText,
			gradient: 'linear-gradient(135deg, rgb(14 165 233), rgb(34 211 238))',
			accentColor: 'rgb(14 165 233)',
		},
		{
			id: 'swirl',
			name: 'Swirl',
			tagline: 'GIF Toolkit',
			url: 'https://ishanjalan.github.io/Swirl/',
			github: 'https://github.com/ishanjalan/Neutron/tree/main/apps/swirl',
			icon: Disc3,
			gradient: 'linear-gradient(135deg, rgb(217 70 239), rgb(244 114 182))',
			accentColor: 'rgb(217 70 239)',
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

<footer class="relative mt-24 overflow-hidden border-t border-white/5 bg-black/40 backdrop-blur-xl">
	<!-- Subtle background decoration -->
	<div class="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
		<div
			class="absolute -bottom-20 left-1/4 h-64 w-64 rounded-full blur-[120px]"
			style="background: {currentAppData.gradient}"
		></div>
	</div>

	<div class="relative mx-auto max-w-7xl px-6 py-16 lg:px-8">
		<!-- Neutron Suite Header -->
		<div class="mb-12 text-center">
			<div
				class="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60"
			>
				<Sparkles class="h-4 w-4 text-amber-400" />
				The Neutron Suite
				<Sparkles class="h-4 w-4 text-amber-400" />
			</div>

			<!-- App Cards Grid -->
			<div class="mx-auto grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
				{#each apps as app}
					{@const isCurrent = app.id === currentApp}
					{#if isCurrent}
						<!-- Current App -->
						<div
							class="group relative overflow-hidden rounded-2xl p-[1px]"
							style="background: {app.gradient}"
						>
							<div
								class="relative flex flex-col items-center gap-3 rounded-2xl bg-black/60 px-4 py-8 backdrop-blur-sm"
							>
								<!-- Icon -->
								<div
									class="flex h-14 w-14 items-center justify-center rounded-xl md:h-16 md:w-16"
									style="background: {app.gradient}"
								>
									<svelte:component this={app.icon} class="h-7 w-7 text-white md:h-8 md:w-8" />
								</div>

								<!-- Name -->
								<span class="text-sm font-bold uppercase tracking-wide text-white md:text-base"
									>{app.name}</span
								>

								<!-- Active Badge -->
								<div
									class="absolute right-2 top-2 flex h-2 w-2 items-center justify-center md:right-3 md:top-3"
								>
									<span
										class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
									></span>
									<span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
								</div>
							</div>
						</div>
					{:else}
						<!-- Other Apps -->
						<a
							href={app.url}
							class="group relative overflow-hidden rounded-2xl bg-white/5 transition-all duration-300 hover:scale-[1.02] hover:bg-white/10 active:scale-95"
							title="Visit {app.name}"
						>
							<div class="flex flex-col items-center gap-3 px-4 py-8">
								<!-- Icon -->
								<div
									class="flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 transition-all duration-300 group-hover:scale-110 md:h-16 md:w-16"
									style="--hover-bg: {app.gradient}"
								>
									<svelte:component
										this={app.icon}
										class="h-7 w-7 text-white/40 transition-colors duration-300 group-hover:text-white md:h-8 md:w-8"
									/>
								</div>

								<!-- Name -->
								<span
									class="text-sm font-bold uppercase tracking-wide text-white/50 transition-colors duration-300 group-hover:text-white md:text-base"
									>{app.name}</span
								>
							</div>

							<!-- Hover overlay -->
							<div
								class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
							>
								<div class="absolute inset-0 opacity-5" style="background: {app.gradient}"></div>
							</div>
						</a>
					{/if}
				{/each}
			</div>
		</div>

		<!-- Divider -->
		<div
			class="my-12 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
		></div>

		<!-- Bottom Section -->
		<div class="flex flex-col items-center gap-8">
			<!-- Privacy Badge -->
			<div
				class="inline-flex items-center gap-2.5 rounded-full bg-green-500/10 px-5 py-2.5 ring-1 ring-green-500/20 transition-all duration-300 hover:bg-green-500/15 hover:ring-green-500/30"
			>
				<Shield class="h-4 w-4 text-green-400" />
				<span class="text-sm font-semibold text-green-400">{privacyText}</span>
			</div>

			<!-- Social Links -->
			<div class="flex flex-wrap items-center justify-center gap-3">
				<a
					href={currentAppData.github}
					target="_blank"
					rel="noopener noreferrer"
					class="group inline-flex items-center gap-2 rounded-full bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 ring-1 ring-white/10 transition-all duration-300 hover:bg-white/10 hover:text-white hover:ring-white/20"
				>
					<Github class="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
					<span>View Source</span>
				</a>
				<a
					href="https://www.linkedin.com/in/ishanjalan93/"
					target="_blank"
					rel="noopener noreferrer"
					class="group inline-flex items-center gap-2 rounded-full bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 ring-1 ring-white/10 transition-all duration-300 hover:bg-sky-500/20 hover:text-sky-400 hover:ring-sky-500/30"
				>
					<Linkedin class="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
					<span>Connect</span>
				</a>
				<a
					href="https://buymeacoffee.com/ishanjalan"
					target="_blank"
					rel="noopener noreferrer"
					class="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 px-5 py-2.5 text-sm font-medium text-amber-400 ring-1 ring-amber-500/30 transition-all duration-300 hover:from-amber-500/25 hover:to-orange-500/25 hover:ring-amber-500/40"
				>
					<Coffee
						class="h-4 w-4 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
					/>
					<span>Buy me a coffee</span>
				</a>
			</div>

			<!-- Made With Love -->
			<div class="flex items-center gap-2 text-sm text-white/50">
				<span>Crafted with</span>
				<Heart class="h-4 w-4 fill-red-500 text-red-500" />
				<span>by</span>
				<a
					href="https://github.com/ishanjalan"
					target="_blank"
					rel="noopener noreferrer"
					class="font-semibold text-white/70 transition-colors hover:text-white"
				>
					Ishan Jalan
				</a>
			</div>
		</div>
	</div>
</footer>

<style>
	.group:hover [style*='--hover-bg'] {
		background: var(--hover-bg);
	}
</style>
