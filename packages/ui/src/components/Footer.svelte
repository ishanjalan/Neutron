<script lang="ts">
	import { Heart, Github, Shield, Image, Film, FileText, Disc3 } from 'lucide-svelte';

	type AppName = 'squish' | 'squash' | 'smash' | 'swirl';

	interface App {
		id: AppName;
		name: string;
		tagline: string;
		url: string;
		github: string;
		icon: typeof Image;
		gradientFrom: string;
		gradientTo: string;
		textColor: string;
	}

	const apps: App[] = [
		{
			id: 'squish',
			name: 'Squish',
			tagline: 'Image Compressor',
			url: 'https://ishanjalan.github.io/ImageOptimser/',
			github: 'https://github.com/ishanjalan/ImageOptimser',
			icon: Image,
			gradientFrom: 'from-emerald-500/10',
			gradientTo: 'to-cyan-500/10',
			textColor: 'text-emerald-400'
		},
		{
			id: 'squash',
			name: 'Squash',
			tagline: 'Video Compressor',
			url: 'https://ishanjalan.github.io/Squash/',
			github: 'https://github.com/ishanjalan/Squash',
			icon: Film,
			gradientFrom: 'from-orange-500/10',
			gradientTo: 'to-amber-500/10',
			textColor: 'text-orange-400'
		},
		{
			id: 'smash',
			name: 'Smash',
			tagline: 'PDF Toolkit',
			url: 'https://ishanjalan.github.io/Smash/',
			github: 'https://github.com/ishanjalan/Smash',
			icon: FileText,
			gradientFrom: 'from-cyan-500/10',
			gradientTo: 'to-blue-500/10',
			textColor: 'text-cyan-400'
		},
		{
			id: 'swirl',
			name: 'Swirl',
			tagline: 'GIF Toolkit',
			url: 'https://ishanjalan.github.io/Swirl/',
			github: 'https://github.com/ishanjalan/Swirl',
			icon: Disc3,
			gradientFrom: 'from-fuchsia-500/10',
			gradientTo: 'to-pink-500/10',
			textColor: 'text-fuchsia-400'
		}
	];

	let {
		currentApp,
		privacyText = 'Your files never leave your device'
	}: {
		currentApp: AppName;
		privacyText?: string;
	} = $props();

	const currentAppData = $derived(apps.find(app => app.id === currentApp)!);
	const siblingApps = $derived(apps.filter(app => app.id !== currentApp));
</script>

<footer class="mt-auto border-t border-surface-800/50 py-6">
	<div class="mx-auto max-w-6xl px-6">
		<div class="flex flex-col items-center gap-6">
			<!-- App Switcher -->
			<div class="flex flex-wrap items-center justify-center gap-2">
				{#each apps as app}
					{@const isCurrent = app.id === currentApp}
					{#if isCurrent}
						<span
							class="flex items-center gap-1.5 rounded-full bg-gradient-to-r {app.gradientFrom} {app.gradientTo} px-4 py-1.5 text-sm font-semibold {app.textColor} ring-1 ring-current/20"
						>
							<svelte:component this={app.icon} class="h-4 w-4" />
							<span>{app.name}</span>
						</span>
					{:else}
						<a
							href={app.url}
							class="flex items-center gap-1.5 rounded-full bg-surface-800/50 px-4 py-1.5 text-sm font-medium text-surface-400 transition-all hover:bg-gradient-to-r hover:{app.gradientFrom} hover:{app.gradientTo} hover:{app.textColor}"
						>
							<svelte:component this={app.icon} class="h-4 w-4" />
							<span>{app.name}</span>
						</a>
					{/if}
				{/each}
			</div>

			<!-- Info Row -->
			<div class="flex flex-col items-center gap-4 text-sm text-surface-500 sm:flex-row sm:gap-6">
				<!-- Privacy badge -->
				<div class="flex items-center gap-1.5">
					<Shield class="h-4 w-4 text-green-500" />
					<span>100% Private</span>
					<span class="hidden sm:inline text-surface-700">—</span>
					<span class="hidden sm:inline">{privacyText}</span>
				</div>

				<span class="hidden sm:inline text-surface-700">•</span>

				<!-- GitHub -->
				<a
					href={currentAppData.github}
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-1.5 transition-colors hover:text-surface-100"
				>
					<Github class="h-4 w-4" />
					<span>Source</span>
				</a>

				<span class="hidden sm:inline text-surface-700">•</span>

				<!-- Attribution -->
				<p class="flex items-center gap-1.5">
					<span>Made with</span>
					<Heart class="h-3.5 w-3.5 text-red-500 fill-red-500" />
					<span>by</span>
					<a
						href="https://github.com/ishanjalan"
						target="_blank"
						rel="noopener noreferrer"
						class="text-surface-400 hover:text-surface-200 transition-colors"
					>
						Ishan Jalan
					</a>
				</p>
			</div>
		</div>
	</div>
</footer>
