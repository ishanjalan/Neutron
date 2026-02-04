<script lang="ts">
	import { filesStore, processFiles, downloadFile, downloadAllAsZip } from '$lib';
	import type { OutputFormat } from '$lib/stores/files.svelte';
	import { formatBytes } from '@neutron/utils/format';

	let fileInput: HTMLInputElement;
	let isDragging = $state(false);

	const outputFormats: { value: OutputFormat; label: string; desc: string }[] = [
		{ value: 'jpeg', label: 'JPG', desc: 'Best for photos, universal compatibility' },
		{ value: 'png', label: 'PNG', desc: 'Lossless, larger file size' },
		{ value: 'webp', label: 'WebP', desc: 'Modern format, great compression' },
		{ value: 'avif', label: 'AVIF', desc: 'Best compression, newer format' },
	];

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			addFiles(target.files);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;

		if (event.dataTransfer?.files) {
			addFiles(event.dataTransfer.files);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	async function addFiles(files: FileList) {
		const ids = await filesStore.addFiles(files);
		if (ids.length > 0) {
			await processFiles(ids);
		}
	}

	function handleFormatChange(format: OutputFormat) {
		filesStore.updateSettings({ outputFormat: format });
	}

	function handleQualityChange(event: Event) {
		const target = event.target as HTMLInputElement;
		filesStore.updateSettings({ quality: parseInt(target.value) });
	}
</script>

<div class="container mx-auto max-w-5xl px-4 py-8">
	<!-- Header -->
	<header class="mb-12 text-center">
		<h1 class="gradient-text mb-4 text-5xl font-bold">HEIC to JPG Converter</h1>
		<p class="text-surface-400 text-lg">
			Convert unlimited iPhone photos to JPG, PNG, WebP, or AVIF
		</p>
		<p class="text-surface-500 mt-2 text-sm">100% private • Works offline • No file limits</p>
	</header>

	<!-- Settings -->
	<div class="glass mb-8 rounded-2xl p-6">
		<h2 class="mb-4 text-lg font-semibold">Output Format</h2>
		<div class="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
			{#each outputFormats as format}
				<button
					type="button"
					class="rounded-xl border-2 p-4 transition-all {filesStore.settings.outputFormat ===
					format.value
						? 'border-accent-start bg-accent-start/10'
						: 'border-surface-700 hover:border-surface-600'}"
					onclick={() => handleFormatChange(format.value)}
				>
					<div class="mb-1 font-semibold">{format.label}</div>
					<div class="text-surface-400 text-xs">{format.desc}</div>
				</button>
			{/each}
		</div>

		{#if filesStore.settings.outputFormat !== 'png'}
			<div>
				<label for="quality" class="mb-2 block text-sm font-medium">
					Quality: {filesStore.settings.quality}%
				</label>
				<input
					id="quality"
					type="range"
					min="1"
					max="100"
					value={filesStore.settings.quality}
					oninput={handleQualityChange}
					class="w-full"
				/>
			</div>
		{/if}
	</div>

	<!-- Drop Zone -->
	{#if filesStore.items.length === 0}
		<div
			class="glass rounded-2xl border-2 border-dashed p-12 text-center transition-all {isDragging
				? 'border-accent-start bg-accent-start/5'
				: 'border-surface-700'}"
			ondrop={handleDrop}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			role="button"
			tabindex="0"
			onclick={() => fileInput.click()}
			onkeydown={(e) => e.key === 'Enter' && fileInput.click()}
		>
			<div class="mb-4 text-6xl">📱</div>
			<h3 class="mb-2 text-2xl font-semibold">Drop HEIC files here</h3>
			<p class="text-surface-400 mb-6">or click to browse</p>
			<button
				type="button"
				class="from-accent-start to-accent-end rounded-lg bg-gradient-to-r px-6 py-3 font-semibold transition-opacity hover:opacity-90"
			>
				Select Files
			</button>
		</div>

		<input
			bind:this={fileInput}
			type="file"
			accept=".heic,.heif,image/heic,image/heif"
			multiple
			onchange={handleFileSelect}
			class="hidden"
		/>
	{/if}

	<!-- File List -->
	{#if filesStore.items.length > 0}
		<div class="glass rounded-2xl p-6">
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-xl font-semibold">
					Files ({filesStore.completedFiles}/{filesStore.totalFiles})
				</h2>
				<div class="flex gap-3">
					<button
						type="button"
						onclick={() => fileInput.click()}
						class="border-surface-700 hover:bg-surface-800 rounded-lg border px-4 py-2 transition-colors"
					>
						Add More
					</button>
					{#if filesStore.completedFiles > 0}
						<button
							type="button"
							onclick={downloadAllAsZip}
							class="from-accent-start to-accent-end rounded-lg bg-gradient-to-r px-4 py-2 font-semibold transition-opacity hover:opacity-90"
						>
							Download All ({filesStore.completedFiles})
						</button>
					{/if}
					<button
						type="button"
						onclick={() => filesStore.clearAll()}
						class="border-surface-700 hover:bg-surface-800 rounded-lg border px-4 py-2 transition-colors"
					>
						Clear All
					</button>
				</div>
			</div>

			<div class="space-y-3">
				{#each filesStore.items as item (item.id)}
					<div class="glass flex items-center gap-4 rounded-xl p-4">
						<div class="min-w-0 flex-1">
							<div class="truncate font-medium">{item.name}</div>
							<div class="text-surface-400 mt-1 flex gap-4 text-sm">
								<span>{formatBytes(item.originalSize)}</span>
								{#if item.convertedSize}
									<span class="text-accent-start">→ {formatBytes(item.convertedSize)}</span>
								{/if}
							</div>
							{#if item.error}
								<div class="mt-1 text-sm text-red-400">{item.error}</div>
							{/if}
						</div>

						{#if item.status === 'processing'}
							<div class="w-32">
								<div class="bg-surface-800 h-2 overflow-hidden rounded-full">
									<div
										class="from-accent-start to-accent-end h-full bg-gradient-to-r transition-all"
										style="width: {item.progress}%"
									></div>
								</div>
							</div>
						{/if}

						{#if item.status === 'completed'}
							<button
								type="button"
								onclick={() => downloadFile(item)}
								class="from-accent-start to-accent-end rounded-lg bg-gradient-to-r px-4 py-2 font-semibold transition-opacity hover:opacity-90"
							>
								Download
							</button>
						{/if}

						<button
							type="button"
							onclick={() => filesStore.removeFile(item.id)}
							class="text-surface-400 hover:text-surface-100 px-3 py-2 transition-colors"
						>
							×
						</button>
					</div>
				{/each}
			</div>
		</div>

		<input
			bind:this={fileInput}
			type="file"
			accept=".heic,.heif,image/heic,image/heif"
			multiple
			onchange={handleFileSelect}
			class="hidden"
		/>
	{/if}

	<!-- Footer -->
	<footer class="text-surface-500 mt-16 text-center text-sm">
		<p class="mb-2">
			Part of <a
				href="https://github.com/ishanjalan/Neutron"
				class="text-accent-start hover:underline">Neutron</a
			>
			• Also try
			<a href="https://ishanjalan.github.io/Squish/" class="text-accent-start hover:underline"
				>Squish</a
			> for image compression
		</p>
		<p>
			Built with SvelteKit • 100% open source on <a
				href="https://github.com/ishanjalan/Neutron"
				class="text-accent-start hover:underline">GitHub</a
			>
		</p>
	</footer>
</div>
