<script lang="ts">
	import {
		videos,
		QUALITY_PRESETS,
		RESOLUTION_OPTIONS,
		AUDIO_BITRATE_OPTIONS,
		SIZE_PRESETS,
		estimateFileSize,
		type OutputFormat,
		type Resolution,
		type AudioCodec
	} from '$lib/stores/videos.svelte';
	import { reprocessAllVideos, processVideos, initWebCodecs, getCapabilitiesSync } from '$lib/utils/compress';
	import {
		Settings2,
		RefreshCw,
		ChevronDown,
		ChevronUp,
		Volume2,
		Maximize,
		Zap,
		Info,
		Play
	} from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import { onMount } from 'svelte';
	import InfoTooltip from './InfoTooltip.svelte';

	// Check codec availability (hardware support required for some)
	let av1Available = $state(false);
	let hevcAvailable = $state(false);
	
	onMount(async () => {
		const capabilities = await initWebCodecs();
		av1Available = capabilities.supportedVideoCodecs.includes('av1');
		hevcAvailable = capabilities.supportedVideoCodecs.includes('hevc');
	});

	const formats: { value: OutputFormat; label: string; desc: string; requiresHardware?: boolean }[] = [
		{ value: 'mp4', label: 'MP4', desc: 'H.264 • Universal compatibility' },
		{ value: 'webm', label: 'WebM', desc: 'VP9 • Modern browsers' },
		{ value: 'hevc', label: 'HEVC', desc: 'H.265 • Better compression', requiresHardware: true },
		{ value: 'av1', label: 'AV1', desc: 'Best compression • Newest', requiresHardware: true }
	];

	const audioCodecs: { value: AudioCodec; label: string; desc: string }[] = [
		{ value: 'aac', label: 'AAC', desc: 'Standard' },
		{ value: 'opus', label: 'Opus', desc: 'Modern' },
		{ value: 'mp3', label: 'MP3', desc: 'Legacy' },
		{ value: 'copy', label: 'Keep Original', desc: 'No re-encode' },
		{ value: 'none', label: 'None', desc: 'Remove audio' }
	];

	const encodingPresets = [
		{ value: 'veryfast', label: 'Fast', speed: 4, desc: 'Quick encoding, slightly larger files' },
		{ value: 'medium', label: 'Balanced', speed: 2, desc: 'Good balance of speed and quality' },
		{ value: 'slow', label: 'Quality', speed: 0, desc: 'Best quality, slower encoding' }
	] as const;

	const presets = Object.entries(QUALITY_PRESETS).map(([key, value]) => ({
		key: key as keyof typeof QUALITY_PRESETS,
		...value
	}));

	const sizePresets = Object.entries(SIZE_PRESETS).map(([key, value]) => ({
		key,
		...value
	}));

	let isExpanded = $state(false);
	let isProcessing = $state(false);
	let targetSizeInput = $state('');
	let showSizePresets = $state(false);
	
	const pendingVideos = $derived(videos.items.filter((i) => i.status === 'pending'));
	const hasPendingVideos = $derived(pendingVideos.length > 0);
	const hasCompletedVideos = $derived(videos.items.some((i) => i.status === 'completed'));
	const isAnyProcessing = $derived(videos.items.some((i) => i.status === 'processing'));
	const hasTargetSize = $derived(videos.settings.targetSizeMB !== undefined);
	
	// Initialize target size input when it changes
	$effect(() => {
		if (videos.settings.targetSizeMB !== undefined) {
			targetSizeInput = videos.settings.targetSizeMB.toString();
		}
	});

	function handlePresetClick(key: keyof typeof QUALITY_PRESETS) {
		// Clear target size when selecting a quality preset
		videos.updateSettings({ quality: key, targetSizeMB: undefined });
		targetSizeInput = '';
		showSizePresets = false;
	}

	function handleFormatChange(format: OutputFormat) {
		videos.updateSettings({ outputFormat: format });
	}

	function handleTargetSizeChange() {
		const value = parseFloat(targetSizeInput);
		if (!isNaN(value) && value > 0) {
			videos.updateSettings({ targetSizeMB: value });
		} else {
			videos.updateSettings({ targetSizeMB: undefined });
		}
	}

	function handleSizePresetClick(sizeMB: number) {
		videos.updateSettings({ targetSizeMB: sizeMB });
		targetSizeInput = sizeMB.toString();
		showSizePresets = false;
	}

	function clearTargetSize() {
		videos.updateSettings({ targetSizeMB: undefined });
		targetSizeInput = '';
	}

	function handleResolutionChange(resolution: Resolution) {
		videos.updateSettings({ resolution });
	}

	function handleAudioCodecChange(codec: AudioCodec) {
		videos.updateSettings({ audioCodec: codec });
	}

	function handleAudioBitrateChange(bitrate: (typeof AUDIO_BITRATE_OPTIONS)[number]['value']) {
		videos.updateSettings({ audioBitrate: bitrate });
	}

	function handleEncodingPresetChange(preset: (typeof encodingPresets)[number]['value']) {
		videos.updateSettings({ preset });
	}

	async function handleCompressAll() {
		if (hasPendingVideos) {
			isProcessing = true;
			await processVideos(pendingVideos.map((i) => i.id));
			isProcessing = false;
		}
	}

	async function handleRecompressAll() {
		isProcessing = true;
		await reprocessAllVideos();
		isProcessing = false;
	}
