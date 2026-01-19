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
</script>

<footer class="mt-16 border-t border-white/5 bg-black/30 py-12">
	<div class="mx-auto max-w-6xl px-4 sm:px-6">
		<!-- Header -->
		<div class="mb-8 text-center">
			<div
				class="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/50"
			>
				<Sparkles class="h-3.5 w-3.5 text-amber-400" />
				<span>The Neutron Suite</span>
				<Sparkles class="h-3.5 w-3.5 text-amber-400" />
			</div>

			<!-- App Cards -->
			<div class="grid grid-cols-4 gap-3 sm:gap-4">
				<!-- Squish -->
				<a
					href="https://ishanjalan.github.io/Squish/"
					class="group relative overflow-hidden rounded-xl bg-white/5 transition-all duration-200 hover:scale-105 hover:bg-white/10"
				>
					<div class="flex flex-col items-center gap-2 px-3 py-5 sm:gap-3 sm:py-6">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 transition-all duration-200 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-emerald-500 group-hover:to-teal-500 sm:h-12 sm:w-12"
						>
							<Image
								class="h-5 w-5 text-white/40 transition-colors duration-200 group-hover:text-white sm:h-6 sm:w-6"
							/>
						</div>
						<span
							class="text-xs font-bold uppercase tracking-wide text-white/40 transition-colors duration-200 group-hover:text-white sm:text-sm"
							>Squish</span
						>
					</div>
				</a>

				<!-- Squash -->
				<a
					href="https://ishanjalan.github.io/Squash/"
					class="group relative overflow-hidden rounded-xl bg-white/5 transition-all duration-200 hover:scale-105 hover:bg-white/10"
				>
					<div class="flex flex-col items-center gap-2 px-3 py-5 sm:gap-3 sm:py-6">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 transition-all duration-200 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-orange-500 group-hover:to-amber-500 sm:h-12 sm:w-12"
						>
							<Film
								class="h-5 w-5 text-white/40 transition-colors duration-200 group-hover:text-white sm:h-6 sm:w-6"
							/>
						</div>
						<span
							class="text-xs font-bold uppercase tracking-wide text-white/40 transition-colors duration-200 group-hover:text-white sm:text-sm"
							>Squash</span
						>
					</div>
				</a>

				<!-- Smash -->
				<a
					href="https://ishanjalan.github.io/Smash/"
					class="group relative overflow-hidden rounded-xl bg-white/5 transition-all duration-200 hover:scale-105 hover:bg-white/10"
				>
					<div class="flex flex-col items-center gap-2 px-3 py-5 sm:gap-3 sm:py-6">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 transition-all duration-200 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-sky-500 group-hover:to-cyan-500 sm:h-12 sm:w-12"
						>
							<FileText
								class="h-5 w-5 text-white/40 transition-colors duration-200 group-hover:text-white sm:h-6 sm:w-6"
							/>
						</div>
						<span
							class="text-xs font-bold uppercase tracking-wide text-white/40 transition-colors duration-200 group-hover:text-white sm:text-sm"
							>Smash</span
						>
					</div>
				</a>

				<!-- Swirl - Current -->
				<div
					class="relative overflow-hidden rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 p-px"
				>
					<div
						class="relative flex flex-col items-center gap-2 rounded-xl bg-black/70 px-3 py-5 sm:gap-3 sm:py-6"
					>
						<div
							class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-pink-500 sm:h-12 sm:w-12"
						>
							<Disc3 class="h-5 w-5 text-white sm:h-6 sm:w-6" />
						</div>
						<span class="text-xs font-bold uppercase tracking-wide text-white sm:text-sm"
							>Swirl</span
						>
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
			</div>
		</div>

		<!-- Divider -->
		<div class="my-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

		<!-- Bottom Section -->
		<div class="space-y-6 text-center">
			<!-- Privacy -->
			<div
				class="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 ring-1 ring-green-500/20"
			>
				<Shield class="h-3.5 w-3.5 text-green-400" />
				<span class="text-xs font-medium text-green-400 sm:text-sm"
					>Your GIFs never leave your device</span
				>
			</div>

			<!-- Social Links -->
			<div class="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
				<a
					href="https://github.com/ishanjalan/Neutron/tree/main/apps/swirl"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-4 py-2 text-xs font-medium text-white/70 ring-1 ring-white/10 transition-all duration-200 hover:bg-white/10 hover:text-white sm:text-sm"
				>
					<Github class="h-3.5 w-3.5" />
					<span>View Source</span>
				</a>
				<a
					href="https://www.linkedin.com/in/ishanjalan93/"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-4 py-2 text-xs font-medium text-white/70 ring-1 ring-white/10 transition-all duration-200 hover:bg-sky-500/20 hover:text-sky-400 sm:text-sm"
				>
					<Linkedin class="h-3.5 w-3.5" />
					<span>Connect</span>
				</a>
				<a
					href="https://buymeacoffee.com/ishanjalan"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 px-4 py-2 text-xs font-medium text-amber-400 ring-1 ring-amber-500/30 transition-all duration-200 sm:text-sm"
				>
					<Coffee class="h-3.5 w-3.5" />
					<span>Buy me a coffee</span>
				</a>
			</div>

			<!-- Credits -->
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
