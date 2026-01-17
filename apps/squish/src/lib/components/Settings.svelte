<script lang="ts">
	import { images, type OutputFormat, type ResizeMode } from '$lib/stores/images.svelte';
	import { reprocessAllImages } from '$lib/utils/compress';
	import {
		Shield,
		RefreshCw,
		Sparkles,
		Sliders,
		ChevronDown,
		ChevronUp,
		Info,
		Maximize2,
	} from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import FormatGuide from './FormatGuide.svelte';
	import { ConfirmModal } from '@neutron/ui';

	const ADVANCED_COLLAPSED_KEY = 'squish-advanced-collapsed';
	let showFormatGuide = $state(false);
	let showReoptimizeConfirm = $state(false);

	// Check if we're in preview mode (no images yet)
	const isPreviewMode = $derived(images.items.length === 0);

	// Load collapsed state from localStorage
	let showAdvanced = $state(true);
	if (typeof localStorage !== 'undefined') {
		const saved = localStorage.getItem(ADVANCED_COLLAPSED_KEY);
		showAdvanced = saved !== 'true';
	}

	const formats: { value: 'same' | OutputFormat; label: string; title?: string }[] = [
		{ value: 'same', label: 'Original', title: 'Keep same format as input' },
		{ value: 'jpeg', label: 'JPEG' },
		{ value: 'png', label: 'PNG' },
		{ value: 'webp', label: 'WebP' },
		{ value: 'avif', label: 'AVIF' },
		{ value: 'jxl', label: 'JXL', title: 'JPEG XL - best quality & progressive loading' },
	];

	// Simplified quality presets - 3 clear use cases
	const presets = [
		{ label: 'Compact', value: 60, desc: 'Smallest files — messaging, email', icon: '📦' },
		{ label: 'Balanced', value: 80, desc: 'Best of both worlds', icon: '⚖️', recommended: true },
		{ label: 'Quality', value: 95, desc: 'Archival, printing', icon: '✨' },
	];

	let isReprocessing = $state(false);

	const hasCompletedImages = $derived(images.items.some((i) => i.status === 'completed'));
	const isLossless = $derived(images.settings.lossless);

	// Resize settings
	const resizeEnabled = $derived(images.settings.resizeEnabled);
	const resizeMode = $derived(images.settings.resizeMode);
	const resizePercentage = $derived(images.settings.resizePercentage);
	const resizeMaxWidth = $derived(images.settings.resizeMaxWidth);
	const resizeMaxHeight = $derived(images.settings.resizeMaxHeight);

	const currentPreset = $derived(presets.find((p) => p.value === images.settings.quality));

	function handlePresetClick(value: number) {
		images.updateSettings({ quality: value });
	}

	function handleFormatChange(format: 'same' | OutputFormat) {
		images.updateSettings({ outputFormat: format });
	}

	function handleMetadataToggle() {
		images.updateSettings({ stripMetadata: !images.settings.stripMetadata });
	}

	function handleLosslessToggle() {
		images.updateSettings({ lossless: !images.settings.lossless });
	}

	function toggleAdvanced() {
		showAdvanced = !showAdvanced;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(ADVANCED_COLLAPSED_KEY, (!showAdvanced).toString());
		}
	}

	function handleResizeToggle() {
		images.updateSettings({ resizeEnabled: !images.settings.resizeEnabled });
	}

	function handleResizeModeChange(mode: ResizeMode) {
		images.updateSettings({ resizeMode: mode });
	}

	function handleResizePercentageChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const value = parseInt(input.value, 10);
		if (!isNaN(value) && value > 0 && value <= 100) {
			images.updateSettings({ resizePercentage: value });
		}
	}

	function handleResizeWidthChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const value = parseInt(input.value, 10);
		if (!isNaN(value) && value > 0) {
			images.updateSettings({ resizeMaxWidth: value });
		}
	}

	function handleResizeHeightChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const value = parseInt(input.value, 10);
		if (!isNaN(value) && value > 0) {
			images.updateSettings({ resizeMaxHeight: value });
		}
	}

	function handleReoptimizeClick() {
		const count = images.items.filter((i) => i.status === 'completed').length;
		if (count > 5) {
			showReoptimizeConfirm = true;
		} else {
			handleReoptimizeAll();
		}
	}

	async function handleReoptimizeAll() {
		showReoptimizeConfirm = false;
		isReprocessing = true;
		await reprocessAllImages();
		isReprocessing = false;
	}
</script>

