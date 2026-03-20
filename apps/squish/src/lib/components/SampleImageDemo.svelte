<script lang="ts">
	import { images } from '$lib/stores/images.svelte';
	import { processImages } from '$lib/utils/compress';
	import { Image, FileImage, Palette, Sparkles } from 'lucide-svelte';
	import { scale, fly } from 'svelte/transition';

	// Sample images (using data URLs for instant demo)
	const samples = [
		{
			id: 'photo',
			name: 'Sample Photo',
			icon: Image,
			gradient: 'from-blue-500 to-purple-500',
			description: 'High-res photo',
			size: '2.4 MB → ~350 KB',
			savings: '~85%',
		},
		{
			id: 'logo',
			name: 'Logo SVG',
			icon: Sparkles,
			gradient: 'from-cyan-500 to-blue-500',
			description: 'Vector graphic',
			size: '47 KB → ~12 KB',
			savings: '~75%',
		},
		{
			id: 'screenshot',
			name: 'Screenshot',
			icon: FileImage,
			gradient: 'from-orange-500 to-pink-500',
			description: 'UI capture',
			size: '1.2 MB → ~180 KB',
			savings: '~85%',
		},
	];

	async function loadSampleImage(sampleId: string) {
		// Create a minimal sample image programmatically
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d')!;

		if (sampleId === 'photo') {
			// Create a gradient photo-like image
			canvas.width = 1200;
			canvas.height = 800;
			const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
			gradient.addColorStop(0, '#667eea');
			gradient.addColorStop(0.5, '#764ba2');
			gradient.addColorStop(1, '#f093fb');
			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			// Add some "detail" circles
			for (let i = 0; i < 20; i++) {
				ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
				ctx.beginPath();
				ctx.arc(
					Math.random() * canvas.width,
					Math.random() * canvas.height,
					Math.random() * 100 + 20,
					0,
					Math.PI * 2
				);
				ctx.fill();
			}
		} else if (sampleId === 'screenshot') {
			// Create a UI-like screenshot
			canvas.width = 800;
			canvas.height = 600;
			ctx.fillStyle = '#1a1a2e';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			// Fake UI elements
			ctx.fillStyle = '#3b82f6';
			ctx.fillRect(0, 0, canvas.width, 60);

			ctx.fillStyle = '#27272a';
			ctx.fillRect(20, 80, canvas.width - 40, 100);
			ctx.fillRect(20, 200, canvas.width - 40, 100);
			ctx.fillRect(20, 320, canvas.width - 40, 100);
		} else {
			// Logo - simple geometric shape
			canvas.width = 400;
			canvas.height = 400;

			// Create simple geometric logo
			ctx.fillStyle = '#06b6d4';
			ctx.beginPath();
			ctx.arc(200, 200, 150, 0, Math.PI * 2);
			ctx.fill();

			ctx.fillStyle = '#ffffff';
			ctx.font = 'bold 80px sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText('S', 200, 200);
		}

		// Convert canvas to blob
		return new Promise<File>((resolve) => {
			canvas.toBlob((blob) => {
				if (blob) {
					const file = new File([blob], `sample-${sampleId}.png`, { type: 'image/png' });
					resolve(file);
				}
			}, 'image/png');
		});
	}

	async function handleSampleClick(sampleId: string) {
		const file = await loadSampleImage(sampleId);
		const newItems = await images.addFiles([file]);
		if (newItems.length > 0) {
			await processImages(newItems.map((i) => i.id));
		}
	}
</script>

<div class="space-y-4">
	<div class="text-center">
		<p class="text-surface-400 mb-3 text-sm font-medium">Try with sample images first</p>
	</div>

	<div class="grid gap-3 sm:grid-cols-3">
		{#each samples as sample (sample.id)}
			{@const SampleIcon = sample.icon}
			<button
				onclick={() => handleSampleClick(sample.id)}
				class="glass hover:shadow-accent-start/10 group relative overflow-hidden rounded-xl p-4 text-left transition-all hover:scale-105 hover:shadow-xl active:scale-95"
			>
				<!-- Icon -->
				<div
					class="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br {sample.gradient} shadow-lg"
				>
					<SampleIcon class="h-6 w-6 text-white" />
				</div>

				<!-- Info -->
				<div>
					<h4 class="text-surface-100 mb-1 font-semibold">{sample.name}</h4>
					<p class="text-surface-500 mb-2 text-xs">{sample.description}</p>
					<div class="flex items-center justify-between">
						<p class="text-surface-400 text-[10px] font-medium">{sample.size}</p>
						<span
							class="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400"
						>
							{sample.savings}
						</span>
					</div>
				</div>

				<!-- Hover gradient -->
				<div
					class="pointer-events-none absolute inset-0 bg-gradient-to-br {sample.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-5"
				></div>
			</button>
		{/each}
	</div>

	<div class="relative flex items-center justify-center">
		<div class="border-surface-700 flex-1 border-t"></div>
		<span class="text-surface-500 px-4 text-xs font-medium uppercase">or</span>
		<div class="border-surface-700 flex-1 border-t"></div>
	</div>
</div>
