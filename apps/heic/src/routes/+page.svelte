<script lang="ts">
	const squishHeicUrl = 'https://ishanjalan.github.io/Squish/heic';

	// Instant JS redirect for browsers that support it
	if (typeof window !== 'undefined') {
		window.location.replace(squishHeicUrl);
	}
</script>

<div
	class="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center"
	aria-live="polite"
>
	<p class="text-surface-300 text-lg">Redirecting to Squish...</p>
	<a
		href={squishHeicUrl}
		class="from-accent-start to-accent-end rounded-xl bg-gradient-to-r px-6 py-3 font-semibold text-white"
	>
		Go to HEIC Converter →
	</a>
</div>
