<script lang="ts">
	import { X, Trash2, Upload, PenTool, Type } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';

	interface Props {
		onConfirm: (signatureDataUrl: string) => void;
		onClose: () => void;
	}

	const { onConfirm, onClose }: Props = $props();

	type Tab = 'draw' | 'type' | 'upload';
	let activeTab = $state<Tab>('draw');

	// Draw tab
	let drawCanvas = $state<HTMLCanvasElement | null>(null);
	let drawCtx: CanvasRenderingContext2D | null = null;
	let isDrawing = $state(false);
	let hasDrawing = $state(false);
	let penColor = $state('#1a1a2e');

	// Type tab
	let typedText = $state('');
	const CURSIVE_FONTS = [
		{ name: 'Dancing Script', css: "'Dancing Script', cursive" },
		{ name: 'Pacifico', css: "'Pacifico', cursive" },
		{ name: 'Great Vibes', css: "'Great Vibes', cursive" },
	];
	let selectedFont = $state(0);

	// Upload tab
	let uploadedDataUrl = $state<string | null>(null);
	let uploadInput = $state<HTMLInputElement | null>(null);

	onMount(() => {
		// Load Google Fonts for type tab
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href =
			'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Pacifico&family=Great+Vibes&display=swap';
		document.head.appendChild(link);

		// Initialize draw canvas
		setupDrawCanvas();
	});

	function setupDrawCanvas() {
		if (!drawCanvas) return;
		drawCtx = drawCanvas.getContext('2d');
		if (!drawCtx) return;
		drawCtx.strokeStyle = penColor;
		drawCtx.lineWidth = 2.5;
		drawCtx.lineCap = 'round';
		drawCtx.lineJoin = 'round';
		clearDrawing();
	}

	function getCanvasCoords(e: MouseEvent | TouchEvent): { x: number; y: number } {
		if (!drawCanvas) return { x: 0, y: 0 };
		const rect = drawCanvas.getBoundingClientRect();
		const scaleX = drawCanvas.width / rect.width;
		const scaleY = drawCanvas.height / rect.height;

		if (e instanceof TouchEvent && e.touches.length > 0) {
			return {
				x: (e.touches[0].clientX - rect.left) * scaleX,
				y: (e.touches[0].clientY - rect.top) * scaleY,
			};
		}
		return {
			x: ((e as MouseEvent).clientX - rect.left) * scaleX,
			y: ((e as MouseEvent).clientY - rect.top) * scaleY,
		};
	}

	function startDrawing(e: MouseEvent | TouchEvent) {
		e.preventDefault();
		if (!drawCtx) return;
		isDrawing = true;
		const { x, y } = getCanvasCoords(e);
		drawCtx.beginPath();
		drawCtx.moveTo(x, y);
	}

	function draw(e: MouseEvent | TouchEvent) {
		e.preventDefault();
		if (!isDrawing || !drawCtx) return;
		const { x, y } = getCanvasCoords(e);
		drawCtx.lineTo(x, y);
		drawCtx.stroke();
		hasDrawing = true;
	}

	function stopDrawing() {
		isDrawing = false;
	}

	function clearDrawing() {
		if (!drawCtx || !drawCanvas) return;
		drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
		hasDrawing = false;
	}

	function handleUpload(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			uploadedDataUrl = ev.target?.result as string;
		};
		reader.readAsDataURL(file);
	}

	function getSignatureDataUrl(): string | null {
		if (activeTab === 'draw') {
			if (!drawCanvas || !hasDrawing) return null;
			// Crop to content
			return drawCanvas.toDataURL('image/png');
		}

		if (activeTab === 'type') {
			if (!typedText.trim()) return null;
			const canvas = document.createElement('canvas');
			canvas.width = 500;
			canvas.height = 120;
			const ctx = canvas.getContext('2d')!;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = penColor;
			ctx.font = `64px ${CURSIVE_FONTS[selectedFont].css}`;
			ctx.textBaseline = 'middle';
			ctx.fillText(typedText, 20, 60, 460);
			return canvas.toDataURL('image/png');
		}

		if (activeTab === 'upload') {
			return uploadedDataUrl;
		}

		return null;
	}

	function handleConfirm() {
		const dataUrl = getSignatureDataUrl();
		if (!dataUrl) return;
		onConfirm(dataUrl);
	}

	const canConfirm = $derived(() => {
		if (activeTab === 'draw') return hasDrawing;
		if (activeTab === 'type') return typedText.trim().length > 0;
		if (activeTab === 'upload') return uploadedDataUrl !== null;
		return false;
	});
</script>

<!-- Backdrop -->
<div
	class="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm"
	transition:fade={{ duration: 150 }}
	role="dialog"
	aria-modal="true"
