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
			gradient: 'linear-gradient(to bottom right, rgb(16 185 129), rgb(20 184 166))',
			glow: '0 0 40px rgba(16, 185, 129, 0.4)',
			ring: 'ring-emerald-400/50',
		},
		{
			id: 'squash',
			name: 'Squash',
			tagline: 'Video Compressor',
			url: 'https://ishanjalan.github.io/Squash/',
			github: 'https://github.com/ishanjalan/Neutron/tree/main/apps/squash',
			icon: Film,
			gradient: 'linear-gradient(to bottom right, rgb(249 115 22), rgb(251 191 36))',
			glow: '0 0 40px rgba(249, 115, 22, 0.4)',
			ring: 'ring-orange-400/50',
		},
		{
			id: 'smash',
			name: 'Smash',
			tagline: 'PDF Toolkit',
			url: 'https://ishanjalan.github.io/Smash/',
			github: 'https://github.com/ishanjalan/Neutron/tree/main/apps/smash',
			icon: FileText,
			gradient: 'linear-gradient(to bottom right, rgb(14 165 233), rgb(34 211 238))',
			glow: '0 0 40px rgba(14, 165, 233, 0.4)',
			ring: 'ring-sky-400/50',
		},
		{
			id: 'swirl',
			name: 'Swirl',
			tagline: 'GIF Toolkit',
			url: 'https://ishanjalan.github.io/Swirl/',
			github: 'https://github.com/ishanjalan/Neutron/tree/main/apps/swirl',
			icon: Disc3,
			gradient: 'linear-gradient(to bottom right, rgb(217 70 239), rgb(244 114 182))',
			glow: '0 0 40px rgba(217, 70, 239, 0.4)',
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

<footer class="relative mt-auto overflow-hidden bg-gradient-to-b from-transparent to-black/20">
	<!-- Animated gradient border at top -->
	<div class="absolute inset-x-0 top-0 h-[2px]">
		<div
			class="via-surface-500 h-full w-full bg-gradient-to-r from-transparent to-transparent"
		></div>
		<div
			class="animate-shimmer absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
		></div>
	</div>

	<!-- Dramatic background glow -->
	<div class="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
		<div
			class="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full opacity-20 blur-[100px]"
			style="background: {currentAppData.gradient}"
		></div>
		<div
			class="absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-gradient-to-t from-purple-500 to-pink-500 opacity-15 blur-[100px]"
		></div>
	</div>

	<div class="relative mx-auto max-w-7xl px-6 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-28">
		<!-- Neutron Suite Section -->
		<div class="mb-12 text-center sm:mb-16 lg:mb-20">
			<div
				class="mb-10 inline-flex items-center gap-3 text-sm font-extrabold uppercase tracking-[0.2em] text-white/90 sm:text-base lg:mb-12"
			>
				<Sparkles class="h-5 w-5 animate-pulse text-amber-400 sm:h-6 sm:w-6" />
				<span>The Neutron Suite</span>
				<Sparkles class="h-5 w-5 animate-pulse text-amber-400 sm:h-6 sm:w-6" />
			</div>

			<!-- App Cards Grid -->
			<div class="grid grid-cols-2 gap-5 sm:grid-cols-4 sm:gap-6 lg:gap-10">
				{#each apps as app, i}
					{@const isCurrent = app.id === currentApp}
					{#if isCurrent}
						<!-- Current App - HERO CARD -->
						<div
							class="fade-in-up group relative overflow-hidden rounded-3xl p-[2px] shadow-2xl"
							style="background: {app.gradient}; box-shadow: {app.glow}; animation-delay: {i *
								100}ms"
						>
							<!-- Glow effect -->
							<div class="pointer-events-none absolute inset-0 opacity-50">
								<div
									class="absolute inset-0 opacity-30 blur-xl"
									style="background: {app.gradient}"
								></div>
							</div>

							<div
								class="relative flex min-h-[140px] flex-col items-center justify-center gap-4 rounded-3xl bg-black/40 px-5 py-7 backdrop-blur-xl sm:min-h-[180px] sm:gap-5 sm:py-9 lg:min-h-[220px] lg:gap-6 lg:py-12"
							>
								<!-- Animated gradient background -->
								<div class="absolute inset-0 overflow-hidden rounded-3xl">
									<div
										class="absolute inset-0 animate-pulse opacity-20"
										style="background: {app.gradient}"
									></div>
								</div>

								<!-- Icon with strong glow -->
								<div class="relative">
									<div
										class="absolute inset-0 animate-pulse rounded-2xl opacity-50 blur-2xl"
										style="background: {app.gradient}"
									></div>
									<div
										class="relative flex h-16 w-16 items-center justify-center rounded-2xl shadow-2xl sm:h-20 sm:w-20 lg:h-24 lg:w-24"
										style="background: {app.gradient}"
									>
										<svelte:component
											this={app.icon}
											class="h-8 w-8 text-white sm:h-10 sm:w-10 lg:h-12 lg:w-12"
										/>
									</div>
								</div>

								<!-- App name -->
								<div class="relative text-center">
									<span
										class="block text-base font-black uppercase tracking-wider text-white sm:text-lg lg:text-xl"
										>{app.name}</span
									>
								</div>

								<!-- Active indicator -->
								<div class="absolute right-4 top-4 flex items-center gap-2">
									<span
										class="hidden text-xs font-bold uppercase tracking-wider text-green-400 sm:block"
										>Active</span
									>
									<span class="relative flex h-3 w-3">
										<span
											class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
										></span>
										<span class="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
									</span>
								</div>
							</div>
						</div>
					{:else}
						<!-- Other Apps - Subdued Cards -->
						<a
							href={app.url}
							class="fade-in-up group relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:bg-white/10 hover:shadow-2xl active:scale-95"
							title="Visit {app.name}"
							style="animation-delay: {i * 100}ms"
						>
							<div
								class="flex min-h-[140px] flex-col items-center justify-center gap-4 px-5 py-7 sm:min-h-[180px] sm:gap-5 sm:py-9 lg:min-h-[220px] lg:gap-6 lg:py-12"
							>
								<!-- Icon -->
								<div
									class="hover-gradient flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 transition-all duration-500 group-hover:scale-110 sm:h-20 sm:w-20 lg:h-24 lg:w-24"
									style="--hover-gradient: {app.gradient}"
								>
									<svelte:component
										this={app.icon}
										class="h-8 w-8 text-white/40 transition-all duration-500 group-hover:text-white sm:h-10 sm:w-10 lg:h-12 lg:w-12"
									/>
								</div>

								<!-- App name -->
								<span
									class="block text-base font-black uppercase tracking-wider text-white/50 transition-all duration-500 group-hover:text-white sm:text-lg lg:text-xl"
									>{app.name}</span
								>
							</div>

							<!-- Hover glow -->
							<div
								class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
							>
								<div class="absolute inset-0 opacity-10" style="background: {app.gradient}"></div>
							</div>
						</a>
					{/if}
				{/each}
			</div>
		</div>

		<!-- Divider with gradient -->
		<div
			class="via-surface-500 mx-auto mb-10 h-px w-full max-w-4xl bg-gradient-to-r from-transparent to-transparent sm:mb-12 lg:mb-16"
		></div>

		<!-- Social Links & Info -->
		<div class="flex flex-col items-center gap-8 sm:gap-10 lg:gap-12">
			<!-- Privacy Badge -->
			<div
				class="inline-flex items-center gap-3 rounded-full bg-green-500/10 px-6 py-3 text-center ring-2 ring-green-500/30 backdrop-blur-sm transition-all duration-300 hover:bg-green-500/20 hover:ring-green-500/40 lg:px-8 lg:py-4"
			>
				<div class="relative flex h-6 w-6 shrink-0 items-center justify-center lg:h-7 lg:w-7">
					<Shield class="h-5 w-5 text-green-400 lg:h-6 lg:w-6" />
					<div class="absolute inset-0 animate-pulse rounded-full bg-green-400/30"></div>
				</div>
				<span class="text-base font-bold text-green-400 lg:text-lg">{privacyText}</span>
			</div>

			<!-- Social Links -->
			<div class="flex flex-wrap items-center justify-center gap-4 lg:gap-5">
				<a
					href={currentAppData.github}
					target="_blank"
					rel="noopener noreferrer"
					class="bg-surface-800/60 text-surface-300 ring-surface-700/50 hover:bg-surface-700 hover:ring-surface-600 group inline-flex items-center gap-3 rounded-full px-6 py-3 text-base font-semibold ring-2 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:text-white lg:px-8 lg:py-4 lg:text-lg"
				>
					<Github
						class="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110 lg:h-6 lg:w-6"
					/>
					<span class="whitespace-nowrap">View Source</span>
				</a>
				<a
					href="https://www.linkedin.com/in/ishanjalan93/"
					target="_blank"
					rel="noopener noreferrer"
					class="bg-surface-800/60 text-surface-300 ring-surface-700/50 group inline-flex items-center gap-3 rounded-full px-6 py-3 text-base font-semibold ring-2 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-sky-500/20 hover:text-sky-400 hover:ring-sky-500/40 lg:px-8 lg:py-4 lg:text-lg"
				>
					<Linkedin
						class="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110 lg:h-6 lg:w-6"
					/>
					<span class="whitespace-nowrap">Connect</span>
				</a>
				<a
					href="https://buymeacoffee.com/ishanjalan"
					target="_blank"
					rel="noopener noreferrer"
					class="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-6 py-3 text-base font-semibold text-amber-400 ring-2 ring-amber-500/40 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:from-amber-500/30 hover:to-orange-500/30 hover:ring-amber-500/60 lg:px-8 lg:py-4 lg:text-lg"
				>
					<Coffee
						class="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 lg:h-6 lg:w-6"
					/>
					<span class="whitespace-nowrap">Buy me a coffee</span>
				</a>
			</div>

			<!-- Made With Love -->
			<div
				class="text-surface-400 flex flex-wrap items-center justify-center gap-2 text-base lg:text-lg"
			>
				<span>Crafted with</span>
				<span class="relative inline-flex">
					<Heart class="animate-heartbeat h-5 w-5 fill-red-500 text-red-500 lg:h-6 lg:w-6" />
					<Heart
						class="animate-heartbeat-ping absolute inset-0 h-5 w-5 fill-red-500/50 text-red-500/50 lg:h-6 lg:w-6"
					/>
				</span>
				<span>by</span>
				<a
					href="https://github.com/ishanjalan"
					target="_blank"
					rel="noopener noreferrer"
					class="text-surface-200 font-bold transition-all duration-200 hover:text-white hover:underline hover:underline-offset-4"
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

	.hover-gradient:hover {
		background: var(--hover-gradient) !important;
	}
</style>
