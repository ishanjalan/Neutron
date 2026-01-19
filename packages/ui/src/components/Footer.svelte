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
		glow: string;
		ring: string;
	}

	const apps: App[] = [
		{
			id: 'squish',
			name: 'Squish',
			tagline: 'Image Compressor',
			url: 'https://ishanjalan.github.io/ImageOptimser/',
			github: 'https://github.com/ishanjalan/Neutron/tree/main/apps/squish',
			icon: Image,
			gradient: 'from-emerald-500 to-teal-400',
			glow: 'shadow-emerald-500/40',
			ring: 'ring-emerald-400/50',
		},
		{
			id: 'squash',
			name: 'Squash',
			tagline: 'Video Compressor',
			url: 'https://ishanjalan.github.io/Squash/',
			github: 'https://github.com/ishanjalan/Neutron/tree/main/apps/squash',
			icon: Film,
			gradient: 'from-orange-500 to-amber-400',
			glow: 'shadow-orange-500/40',
			ring: 'ring-orange-400/50',
		},
		{
			id: 'smash',
			name: 'Smash',
			tagline: 'PDF Toolkit',
			url: 'https://ishanjalan.github.io/Smash/',
			github: 'https://github.com/ishanjalan/Neutron/tree/main/apps/smash',
			icon: FileText,
			gradient: 'from-sky-500 to-cyan-400',
			glow: 'shadow-sky-500/40',
			ring: 'ring-sky-400/50',
		},
		{
			id: 'swirl',
			name: 'Swirl',
			tagline: 'GIF Toolkit',
			url: 'https://ishanjalan.github.io/Swirl/',
			github: 'https://github.com/ishanjalan/Neutron/tree/main/apps/swirl',
			icon: Disc3,
			gradient: 'from-fuchsia-500 to-pink-400',
			glow: 'shadow-fuchsia-500/40',
			ring: 'ring-fuchsia-400/50',
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

<footer class="border-surface-800/50 relative mt-auto overflow-hidden border-t">
	<!-- Animated gradient border at top -->
	<div class="absolute inset-x-0 top-0 h-px">
		<div
			class="via-surface-600/60 h-full w-full bg-gradient-to-r from-transparent to-transparent"
		></div>
		<div
			class="animate-shimmer absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
		></div>
	</div>

	<!-- Subtle background glow -->
	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		<div
			class="absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-gradient-to-t {currentAppData.gradient} opacity-[0.04] blur-3xl"
		></div>
		<div
			class="absolute -bottom-32 right-1/4 h-64 w-64 rounded-full bg-gradient-to-t from-purple-500 to-pink-400 opacity-[0.03] blur-3xl"
		></div>
	</div>

	<div class="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-24">
		<!-- Neutron Suite Section -->
		<div class="mb-10 text-center sm:mb-12 lg:mb-16">
			<div
				class="text-surface-300 mb-8 inline-flex items-center gap-3 text-sm font-bold uppercase tracking-widest"
			>
				<Sparkles class="h-5 w-5 animate-pulse text-amber-400" />
				<span>The Neutron Suite</span>
				<Sparkles class="h-5 w-5 animate-pulse text-amber-400" />
			</div>

			<!-- App Cards Grid -->
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6 lg:gap-8">
				{#each apps as app, i}
					{@const isCurrent = app.id === currentApp}
					{#if isCurrent}
						<!-- Current App - Highlighted Card -->
						<div
							class="fade-in-up group relative min-h-[110px] overflow-hidden rounded-2xl bg-gradient-to-br p-[1px] shadow-2xl sm:min-h-[160px] lg:min-h-[180px] {app.gradient} {app.glow}"
							style="animation-delay: {i * 75}ms"
						>
							<div
								class="bg-surface-900/95 relative flex h-full flex-col items-center justify-center gap-3 rounded-2xl px-4 py-5 backdrop-blur-xl sm:py-7 lg:gap-4 lg:py-8"
							>
								<div class="absolute inset-0 bg-gradient-to-br {app.gradient} opacity-[0.15]"></div>
								<div
									class="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-2xl sm:h-14 sm:w-14 lg:h-16 lg:w-16 {app.gradient} {app.glow}"
								>
									<svelte:component
										this={app.icon}
										class="h-6 w-6 text-white sm:h-7 sm:w-7 lg:h-8 lg:w-8"
									/>
								</div>
								<div class="relative w-full text-center">
									<span class="block text-sm font-bold text-white sm:text-base lg:text-lg"
										>{app.name}</span
									>
								</div>
								<span class="absolute right-3 top-3 flex h-2.5 w-2.5 lg:h-3 lg:w-3">
									<span
										class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
									></span>
									<span
										class="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500 lg:h-3 lg:w-3"
									></span>
								</span>
							</div>
						</div>
					{:else}
						<!-- Other Apps - Interactive Cards -->
						<a
							href={app.url}
							class="fade-in-up bg-surface-800/30 group relative min-h-[110px] overflow-hidden rounded-2xl p-[1px] transition-all duration-300 hover:scale-[1.05] hover:bg-gradient-to-br hover:shadow-2xl active:scale-[0.98] sm:min-h-[160px] lg:min-h-[180px] {app.gradient}"
							title={app.name}
							style="animation-delay: {i * 75}ms; --gradient-from: var(--tw-gradient-stops)"
						>
							<div
								class="bg-surface-900 group-hover:bg-surface-900/90 relative flex h-full flex-col items-center justify-center gap-3 rounded-2xl px-4 py-5 backdrop-blur-sm transition-all duration-300 sm:py-7 lg:gap-4 lg:py-8"
							>
								<div
									class="bg-surface-800 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:shadow-2xl sm:h-14 sm:w-14 lg:h-16 lg:w-16 group-hover:{app.gradient} group-hover:{app.glow}"
								>
									<svelte:component
										this={app.icon}
										class="text-surface-400 h-6 w-6 transition-colors duration-300 group-hover:text-white sm:h-7 sm:w-7 lg:h-8 lg:w-8"
									/>
								</div>
								<div class="w-full text-center">
									<span
										class="text-surface-300 block text-sm font-bold transition-colors duration-300 group-hover:text-white sm:text-base lg:text-lg"
										>{app.name}</span
									>
								</div>
							</div>
						</a>
					{/if}
				{/each}
			</div>
		</div>

		<!-- Divider with gradient -->
		<div
			class="via-surface-600/50 mx-auto mb-8 h-px w-full max-w-3xl bg-gradient-to-r from-transparent to-transparent sm:mb-10 lg:mb-12"
		></div>

		<!-- Social Links & Info -->
		<div class="flex flex-col items-center gap-6 sm:gap-7 lg:gap-10">
			<!-- Privacy Badge -->
			<div
				class="inline-flex items-center gap-2.5 rounded-full bg-green-500/10 px-5 py-2.5 text-center ring-1 ring-green-500/20 transition-all duration-300 hover:bg-green-500/15 hover:ring-green-500/30 lg:gap-3 lg:px-6 lg:py-3"
			>
				<div class="relative flex h-5 w-5 shrink-0 items-center justify-center lg:h-6 lg:w-6">
					<Shield class="h-4 w-4 text-green-400 lg:h-5 lg:w-5" />
					<div class="absolute inset-0 animate-pulse rounded-full bg-green-400/20"></div>
				</div>
				<span class="text-sm font-semibold text-green-400 lg:text-base">{privacyText}</span>
			</div>

			<!-- Social Links -->
			<div class="flex flex-wrap items-center justify-center gap-3 lg:gap-4">
				<a
					href={currentAppData.github}
					target="_blank"
					rel="noopener noreferrer"
					class="bg-surface-800/60 text-surface-400 ring-surface-700/50 hover:bg-surface-700 hover:ring-surface-600 group inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-medium ring-1 transition-all duration-300 hover:scale-105 hover:text-white lg:gap-3 lg:px-6 lg:py-3 lg:text-base"
				>
					<Github
						class="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110 lg:h-5 lg:w-5"
					/>
					<span class="whitespace-nowrap">View Source</span>
				</a>
				<a
					href="https://www.linkedin.com/in/ishanjalan93/"
					target="_blank"
					rel="noopener noreferrer"
					class="bg-surface-800/60 text-surface-400 ring-surface-700/50 group inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-medium ring-1 transition-all duration-300 hover:scale-105 hover:bg-sky-500/20 hover:text-sky-400 hover:ring-sky-500/30 lg:gap-3 lg:px-6 lg:py-3 lg:text-base"
				>
					<Linkedin
						class="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110 lg:h-5 lg:w-5"
					/>
					<span class="whitespace-nowrap">Connect</span>
				</a>
				<a
					href="https://buymeacoffee.com/ishanjalan"
					target="_blank"
					rel="noopener noreferrer"
					class="group inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-5 py-2.5 text-sm font-medium text-amber-400 ring-1 ring-amber-500/30 transition-all duration-300 hover:scale-105 hover:from-amber-500/30 hover:to-orange-500/30 hover:ring-amber-500/50 lg:gap-3 lg:px-6 lg:py-3 lg:text-base"
				>
					<Coffee
						class="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 lg:h-5 lg:w-5"
					/>
					<span class="whitespace-nowrap">Buy me a coffee</span>
				</a>
			</div>

			<!-- Made With Love -->
			<div
				class="text-surface-500 flex flex-wrap items-center justify-center gap-2 text-sm lg:text-base"
			>
				<span>Crafted with</span>
				<span class="relative inline-flex">
					<Heart class="animate-heartbeat h-4 w-4 fill-red-500 text-red-500 lg:h-5 lg:w-5" />
					<Heart
						class="animate-heartbeat-ping absolute inset-0 h-4 w-4 fill-red-500/50 text-red-500/50 lg:h-5 lg:w-5"
					/>
				</span>
				<span>by</span>
				<a
					href="https://github.com/ishanjalan"
					target="_blank"
					rel="noopener noreferrer"
					class="text-surface-300 font-semibold transition-all duration-200 hover:text-white hover:underline hover:underline-offset-4"
				>
					Ishan Jalan
				</a>
			</div>
		</div>
	</div>
</footer>

<style>
	@keyframes shimmer {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(100%);
		}
	}

	@keyframes heartbeat {
		0%,
		100% {
			transform: scale(1);
		}
		25% {
			transform: scale(1.2);
		}
		35% {
			transform: scale(1);
		}
		45% {
			transform: scale(1.1);
		}
		55% {
			transform: scale(1);
		}
	}

	@keyframes heartbeat-ping {
		0%,
		100% {
			transform: scale(1);
			opacity: 0.5;
		}
		25% {
			transform: scale(1.5);
			opacity: 0;
		}
		35% {
			transform: scale(1);
			opacity: 0.5;
		}
		45% {
			transform: scale(1.3);
			opacity: 0;
		}
		55% {
			transform: scale(1);
			opacity: 0.5;
		}
	}

	@keyframes fade-in-up {
		0% {
			opacity: 0;
			transform: translateY(10px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-shimmer {
		animation: shimmer 3s ease-in-out infinite;
	}

	.animate-heartbeat {
		animation: heartbeat 2s ease-in-out infinite;
	}

	.animate-heartbeat-ping {
		animation: heartbeat-ping 2s ease-in-out infinite;
	}

	.fade-in-up {
		animation: fade-in-up 0.6s ease-out backwards;
	}
</style>
