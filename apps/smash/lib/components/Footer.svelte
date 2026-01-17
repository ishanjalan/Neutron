<script lang="ts">
	import { Heart, ExternalLink, Image, Film, FileText } from 'lucide-svelte';
</script>

<footer class="mt-auto border-t border-surface-800/50 py-8 px-4 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-7xl">
		<div class="flex flex-col items-center gap-4">
			<!-- Sister Apps -->
			<div class="flex items-center gap-4 text-sm">
				<a
					href="https://ishanjalan.github.io/ImageOptimser/"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-1.5 text-surface-500 hover:text-purple-400 transition-colors"
					title="Squish - Image Compressor"
				>
					<Image class="h-4 w-4" />
					<span>Squish</span>
					<ExternalLink class="h-3 w-3" />
				</a>
				<span class="text-surface-700">•</span>
				<a
					href="https://ishanjalan.github.io/Squash/"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-1.5 text-surface-500 hover:text-orange-400 transition-colors"
					title="Squash - Video Compressor"
				>
					<Film class="h-4 w-4" />
					<span>Squash</span>
					<ExternalLink class="h-3 w-3" />
				</a>
				<span class="text-surface-700">•</span>
				<span class="flex items-center gap-1.5 text-accent-start font-medium">
					<FileText class="h-4 w-4" />
					<span>Smash</span>
				</span>
			</div>

			<!-- Attribution -->
			<p class="flex items-center gap-1.5 text-sm text-surface-500">
				Made with <Heart class="h-4 w-4 text-red-500" fill="currentColor" /> by
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
</footer>
