<script lang="ts">
	import { X, Image, Layers, Zap, Sparkles, Globe, Star, Triangle, Package } from 'lucide-svelte';
	import { scale, fade } from 'svelte/transition';
	import { focusTrap } from '@neutron/utils';

	let { open = false, onclose }: { open: boolean; onclose: () => void } = $props();

	const formats = [
		{
			name: 'SVG',
			icon: Triangle,
			color: 'from-cyan-500 to-blue-500',
			bestFor: 'Icons, logos, simple illustrations',
			type: 'Vector',
			pros: [
				'Scales to any size without quality loss',
				'Tiny for simple shapes',
				'Style with CSS (colors, animations)',
				'One file for all screen densities',
			],
			cons: [
				'Complex artwork = large files, heavy to render',
				'Design-tool exports may secretly embed bitmaps',
			],
			support: '100%',
		},
		{
			name: 'JPEG',
			icon: Image,
			color: 'from-orange-500 to-red-500',
			bestFor: 'Photos, complex images',
			type: 'Raster',
			pros: ['Smallest file size for photos', 'Universal support'],
			cons: ['No transparency', 'Quality loss on re-save'],
			support: '100%',
		},
		{
			name: 'PNG',
			icon: Layers,
			color: 'from-blue-500 to-indigo-500',
			bestFor: 'Screenshots, graphics with transparency',
			type: 'Raster',
			pros: ['Transparency support', 'Lossless quality'],
			cons: ['Larger files than JPEG', 'Not ideal for photos'],
			support: '100%',
		},
		{
			name: 'WebP',
			icon: Zap,
			color: 'from-green-500 to-emerald-500',
			bestFor: 'Web images (recommended)',
			type: 'Raster',
			pros: ['25-35% smaller than JPEG', 'Supports transparency', 'Great quality'],
			cons: ['No support in very old browsers'],
			support: '97%',
		},
		{
			name: 'AVIF',
			icon: Sparkles,
			color: 'from-purple-500 to-pink-500',
			bestFor: 'Maximum compression',
			type: 'Raster',
			pros: ['50% smaller than JPEG', 'Excellent quality', 'HDR support'],
			cons: ['Slower encoding', 'Limited browser support'],
			support: '93%',
		},
		{
			name: 'JPEG XL',
			icon: Star,
			color: 'from-amber-500 to-orange-500',
			bestFor: 'Best quality & compression',
			type: 'Raster',
			pros: ['Best quality at any size', 'Lossless JPEG recompression', 'Progressive loading'],
			cons: ['Limited browser support (Safari, Chrome flag)'],
			support: '~25%',
		},
	];

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onclose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="format-guide-title"
		onkeydown={handleKeydown}
		use:focusTrap
	>
		<!-- Backdrop -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="absolute inset-0 bg-black/50 backdrop-blur-sm"
			onclick={handleBackdropClick}
			transition:fade={{ duration: 150 }}
		></div>

		<!-- Modal -->
		<div
			class="bg-surface-900 relative w-full max-w-2xl overflow-y-auto rounded-2xl p-6 shadow-2xl"
			style="max-height: 90dvh;"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			<!-- Close button -->
			<button
				onclick={onclose}
				class="text-surface-400 hover:bg-surface-800 absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
				aria-label="Close"
			>
				<X class="h-5 w-5" />
			</button>

			<!-- Header -->
			<div class="mb-6">
				<h2 id="format-guide-title" class="text-surface-100 text-xl font-semibold">Format Guide</h2>
				<p class="text-surface-500 mt-1 text-sm">Choose the right format for your use case</p>
			</div>

			<!-- Vector vs Raster primer -->
			<div class="bg-surface-800 mb-6 rounded-xl p-4">
				<h3 class="text-surface-100 mb-3 font-semibold">Vector vs Raster</h3>
				<div class="grid gap-3 sm:grid-cols-2">
					<div class="space-y-1">
						<div class="flex items-center gap-2">
							<span class="rounded bg-cyan-500/20 px-1.5 py-0.5 text-xs font-semibold text-cyan-400"
								>Vector</span
							>
							<span class="text-surface-300 text-xs font-medium">SVG</span>
						</div>
						<p class="text-surface-400 text-xs leading-relaxed">
							Math-based drawing instructions. Infinite scale — sharp at any size or zoom. One file
							covers 1×, 2×, and 4× displays. Best for <strong class="text-surface-300"
								>simple, geometric graphics</strong
							>.
						</p>
					</div>
					<div class="space-y-1">
						<div class="flex items-center gap-2">
							<span
								class="rounded bg-green-500/20 px-1.5 py-0.5 text-xs font-semibold text-green-400"
								>Raster</span
							>
							<span class="text-surface-300 text-xs font-medium">WebP, PNG, JPEG…</span>
						</div>
						<p class="text-surface-400 text-xs leading-relaxed">
							A grid of pixels at a fixed resolution. Efficient for <strong class="text-surface-300"
								>photos and complex artwork</strong
							> — millions of color variations that would take pages of SVG markup.
						</p>
					</div>
				</div>
				<div class="border-surface-700 mt-3 space-y-1.5 border-t pt-3 text-xs">
					<p class="text-surface-400">
						<strong class="text-surface-300">Keep SVG for:</strong> logos, icons, UI elements, simple
						illustrations — where you need infinite scale or CSS styling.
					</p>
					<p class="text-surface-400">
						<strong class="text-surface-300">Use WebP for:</strong> photos, complex gradients, and any
						graphic that's heavier as SVG than as a sharp bitmap. Squish will flag these automatically.
					</p>
					<p class="text-amber-400/80">
						<strong class="text-amber-400">Design tool tip:</strong> Exporting a frame as SVG in Figma
						or Sketch can still embed bitmap images inside it — you get the file size of a PNG with none
						of the vector benefits. Squish detects this and suggests WebP instead.
					</p>
					<p class="text-surface-500">
						When Squish converts SVG → WebP, it rasterizes at the SVG's declared pixel dimensions.
					</p>
				</div>
			</div>

			<!-- Format Grid -->
			<div class="grid gap-4 sm:grid-cols-2">
				{#each formats as format (format.name)}
					<div class="border-surface-700 rounded-xl border p-4">
						<div class="mb-3 flex items-center gap-3">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br {format.color}"
							>
								<format.icon class="h-5 w-5 text-white" />
							</div>
							<div>
								<div class="flex items-center gap-2">
									<h3 class="text-surface-100 font-semibold">{format.name}</h3>
									<span
										class="text-surface-500 rounded text-[10px] font-medium tracking-wide uppercase"
										>{format.type}</span
									>
								</div>
								<div class="text-surface-500 flex items-center gap-1 text-xs">
									<Globe class="h-3 w-3" />
									<span>{format.support} browser support</span>
								</div>
							</div>
						</div>

						<p class="text-accent-start mb-2 text-sm font-medium">{format.bestFor}</p>

						<div class="space-y-2 text-xs">
							<div>
								<span class="font-medium text-green-500">Pros:</span>
								<ul class="text-surface-400 mt-0.5">
									{#each format.pros as pro (pro)}
										<li class="flex items-start gap-1">
											<span class="text-green-500">+</span>
											{pro}
										</li>
									{/each}
								</ul>
							</div>
							<div>
								<span class="font-medium text-amber-500">Cons:</span>
								<ul class="text-surface-400 mt-0.5">
									{#each format.cons as con (con)}
										<li class="flex items-start gap-1">
											<span class="text-amber-500">-</span>
											{con}
										</li>
									{/each}
								</ul>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Recommendation -->
			<div class="bg-accent-start/10 mt-6 rounded-lg p-4">
				<p class="text-surface-300 text-sm">
					<strong class="text-accent-start">Recommendation:</strong> Use <strong>WebP</strong> for
					most web images — it offers the best balance of quality, file size, and compatibility. Use
					<strong>AVIF</strong>
					for maximum compression, or <strong>JPEG XL</strong> for best quality when targeting
					Safari or progressive enhancement. Keep <strong>SVG</strong> for icons, logos, and simple graphics.
				</p>
			</div>
		</div>
	</div>
{/if}