<div class="glass mb-6 rounded-2xl p-4 sm:mb-8 sm:p-6">
	<div class="flex flex-col gap-4">
		<!-- Preview mode header -->
		{#if isPreviewMode}
			<div class="text-surface-400 -mb-1 flex items-center gap-2">
				<Sliders class="h-4 w-4" />
				<span class="text-xs font-medium uppercase tracking-wider"
					>Pre-configure compression settings</span
				>
			</div>
		{/if}

		<!-- Row 1: Quality & Format -->
		<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
			<!-- Quality Section -->
			<div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
				<span class="text-surface-500 text-xs font-semibold uppercase tracking-wider">Quality</span>

				{#if !isLossless}
					<div class="bg-surface-800/50 flex items-center gap-1 rounded-xl p-1">
						{#each presets as preset}
							<button
								onclick={() => handlePresetClick(preset.value)}
								class="relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all {images
									.settings.quality === preset.value
									? 'bg-accent-start text-white shadow-md'
									: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
								title="{preset.desc} ({preset.value}%)"
							>
								<span class="text-base">{preset.icon}</span>
								<span>{preset.label}</span>
								{#if preset.recommended && images.settings.quality !== preset.value}
									<span
										class="bg-accent-start absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full"
									></span>
								{/if}
							</button>
						{/each}
					</div>
					{#if currentPreset}
						<span class="text-surface-500 hidden text-xs tabular-nums sm:inline"
							>{currentPreset.value}%</span
						>
					{/if}
				{:else}
					<div class="bg-surface-800/50 flex items-center gap-2 rounded-xl px-4 py-2.5">
						<Sparkles class="text-accent-start h-4 w-4" />
						<span class="text-surface-300 text-sm">Lossless mode — perfect quality</span>
					</div>
				{/if}
			</div>

			<!-- Divider -->
			<div class="bg-surface-700/50 hidden h-10 w-px lg:block"></div>

			<!-- Format Section -->
			<div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
				<div class="flex items-center gap-1.5">
					<span class="text-surface-500 text-xs font-semibold uppercase tracking-wider">Format</span
					>
					<button
						onclick={() => (showFormatGuide = true)}
						class="text-surface-400 hover:text-accent-start hover:bg-accent-start/10 flex h-5 w-5 items-center justify-center rounded-full transition-colors"
						title="Format guide"
						aria-label="Open format guide"
					>
						<Info class="h-3.5 w-3.5" />
					</button>
				</div>
				<div class="bg-surface-800/50 flex flex-wrap gap-1 rounded-xl p-1">
					{#each formats as format}
						<button
							onclick={() => handleFormatChange(format.value)}
							class="rounded-lg px-3 py-2.5 text-sm font-medium transition-all {images.settings
								.outputFormat === format.value
								? 'bg-accent-start text-white shadow-md'
								: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
							title={format.title}
						>
							{format.label}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Row 2: Advanced Options Toggle + Re-optimize -->
		<div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
			<button
				onclick={toggleAdvanced}
				class="text-surface-400 hover:text-surface-200 flex min-h-[44px] items-center gap-2 py-2 text-xs font-medium transition-colors"
			>
				{#if showAdvanced}
					<ChevronUp class="h-4 w-4" />
				{:else}
					<ChevronDown class="h-4 w-4" />
				{/if}
				<span class="uppercase tracking-wider">Advanced Options</span>
				{#if !showAdvanced}
					<span class="text-surface-500 hidden sm:inline">
						({images.settings.stripMetadata ? 'Metadata stripped' : 'Metadata kept'}{isLossless
							? ', Lossless'
							: ''}{resizeEnabled ? ', Resize' : ''})
					</span>
				{/if}
			</button>

			{#if hasCompletedImages}
				<button
					onclick={handleReoptimizeClick}
					disabled={isReprocessing}
					class="bg-accent-start shadow-accent-start/30 hover:shadow-accent-start/40 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
				>
					<RefreshCw class="h-4 w-4 {isReprocessing ? 'animate-spin' : ''}" />
					{isReprocessing ? 'Working...' : 'Re-optimize All'}
				</button>
			{/if}
		</div>

		<!-- Advanced Options Section (Collapsible) -->
		{#if showAdvanced}
			<div
				class="border-surface-700/30 flex flex-wrap items-center gap-3 border-t pt-3"
				transition:slide={{ duration: 200 }}
			>
				<!-- Strip Metadata Toggle -->
				<button
					onclick={handleMetadataToggle}
					class="flex items-center gap-3 rounded-xl px-4 py-3 transition-all {images.settings
						.stripMetadata
						? 'text-accent-start bg-accent-start/10'
						: 'text-surface-400 bg-surface-800/30 hover:bg-surface-700/30'}"
					title={images.settings.stripMetadata
						? 'Location, camera info, timestamps will be removed'
						: 'Metadata will be preserved (may include location)'}
				>
					<Shield class="h-4 w-4" />
					<div class="flex flex-col items-start">
						<span class="text-sm font-medium">Strip Metadata</span>
						<span class="text-surface-500 text-[10px]">Location, camera, timestamps</span>
					</div>
					<div
						class="relative ml-2 h-5 w-9 rounded-full transition-colors {images.settings
							.stripMetadata
							? 'bg-accent-start'
							: 'bg-surface-600'}"
					>
						<span
							class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform {images
								.settings.stripMetadata
								? 'translate-x-4'
								: 'translate-x-0'}"
						></span>
					</div>
				</button>

				<!-- Lossless Toggle -->
				<button
					onclick={handleLosslessToggle}
					class="flex items-center gap-3 rounded-xl px-4 py-3 transition-all {isLossless
						? 'text-accent-start bg-accent-start/10'
						: 'text-surface-400 bg-surface-800/30 hover:bg-surface-700/30'}"
					title={isLossless
						? 'No quality loss, larger files'
						: 'Smaller files, slight quality reduction'}
				>
					<Sparkles class="h-4 w-4" />
					<div class="flex flex-col items-start">
						<span class="text-sm font-medium">Lossless</span>
						<span class="text-surface-500 text-[10px]"
							>{isLossless ? 'Perfect quality' : 'Larger files'}</span
						>
					</div>
					<div
						class="relative ml-2 h-5 w-9 rounded-full transition-colors {isLossless
							? 'bg-accent-start'
							: 'bg-surface-600'}"
					>
						<span
							class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform {isLossless
								? 'translate-x-4'
								: 'translate-x-0'}"
						></span>
					</div>
				</button>

				<!-- Resize Toggle + Controls -->
				<div
					class="flex items-center gap-3 rounded-xl px-4 py-3 {resizeEnabled
						? 'bg-accent-start/10'
						: 'bg-surface-800/30'}"
				>
					<button
						onclick={handleResizeToggle}
						class="flex items-center gap-3 transition-all {resizeEnabled
							? 'text-accent-start'
							: 'text-surface-400 hover:text-surface-300'}"
					>
						<Maximize2 class="h-4 w-4" />
						<div class="flex flex-col items-start">
							<span class="text-sm font-medium">Resize</span>
							<span class="text-surface-500 text-[10px]">Scale images</span>
						</div>
						<div
							class="relative ml-2 h-5 w-9 rounded-full transition-colors {resizeEnabled
								? 'bg-accent-start'
								: 'bg-surface-600'}"
						>
							<span
								class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform {resizeEnabled
									? 'translate-x-4'
									: 'translate-x-0'}"
							></span>
						</div>
					</button>

					{#if resizeEnabled}
						<div class="border-surface-600 ml-2 flex items-center gap-3 border-l pl-3">
							<!-- Mode selector -->
							<div class="bg-surface-700/50 flex gap-0.5 rounded-md p-0.5">
								<button
									onclick={() => handleResizeModeChange('percentage')}
									class="rounded px-2 py-1 text-xs font-medium transition-all {resizeMode ===
									'percentage'
										? 'bg-surface-600 text-white'
										: 'text-surface-400 hover:text-surface-200'}"
								>
									Scale %
								</button>
								<button
									onclick={() => handleResizeModeChange('fit')}
									class="rounded px-2 py-1 text-xs font-medium transition-all {resizeMode === 'fit'
										? 'bg-surface-600 text-white'
										: 'text-surface-400 hover:text-surface-200'}"
								>
									Max Size
								</button>
							</div>

							{#if resizeMode === 'percentage'}
								<div class="flex items-center gap-1.5">
									<input
										type="number"
										min="10"
										max="100"
										value={resizePercentage}
										onchange={handleResizePercentageChange}
										class="bg-surface-700 text-surface-200 border-surface-600 focus:border-accent-start w-16 rounded-md border px-2 py-1 text-sm font-medium focus:outline-none"
									/>
									<span class="text-surface-500 text-xs">%</span>
								</div>
							{:else}
								<div class="flex items-center gap-1.5">
									<input
										type="number"
										min="100"
										max="10000"
										value={resizeMaxWidth}
										onchange={handleResizeWidthChange}
										class="bg-surface-700 text-surface-200 border-surface-600 focus:border-accent-start w-20 rounded-md border px-2 py-1 text-sm font-medium focus:outline-none"
									/>
									<span class="text-surface-500 text-xs">×</span>
									<input
										type="number"
										min="100"
										max="10000"
										value={resizeMaxHeight}
										onchange={handleResizeHeightChange}
										class="bg-surface-700 text-surface-200 border-surface-600 focus:border-accent-start w-20 rounded-md border px-2 py-1 text-sm font-medium focus:outline-none"
									/>
									<span class="text-surface-500 text-xs">px</span>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Format Guide Modal -->
<FormatGuide open={showFormatGuide} onclose={() => (showFormatGuide = false)} />

<!-- Re-optimize Confirmation Modal -->
<ConfirmModal
	open={showReoptimizeConfirm}
	title="Re-optimize all images?"
	message="This will re-process {images.items.filter((i) => i.status === 'completed')
		.length} images with the current settings. This may take a moment."
	confirmText="Re-optimize"
	onconfirm={handleReoptimizeAll}
	oncancel={() => (showReoptimizeConfirm = false)}
/>