</script>

<div class="glass mb-6 sm:mb-8 rounded-2xl overflow-hidden">
	<!-- Main settings row -->
	<div class="p-4 sm:p-6">
		<div class="flex flex-wrap items-center gap-3 sm:gap-4">
			<!-- Quality Presets -->
			<div class="flex flex-col gap-1.5">
				<span class="text-[10px] text-surface-500 uppercase tracking-wider hidden sm:block">Quality</span>
				<div class="flex gap-1">
					{#each presets as preset}
						<button
							onclick={() => handlePresetClick(preset.key)}
							class="px-3 py-2.5 sm:py-1.5 text-sm font-medium rounded-lg transition-all {videos.settings
								.quality === preset.key && !hasTargetSize
								? 'bg-accent-start text-white shadow-md shadow-accent-start/30'
								: hasTargetSize
									? 'text-surface-500 hover:text-surface-400 hover:bg-surface-700/30'
									: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
							title="{preset.desc}"
						>
							{preset.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- OR divider -->
			<div class="hidden sm:flex items-center gap-2 text-surface-600 self-center">
				<div class="h-8 w-px bg-surface-700"></div>
				<span class="text-xs font-medium">or</span>
				<div class="h-8 w-px bg-surface-700"></div>
			</div>

			<!-- Target Size - Compact dropdown style -->
			<div class="flex flex-col gap-1.5">
				<span class="text-[10px] text-surface-500 uppercase tracking-wider hidden sm:block">Target Size</span>
				<div class="relative">
					<button
						onclick={() => (showSizePresets = !showSizePresets)}
						class="flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 text-sm font-medium rounded-lg transition-all {hasTargetSize
							? 'bg-accent-start text-white shadow-md shadow-accent-start/30'
							: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
					>
						{hasTargetSize ? `${videos.settings.targetSizeMB} MB` : 'Select...'}
						<ChevronDown class="h-3.5 w-3.5" />
					</button>
					
					{#if showSizePresets}
						<button
							class="fixed inset-0 z-40"
							onclick={() => (showSizePresets = false)}
							aria-label="Close"
						></button>
						<div
							class="absolute left-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl bg-surface-800 shadow-xl ring-1 ring-white/10"
							transition:slide={{ duration: 150 }}
						>
							<!-- Custom input -->
							<div class="p-3 border-b border-surface-700/50">
								<div class="flex items-center gap-2">
									<input
										type="text"
										class="flex-1 rounded-lg bg-surface-700 border border-surface-600 px-3 py-1.5 text-sm text-surface-200 placeholder-surface-500 focus:ring-1 focus:ring-accent-start focus:border-accent-start focus:outline-none"
										placeholder="Custom MB"
										bind:value={targetSizeInput}
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												handleTargetSizeChange();
												showSizePresets = false;
											}
										}}
									/>
									<button
										onclick={() => { handleTargetSizeChange(); showSizePresets = false; }}
										class="px-2 py-1.5 text-xs font-medium rounded-lg bg-accent-start text-white hover:bg-accent-start/80"
									>
										Set
									</button>
								</div>
							</div>
							<!-- Presets -->
							<div class="p-1.5">
								{#each sizePresets as preset}
									<button
										onclick={() => handleSizePresetClick(preset.sizeMB)}
										class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all {videos.settings.targetSizeMB === preset.sizeMB
											? 'bg-accent-start/20 text-accent-start'
											: 'text-surface-300 hover:bg-surface-700'}"
									>
										<span class="text-base">{preset.icon}</span>
										<span class="flex-1 text-left">{preset.label}</span>
										<span class="text-xs text-surface-500">{preset.sizeMB} MB</span>
									</button>
								{/each}
							</div>
							{#if hasTargetSize}
								<div class="p-2 border-t border-surface-700/50">
									<button
										onclick={clearTargetSize}
										class="w-full px-3 py-1.5 text-xs text-surface-500 hover:text-surface-300 transition-colors"
									>
										Clear target size
									</button>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
			
			<!-- Active mode indicator -->
			{#if hasTargetSize}
				<p class="text-xs text-accent-start hidden sm:block self-center">
					→ Compressing to {videos.settings.targetSizeMB} MB
				</p>
			{/if}

			<!-- Subtle divider -->
			<div class="hidden sm:block w-px h-5 bg-surface-700/50"></div>

			<!-- Output Format - Inline -->
			<div class="flex gap-1">
				{#each formats as format}
					{@const isDisabled = (format.value === 'av1' && !av1Available) || (format.value === 'hevc' && !hevcAvailable)}
					{@const isHardwareCodec = format.value === 'av1' || format.value === 'hevc'}
					{@const isAvailable = (format.value === 'av1' && av1Available) || (format.value === 'hevc' && hevcAvailable)}
					<button
						onclick={() => !isDisabled && handleFormatChange(format.value)}
						disabled={isDisabled}
						class="relative px-3 py-2.5 sm:py-1.5 text-sm font-medium rounded-lg transition-all {videos
							.settings.outputFormat === format.value
							? 'bg-accent-start text-white shadow-md shadow-accent-start/30'
							: isDisabled
								? 'text-surface-600 cursor-not-allowed opacity-40 line-through'
								: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
						title={isDisabled ? `${format.label} requires hardware encoder (not available on this device)` : format.desc}
					>
						{format.label}
						{#if isHardwareCodec && isAvailable}
							<span
								class="absolute -top-1.5 -right-1.5 px-1 py-0.5 text-[9px] font-bold bg-purple-500 text-white rounded"
							>
								GPU
							</span>
						{:else if isHardwareCodec && isDisabled}
							<span
								class="absolute -top-1.5 -right-1.5 px-1 py-0.5 text-[9px] font-bold bg-surface-600 text-surface-400 rounded"
							>
								N/A
							</span>
						{/if}
					</button>
				{/each}
			</div>

			<!-- Spacer -->
			<div class="flex-1"></div>

			<!-- Advanced toggle -->
			<button
				onclick={() => (isExpanded = !isExpanded)}
				class="flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 text-sm font-medium text-surface-400 hover:text-surface-200 transition-colors"
			>
				<Settings2 class="h-4 w-4" />
				<span class="hidden sm:inline">Advanced</span>
				{#if isExpanded}
					<ChevronUp class="h-3.5 w-3.5" />
				{:else}
					<ChevronDown class="h-3.5 w-3.5" />
				{/if}
			</button>

			<!-- Compress / Re-compress Button -->
			{#if hasPendingVideos}
				<button
					onclick={handleCompressAll}
					disabled={isProcessing || isAnyProcessing}
					class="flex items-center gap-2 px-5 py-3 sm:py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-accent-start to-accent-end text-white shadow-lg shadow-accent-start/30 hover:shadow-xl hover:shadow-accent-start/40 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
				>
					{#if isProcessing || isAnyProcessing}
						<RefreshCw class="h-4 w-4 animate-spin" />
						<span>Compressing...</span>
					{:else}
						<Play class="h-4 w-4" />
						<span>Compress ({pendingVideos.length})</span>
					{/if}
				</button>
			{:else if hasCompletedVideos}
				<button
					onclick={handleRecompressAll}
					disabled={isProcessing || isAnyProcessing}
					class="flex items-center gap-2 px-4 py-2.5 sm:py-2 text-sm font-medium rounded-xl bg-surface-700 text-surface-300 hover:bg-surface-600 transition-all disabled:opacity-50"
				>
					<RefreshCw class="h-4 w-4 {isProcessing || isAnyProcessing ? 'animate-spin' : ''}" />
					<span class="hidden sm:inline">{isProcessing || isAnyProcessing ? 'Working...' : 'Re-compress'}</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- Advanced settings panel -->
	{#if isExpanded}
		<div
			class="border-t border-surface-700/50 bg-surface-900/50 p-4 sm:p-6"
			transition:slide={{ duration: 200 }}
		>
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				<!-- Resolution -->
				<div>
					<div class="flex items-center gap-2 mb-3">
						<Maximize class="h-4 w-4 text-surface-400" />
						<span class="text-sm font-medium text-surface-300">Resolution</span>
						<InfoTooltip content="Downscaling reduces file size significantly. 1080p is usually sufficient for most uses. Higher resolutions are best for archival or professional work." />
					</div>
					<div class="grid grid-cols-2 gap-1.5">
						{#each RESOLUTION_OPTIONS as option}
							<button
								onclick={() => handleResolutionChange(option.value)}
								class="px-3 py-2 text-sm rounded-lg transition-all text-left {videos.settings
									.resolution === option.value
									? 'bg-accent-start/20 text-accent-start ring-1 ring-accent-start/50'
									: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
							>
								<div class="font-medium">{option.label}</div>
								{#if option.pixels}
									<div class="text-xs opacity-70">{option.pixels}</div>
								{/if}
							</button>
						{/each}
					</div>
				</div>

				<!-- Audio -->
				<div>
					<div class="flex items-center gap-2 mb-3">
						<Volume2 class="h-4 w-4 text-surface-400" />
						<span class="text-sm font-medium text-surface-300">Audio Codec</span>
						<InfoTooltip content="AAC is most compatible with all devices. Opus offers better quality at lower bitrates. Keep Original skips re-encoding for fastest processing." />
					</div>
					<div class="grid grid-cols-2 gap-1.5">
						{#each audioCodecs as codec}
							<button
								onclick={() => handleAudioCodecChange(codec.value)}
								class="px-3 py-2 text-sm rounded-lg transition-all text-left {videos.settings
									.audioCodec === codec.value
									? 'bg-accent-start/20 text-accent-start ring-1 ring-accent-start/50'
									: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
							>
								<div class="font-medium">{codec.label}</div>
								<div class="text-xs opacity-70">{codec.desc}</div>
							</button>
						{/each}
					</div>

					<!-- Audio Bitrate -->
					{#if videos.settings.audioCodec !== 'none' && videos.settings.audioCodec !== 'copy'}
						<div class="mt-3">
							<span class="text-xs text-surface-500 mb-2 block">Bitrate</span>
							<div class="flex gap-1">
								{#each AUDIO_BITRATE_OPTIONS as option}
									<button
										onclick={() => handleAudioBitrateChange(option.value)}
										class="flex-1 px-2 py-1.5 text-xs rounded transition-all {videos.settings
											.audioBitrate === option.value
											? 'bg-accent-start text-white'
											: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
										title={option.desc}
									>
										{option.label}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Encoding Speed -->
				<div>
					<div class="flex items-center gap-2 mb-3">
						<Zap class="h-4 w-4 text-surface-400" />
						<span class="text-sm font-medium text-surface-300">Encoding Speed</span>
						<InfoTooltip content="Faster encoding produces larger files. Slower encoding achieves better compression at the same quality level. Use 'Quality' for final exports." />
					</div>
					<div class="space-y-1.5">
						{#each encodingPresets as preset}
							<button
								onclick={() => handleEncodingPresetChange(preset.value)}
								class="w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-all {videos
									.settings.preset === preset.value
									? 'bg-accent-start/20 text-accent-start ring-1 ring-accent-start/50'
									: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
							>
								<div class="text-left">
									<div class="font-medium">{preset.label}</div>
									<div class="text-xs opacity-70">{preset.desc}</div>
								</div>
								<div class="flex gap-0.5">
									{#each Array(4) as _, i}
										<div
											class="w-1.5 h-3 rounded-sm {i < preset.speed
												? 'bg-green-500'
												: 'bg-surface-600'}"
										></div>
									{/each}
								</div>
							</button>
						{/each}
					</div>
				</div>

				<!-- Options -->
				<div>
					<div class="flex items-center gap-2 mb-3">
						<Settings2 class="h-4 w-4 text-surface-400" />
						<span class="text-sm font-medium text-surface-300">Options</span>
					</div>
					<div class="space-y-3">
						<!-- Remove Location Data -->
						<label class="flex items-center gap-3 cursor-pointer group">
							<input
								type="checkbox"
								checked={videos.settings.stripMetadata}
								onchange={(e) =>
									videos.updateSettings({ stripMetadata: e.currentTarget.checked })}
								class="w-5 h-5 rounded bg-surface-700 border-surface-600 text-accent-start focus:ring-accent-start focus:ring-offset-surface-900"
							/>
							<div>
								<div
									class="text-sm font-medium text-surface-300 group-hover:text-surface-100 transition-colors"
								>
									Remove Location Data
								</div>
								<div class="text-xs text-surface-500">Strip GPS, camera info, and metadata</div>
							</div>
						</label>

						<!-- Two-Pass Encoding -->
						<label class="flex items-center gap-3 cursor-pointer group">
							<input
								type="checkbox"
								checked={videos.settings.twoPass}
								onchange={(e) => videos.updateSettings({ twoPass: e.currentTarget.checked })}
								class="w-5 h-5 rounded bg-surface-700 border-surface-600 text-accent-start focus:ring-accent-start focus:ring-offset-surface-900"
								disabled={videos.settings.outputFormat === 'webm'}
							/>
							<div>
								<div
									class="text-sm font-medium text-surface-300 group-hover:text-surface-100 transition-colors {videos
										.settings.outputFormat === 'webm'
										? 'opacity-50'
										: ''}"
								>
									Two-Pass Encoding
								</div>
								<div class="text-xs text-surface-500">
									Better quality, ~2x slower
									{#if videos.settings.outputFormat === 'webm'}
										<span class="text-amber-500">(N/A for WebM)</span>
									{/if}
								</div>
							</div>
						</label>
					</div>

					<!-- Info box -->
					<div class="mt-4 p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
						<div class="flex items-start gap-2">
							<Info class="h-4 w-4 text-surface-400 flex-shrink-0 mt-0.5" />
							<p class="text-xs text-surface-500">
								{#if videos.settings.outputFormat === 'av1'}
									AV1 offers 30-50% better compression than H.264. Requires modern hardware with AV1 encoder.
								{:else if videos.settings.outputFormat === 'hevc'}
									HEVC/H.265 offers ~40% better compression than H.264. Wide hardware support on modern devices.
								{:else if videos.settings.outputFormat === 'webm'}
									VP9 provides excellent compression for web delivery with wide browser support.
								{:else}
									H.264/MP4 is the most compatible format, playable on virtually all devices.
								{/if}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
