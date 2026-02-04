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

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
	<!-- Header -->
	<header class="mb-12 text-center sm:mb-16">
		<h1 class="gradient-text mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
			HEIC Converter
		</h1>
		<p class="text-surface-400 mx-auto max-w-2xl text-base leading-relaxed sm:text-lg">
			Convert unlimited iPhone photos to JPG, PNG, WebP, or AVIF
		</p>
		<p class="text-surface-500 mx-auto mt-2 max-w-xl text-sm">
			<span class="text-surface-300 font-medium">100% private</span> • Works offline • No file limits
		</p>
	</header>

	<!-- Settings -->
	<div class="glass mb-8 rounded-2xl p-6 sm:p-8">
		<h2 class="text-surface-100 mb-6 text-lg font-semibold sm:text-xl">Output Format</h2>
		<div class="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
			{#each outputFormats as format}
				<button
					type="button"
					class="group rounded-xl border-2 p-4 transition-all hover:scale-[1.02] sm:p-5 {filesStore
						.settings.outputFormat === format.value
						? 'border-accent-start bg-accent-start/10'
						: 'border-surface-700 hover:border-surface-600'}"
					onclick={() => handleFormatChange(format.value)}
				>
					<div class="text-surface-100 mb-1 font-semibold sm:text-lg">{format.label}</div>
					<div class="text-surface-400 text-xs sm:text-sm">{format.desc}</div>
				</button>
			{/each}
		</div>

		{#if filesStore.settings.outputFormat !== 'png'}
			<div>
				<label for="quality" class="text-surface-300 mb-3 block text-sm font-medium sm:text-base">
					Quality: <span class="text-accent-start font-semibold"
						>{filesStore.settings.quality}%</span
					>
				</label>
				<input
					id="quality"
					type="range"
					min="1"
					max="100"
					value={filesStore.settings.quality}
					oninput={handleQualityChange}
					class="accent-accent-start w-full"
				/>
			</div>
		{/if}
	</div>

	<!-- Drop Zone -->
	{#if filesStore.items.length === 0}
		<div
			class="glass hover:border-surface-600 cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all sm:p-16 {isDragging
				? 'border-accent-start bg-accent-start/5 scale-[1.02]'
				: 'border-surface-700'}"
			ondrop={handleDrop}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			role="button"
			tabindex="0"
			onclick={() => fileInput.click()}
			onkeydown={(e) => e.key === 'Enter' && fileInput.click()}
		>
			<div class="mb-6 text-6xl sm:text-7xl">📱</div>
			<h3 class="text-surface-100 mb-3 text-2xl font-semibold sm:text-3xl">Drop HEIC files here</h3>
			<p class="text-surface-400 mb-8 text-base sm:text-lg">or click to browse</p>
			<button
				type="button"
				class="from-accent-start to-accent-end shadow-accent-start/30 hover:shadow-accent-start/40 rounded-xl bg-gradient-to-r px-8 py-3 font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl sm:px-10 sm:py-4 sm:text-lg"
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
		<div class="glass rounded-2xl p-6 sm:p-8">
			<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
				<h2 class="text-surface-100 text-xl font-semibold sm:text-2xl">
					Files ({filesStore.completedFiles}/{filesStore.totalFiles})
				</h2>
				<div class="flex flex-wrap gap-3">
					<button
						type="button"
						onclick={() => fileInput.click()}
						class="bg-surface-800 text-surface-300 border-surface-700 hover:bg-surface-700 rounded-xl border px-4 py-2 text-sm font-medium transition-all hover:text-white sm:px-5 sm:py-2.5"
					>
						Add More
					</button>
					{#if filesStore.completedFiles > 0}
						<button
							type="button"
							onclick={downloadAllAsZip}
							class="from-accent-start to-accent-end shadow-accent-start/30 hover:shadow-accent-start/40 rounded-xl bg-gradient-to-r px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl sm:px-5 sm:py-2.5"
						>
							Download All ({filesStore.completedFiles})
						</button>
					{/if}
					<button
						type="button"
						onclick={() => filesStore.clearAll()}
						class="bg-surface-800 text-surface-400 border-surface-700 rounded-xl border px-4 py-2 text-sm font-medium transition-all hover:bg-red-900/20 hover:text-red-400 sm:px-5 sm:py-2.5"
					>
						Clear All
					</button>
				</div>
			</div>

			<div class="space-y-3 sm:space-y-4">
				{#each filesStore.items as item (item.id)}
					<div
						class="glass flex items-center gap-4 rounded-xl p-4 transition-all hover:bg-white/[0.02] sm:p-5"
					>
						<div class="min-w-0 flex-1">
							<div class="text-surface-100 truncate font-medium sm:text-lg">{item.name}</div>
							<div class="text-surface-400 mt-1 flex gap-4 text-sm">
								<span>{formatBytes(item.originalSize)}</span>
								{#if item.convertedSize}
									<span class="text-accent-start font-medium"
										>→ {formatBytes(item.convertedSize)}</span
									>
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
								class="from-accent-start to-accent-end shadow-accent-start/30 hover:shadow-accent-start/40 rounded-xl bg-gradient-to-r px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl sm:px-5 sm:py-2.5"
							>
								Download
							</button>
						{/if}

						<button
							type="button"
							onclick={() => filesStore.removeFile(item.id)}
							class="text-surface-400 hover:text-surface-100 rounded-lg px-3 py-2 text-2xl transition-colors hover:bg-red-900/20 hover:text-red-400"
							aria-label="Remove file"
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
	<footer class="text-surface-500 mt-16 text-center text-sm sm:mt-20 sm:text-base">
		<p class="mb-2">
			Part of <a
				href="https://github.com/ishanjalan/Neutron"
				class="text-accent-start hover:text-accent-end transition-colors hover:underline">Neutron</a
			>
			• Also try
			<a
				href="https://ishanjalan.github.io/Squish/"
				class="text-accent-start hover:text-accent-end transition-colors hover:underline">Squish</a
			> for image compression
		</p>
		<p class="text-surface-600">
			Built with SvelteKit • 100% open source on <a
				href="https://github.com/ishanjalan/Neutron"
				class="text-accent-start hover:text-accent-end transition-colors hover:underline">GitHub</a
			>
		</p>
	</footer>
</div>
