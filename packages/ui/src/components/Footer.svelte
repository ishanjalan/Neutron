<script lang="ts">
	import { Heart, Github, Shield, Image, Film, FileText, Disc3, ExternalLink } from 'lucide-svelte';

	type AppName = 'squish' | 'squash' | 'smash' | 'swirl';

	interface App {
		id: AppName;
		name: string;
		tagline: string;
		url: string;
		github: string;
		icon: typeof Image;
		color: string;
		hoverBg: string;
	}

	const apps: App[] = [
		{
			id: 'squish',
			name: 'Squish',
			tagline: 'Images',
			url: 'https://ishanjalan.github.io/ImageOptimser/',
			github: 'https://github.com/ishanjalan/ImageOptimser',
			icon: Image,
			color: 'text-emerald-400',
			hoverBg: 'hover:bg-emerald-500/10'
		},
		{
			id: 'squash',
			name: 'Squash',
			tagline: 'Videos',
			url: 'https://ishanjalan.github.io/Squash/',
			github: 'https://github.com/ishanjalan/Squash',
			icon: Film,
			color: 'text-orange-400',
			hoverBg: 'hover:bg-orange-500/10'
		},
		{
			id: 'smash',
			name: 'Smash',
			tagline: 'PDFs',
			url: 'https://ishanjalan.github.io/Smash/',
			github: 'https://github.com/ishanjalan/Smash',
			icon: FileText,
			color: 'text-sky-400',
			hoverBg: 'hover:bg-sky-500/10'
		},
		{
			id: 'swirl',
			name: 'Swirl',
			tagline: 'GIFs',
			url: 'https://ishanjalan.github.io/Swirl/',
			github: 'https://github.com/ishanjalan/Swirl',
			icon: Disc3,
			color: 'text-fuchsia-400',
			hoverBg: 'hover:bg-fuchsia-500/10'
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
</script>

<footer class="mt-auto py-8 pb-6">
	<div class="mx-auto max-w-5xl px-6">
		<!-- App Switcher - Compact pill design -->
		<div class="flex items-center justify-center mb-6">
			<div class="inline-flex items-center gap-1 rounded-full bg-surface-800/40 p-1 backdrop-blur-sm">
				{#each apps as app}
					{@const isCurrent = app.id === currentApp}
					{#if isCurrent}
						<span
							class="flex items-center gap-2 rounded-full bg-surface-700/80 px-4 py-2 text-sm font-medium {app.color}"
						>
							<svelte:component this={app.icon} class="h-4 w-4" />
							<span>{app.name}</span>
						</span>
					{:else}
						<a
							href={app.url}
							class="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-surface-500 transition-all {app.hoverBg} hover:{app.color}"
							title="{app.name} — {app.tagline}"
						>
							<svelte:component this={app.icon} class="h-4 w-4" />
							<span>{app.name}</span>
						</a>
					{/if}
				{/each}
			</div>
		</div>

		<!-- Bottom row - minimal info -->
		<div class="flex flex-col items-center gap-3 text-xs text-surface-500">
			<div class="flex items-center gap-4">
				<span class="flex items-center gap-1.5">
					<Shield class="h-3.5 w-3.5 text-green-500/70" />
					<span>100% Private</span>
				</span>
				<span class="text-surface-700">·</span>
				<a
					href={currentAppData.github}
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-1.5 transition-colors hover:text-surface-300"
				>
					<Github class="h-3.5 w-3.5" />
					<span>GitHub</span>
				</a>
				<span class="text-surface-700">·</span>
				<span class="flex items-center gap-1">
					<span>Made with</span>
					<Heart class="h-3 w-3 text-red-500/80 fill-red-500/80" />
					<span>by</span>
					<a
						href="https://github.com/ishanjalan"
						target="_blank"
						rel="noopener noreferrer"
						class="hover:text-surface-300 transition-colors"
					>
						Ishan
					</a>
				</span>
			</div>
		</div>
	</div>
</footer>