>
	<!-- Modal -->
	<div
		class="bg-surface-900 border-surface-700 relative w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl"
		transition:fly={{ y: 20, duration: 200 }}
	>
		<!-- Header -->
		<div class="border-surface-800 flex items-center justify-between border-b px-5 py-4">
			<div class="flex items-center gap-2">
				<PenTool class="text-accent-start h-4 w-4" />
				<h2 class="text-surface-100 text-sm font-semibold">Create Signature</h2>
			</div>
			<button
				onclick={onClose}
				class="text-surface-500 hover:text-surface-200 hover:bg-surface-800 rounded-lg p-1.5 transition-colors"
			>
				<X class="h-4 w-4" />
			</button>
		</div>

		<!-- Tabs -->
		<div class="border-surface-800 flex border-b">
			{#each [{ id: 'draw', label: 'Draw' }, { id: 'type', label: 'Type' }, { id: 'upload', label: 'Upload' }] as tab (tab.id)}
				<button
					onclick={() => (activeTab = tab.id as Tab)}
					class="flex-1 py-2.5 text-xs font-medium transition-colors {activeTab === tab.id
						? 'text-accent-start border-accent-start border-b-2'
						: 'text-surface-500 hover:text-surface-300'}"
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<!-- Tab content -->
		<div class="p-5">
			{#if activeTab === 'draw'}
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<p class="text-surface-500 text-xs">Draw your signature below</p>
						<div class="flex items-center gap-2">
							<span class="text-surface-600 text-xs">Color:</span>
							{#each ['#1a1a2e', '#0a0a0a', '#1e3a5f'] as color (color)}
								<button
									onclick={() => {
										penColor = color;
										if (drawCtx) drawCtx.strokeStyle = color;
									}}
									class="h-5 w-5 rounded-full border-2 transition-all {penColor === color
										? 'border-accent-start scale-110'
										: 'border-surface-600'}"
									style="background: {color}"
								></button>
							{/each}
							<button
								onclick={clearDrawing}
								class="text-surface-500 hover:text-surface-200 rounded p-1 transition-colors"
								title="Clear"
							>
								<Trash2 class="h-3.5 w-3.5" />
							</button>
						</div>
					</div>
					<canvas
						bind:this={drawCanvas}
						width={460}
						height={160}
						class="bg-surface-950 border-surface-700 w-full touch-none rounded-xl border-2 border-dashed"
						style="cursor: crosshair;"
						onmousedown={startDrawing}
						onmousemove={draw}
						onmouseup={stopDrawing}
						onmouseleave={stopDrawing}
						ontouchstart={startDrawing}
						ontouchmove={draw}
						ontouchend={stopDrawing}
					></canvas>
				</div>
			{:else if activeTab === 'type'}
				<div class="space-y-4">
					<input
						type="text"
						placeholder="Type your name"
						bind:value={typedText}
						class="bg-surface-800 border-surface-700 text-surface-200 focus:border-accent-start w-full rounded-xl border px-4 py-3 text-sm focus:outline-none"
					/>
					<div class="space-y-2">
						<p class="text-surface-500 text-xs">Choose style:</p>
						{#each CURSIVE_FONTS as font, i (i)}
							<button
								onclick={() => (selectedFont = i)}
								class="w-full rounded-xl border-2 px-4 py-3 text-left transition-all {selectedFont ===
								i
									? 'border-accent-start bg-accent-start/5'
									: 'border-surface-700 hover:border-surface-600'}"
							>
								<span
									class="text-2xl text-slate-800"
									style="font-family: {font.css}; font-size: 28px; color: {penColor};"
								>
									{typedText || font.name}
								</span>
							</button>
						{/each}
					</div>
				</div>
			{:else}
				<div class="space-y-3">
					<input
						bind:this={uploadInput}
						type="file"
						accept="image/png,image/jpeg,image/webp"
						class="hidden"
						onchange={handleUpload}
					/>
					{#if uploadedDataUrl}
						<div class="bg-surface-950 rounded-xl p-4">
							<img
								src={uploadedDataUrl}
								alt="Uploaded signature"
								class="max-h-32 w-full object-contain"
							/>
						</div>
						<button
							onclick={() => (uploadedDataUrl = null)}
							class="text-surface-500 flex items-center gap-1 text-xs transition-colors hover:text-red-400"
						>
							<Trash2 class="h-3 w-3" />
							Remove
						</button>
					{:else}
						<button
							onclick={() => uploadInput?.click()}
							class="border-surface-600 hover:border-accent-start text-surface-400 hover:text-surface-200 flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed py-10 transition-all"
						>
							<Upload class="h-8 w-8 opacity-50" />
							<span class="text-sm">Click to upload PNG or JPG</span>
							<span class="text-xs opacity-50">Transparent background recommended</span>
						</button>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="border-surface-800 flex items-center justify-end gap-3 border-t px-5 py-4">
			<button
				onclick={onClose}
				class="text-surface-400 hover:text-surface-200 rounded-xl px-4 py-2 text-sm transition-colors"
			>
				Cancel
			</button>
			<button
				onclick={handleConfirm}
				disabled={!canConfirm()}
				class="from-accent-start to-accent-end rounded-xl bg-gradient-to-r px-5 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
			>
				Use Signature
			</button>
		</div>
	</div>
</div>
