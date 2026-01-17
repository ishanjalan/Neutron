<script lang="ts">
	import {
		pdfs,
		TOOLS,
		TOOL_CATEGORIES,
		COMPRESSION_PRESETS,
		DPI_OPTIONS,
		IMAGE_FORMAT_OPTIONS,
		type PDFTool,
	} from '$lib/stores/pdfs.svelte';
	import { processFiles } from '$lib/utils/pdf';
	import { isGhostscriptReady, onInitStart, onInitComplete } from '$lib/utils/ghostscript';
	import { onMount, onDestroy } from 'svelte';
	import {
		Minimize2,
		Layers,
		Scissors,
		Image,
		FileText,
		Play,
		ChevronDown,
		ChevronUp,
		Settings2,
		Info,
		RotateCw,
		Trash2,
		ArrowUpDown,
		Hash,
		Stamp,
		Lock,
		Unlock,
		Monitor,
		BookOpen,
		Printer,
		FileCheck,
		Loader2,
		MousePointerClick,
		Type,
	} from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import Tooltip from './Tooltip.svelte';

	const iconMap = {
		Minimize2,
		Layers,
		Scissors,
		Image,
		FileText,
		RotateCw,
		Trash2,
		ArrowUpDown,
		Hash,
		Stamp,
		Lock,
		Unlock,
		Monitor,
		BookOpen,
		Printer,
		FileCheck,
	};

	let isExpanded = $state(false);
	let isProcessing = $state(false);
	let showAllTools = $state(false);
	let isLoadingWasm = $state(false);
	let useVisualPicker = $state(true); // Default to visual picker for better UX

	const pendingCount = $derived(pdfs.items.filter((i) => i.status === 'pending').length);
	const hasItems = $derived(pdfs.items.length > 0);
	const canProcess = $derived(pendingCount > 0);
	const isAnyProcessing = $derived(pdfs.items.some((i) => i.status === 'processing'));

	// Get selected pages from the first pending item (for visual picker)
	const firstPendingItem = $derived(pdfs.items.find((i) => i.status === 'pending'));
	const visuallySelectedPages = $derived(firstPendingItem?.selectedPages || []);
	const hasVisualSelection = $derived(visuallySelectedPages.length > 0);
	const totalPageCount = $derived(firstPendingItem?.pageCount || 0);

	// Calculate preview for delete operation (pages that will remain)
	const remainingPagesAfterDelete = $derived(() => {
		if (!totalPageCount || !hasVisualSelection) return [];
		const allPages = Array.from({ length: totalPageCount }, (_, i) => i + 1);
		return allPages.filter((p) => !visuallySelectedPages.includes(p));
	});

	// Format selected pages for display (e.g., "1-3, 5, 7-9")
	function formatPageSelection(pages: number[]): string {
		if (pages.length === 0) return 'None selected';
		if (pages.length === 1) return `Page ${pages[0]}`;

		const sorted = [...pages].sort((a, b) => a - b);
		const ranges: string[] = [];
		let rangeStart = sorted[0];
		let rangeEnd = sorted[0];

		for (let i = 1; i <= sorted.length; i++) {
			if (i < sorted.length && sorted[i] === rangeEnd + 1) {
				rangeEnd = sorted[i];
			} else {
				ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
				if (i < sorted.length) {
					rangeStart = sorted[i];
					rangeEnd = sorted[i];
				}
			}
		}

		return ranges.join(', ');
	}

	// Tools that need settings to be configured before processing
	const toolsNeedingConfig = ['protect', 'unlock', 'watermark', 'split', 'delete-pages'];

	// Auto-expand settings when a tool that needs configuration is selected
	$effect(() => {
		if (toolsNeedingConfig.includes(pdfs.settings.tool)) {
			isExpanded = true;
		}
	});

	// WASM loading state callbacks
	let unsubStart: (() => void) | undefined;
	let unsubComplete: (() => void) | undefined;

	onMount(() => {
		unsubStart = onInitStart(() => {
			isLoadingWasm = true;
		});
		unsubComplete = onInitComplete(() => {
			isLoadingWasm = false;
		});
	});

	onDestroy(() => {
		unsubStart?.();
		unsubComplete?.();
	});

	// Tool-specific requirements
	const currentTool = $derived(TOOLS.find((t) => t.value === pdfs.settings.tool));
	const needsMultipleFiles = $derived(
		pdfs.settings.tool === 'merge' || pdfs.settings.tool === 'images-to-pdf'
	);
	const canStartProcessing = $derived(canProcess && (!needsMultipleFiles || pendingCount >= 2));

	// Get tools by category
	const toolsByCategory = $derived(
		TOOL_CATEGORIES.map((cat) => ({
			...cat,
			tools: TOOLS.filter((t) => t.category === cat.id),
		}))
	);

	// Core tools shown by default
	const coreTools = $derived(TOOLS.filter((t) => t.category === 'core'));
	const displayedTools = $derived(showAllTools ? TOOLS : coreTools);

	function handleToolSelect(tool: PDFTool) {
		pdfs.setTool(tool);
	}

	async function handleProcess() {
		if (!canStartProcessing || isProcessing) return;
		isProcessing = true;
		try {
			await processFiles();
		} finally {
			isProcessing = false;
		}
	}

	function getToolIcon(iconName: string) {
		return iconMap[iconName as keyof typeof iconMap] || FileText;
	}

	function getPresetIcon(preset: string) {
		const icons = { Monitor, BookOpen, Printer, FileCheck };
		return (
			icons[
				COMPRESSION_PRESETS[preset as keyof typeof COMPRESSION_PRESETS]?.icon as keyof typeof icons
			] || Monitor
		);
	}

	function getProcessButtonLabel() {
		switch (pdfs.settings.tool) {
			case 'merge':
				return 'Merge';
			case 'images-to-pdf':
				return 'Create PDF';
			case 'compress':
				return 'Compress';
			case 'split':
				return 'Split';
			case 'rotate':
				return 'Rotate';
			case 'delete-pages':
				return 'Delete';
			case 'reorder':
				return 'Reorder';
			case 'pdf-to-images':
				return 'Convert';
			case 'add-page-numbers':
				return 'Add Numbers';
			case 'watermark':
				return 'Add Watermark';
			case 'protect':
				return 'Protect';
			case 'unlock':
				return 'Unlock';
			default:
				return 'Process';
		}
	}
</script>

<div class="glass space-y-4 rounded-2xl p-4">
	<!-- Tool Tabs -->
	<div class="space-y-3">
		<div class="flex flex-wrap gap-2">
			{#each displayedTools as tool}
				{@const Icon = getToolIcon(tool.icon)}
				<button
					onclick={() => handleToolSelect(tool.value)}
					class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all {pdfs
						.settings.tool === tool.value
						? 'from-accent-start to-accent-end shadow-accent-start/30 bg-gradient-to-r text-white shadow-lg'
						: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
				>
					<Icon class="h-4 w-4" />
					<span class="hidden sm:inline">{tool.label}</span>
				</button>
			{/each}

			<!-- More tools toggle -->
			<button
				onclick={() => (showAllTools = !showAllTools)}
				class="text-surface-500 hover:text-surface-300 hover:bg-surface-700/30 flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium transition-all"
			>
				{showAllTools ? 'Less' : 'More'}
				{#if showAllTools}
					<ChevronUp class="h-3.5 w-3.5" />
				{:else}
					<ChevronDown class="h-3.5 w-3.5" />
				{/if}
			</button>
		</div>

		{#if showAllTools}
			<div
				class="text-surface-500 flex flex-wrap gap-1 text-xs"
				transition:slide={{ duration: 150 }}
			>
				{#each TOOL_CATEGORIES as cat, i}
					{#if i > 0}<span class="text-surface-700">•</span>{/if}
					<span
						class={TOOLS.find((t) => t.value === pdfs.settings.tool)?.category === cat.id
							? 'text-accent-start'
							: ''}>{cat.label}</span
					>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Tool description -->
	<p class="text-surface-500 text-sm">
		{currentTool?.desc}
		{#if needsMultipleFiles}
			<span class="text-surface-400">
				— Add {pendingCount < 2 ? 'at least 2 files' : `${pendingCount} files ready`}</span
			>
		{/if}
	</p>

	<!-- Settings toggle + Process button -->
	<div class="flex items-center justify-between gap-4">
		<button
			onclick={() => (isExpanded = !isExpanded)}
			class="text-surface-400 hover:text-surface-200 flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors"
		>
			<Settings2 class="h-4 w-4" />
			<span>Settings</span>
			{#if isExpanded}
				<ChevronUp class="h-3.5 w-3.5" />
			{:else}
				<ChevronDown class="h-3.5 w-3.5" />
			{/if}
		</button>

		{#if canProcess}
			<button
				onclick={handleProcess}
				disabled={!canStartProcessing || isProcessing || isAnyProcessing}
				class="from-accent-start to-accent-end shadow-accent-start/30 flex items-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<Play class="h-4 w-4" fill="currentColor" />
				{getProcessButtonLabel()}
				({pendingCount})
			</button>
		{/if}
	</div>

	<!-- Expanded Settings -->
	{#if isExpanded}
		<div class="border-surface-700/50 space-y-4 border-t pt-4" transition:slide={{ duration: 200 }}>
			<!-- WASM Loading Indicator -->
			{#if isLoadingWasm}
				<div
					class="bg-accent-start/10 border-accent-start/30 flex items-center gap-2 rounded-lg border p-3"
				>
					<Loader2 class="text-accent-start h-4 w-4 animate-spin" />
					<span class="text-accent-start text-sm font-medium">
						Downloading compression engine (first time only)...
					</span>
				</div>
			{/if}

			<!-- Compression Settings (Ghostscript presets) -->
			{#if pdfs.settings.tool === 'compress'}
				<div class="space-y-2">
					<span class="text-surface-300 text-sm font-medium">Compression Quality</span>
					<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
						{#each Object.entries(COMPRESSION_PRESETS) as [key, preset]}
							{@const PresetIcon = getPresetIcon(key)}
							<button
								onclick={() => pdfs.updateSettings({ compressionPreset: key as any })}
								class="relative rounded-lg px-3 py-2.5 text-sm transition-all {pdfs.settings
									.compressionPreset === key
									? 'bg-accent-start ring-accent-start/50 text-white ring-2'
									: 'bg-surface-800 text-surface-400 hover:text-surface-200 hover:bg-surface-700'}"
							>
								{#if preset.recommended}
									<div
										class="absolute -right-1.5 -top-1.5 rounded-full bg-green-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
									>
										Best
									</div>
								{/if}
								<div class="mb-1 flex items-center justify-center gap-2">
									<PresetIcon class="h-4 w-4" />
									<span class="font-medium">{preset.label}</span>
								</div>
								<div class="text-xs opacity-70">{preset.desc}</div>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Split Settings -->
			{#if pdfs.settings.tool === 'split' || pdfs.settings.tool === 'delete-pages'}
				<div class="space-y-3">
					{#if pdfs.settings.tool === 'split'}
						<div class="space-y-2">
							<span class="text-surface-300 text-sm font-medium">Split Mode</span>
							<div class="flex gap-2">
								{#each [{ value: 'range', label: 'Page Range' }, { value: 'every-n', label: 'Every N Pages' }] as mode}
									<button
										onclick={() => pdfs.updateSettings({ splitMode: mode.value as any })}
										class="rounded-lg px-3 py-2 text-sm transition-all {pdfs.settings.splitMode ===
										mode.value
											? 'bg-accent-start text-white'
											: 'bg-surface-800 text-surface-400 hover:text-surface-200'}"
									>
										{mode.label}
									</button>
								{/each}
							</div>
						</div>
					{/if}

					{#if pdfs.settings.splitMode === 'range' || pdfs.settings.tool === 'delete-pages'}
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<label for="split-range" class="text-surface-300 text-sm font-medium">
									{pdfs.settings.tool === 'delete-pages' ? 'Pages to Delete' : 'Page Range'}
								</label>
								<!-- Toggle between visual and text input -->
								<div class="bg-surface-800 flex items-center gap-1 rounded-lg p-0.5">
									<button
										onclick={() => (useVisualPicker = true)}
										class="flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-all {useVisualPicker
											? 'bg-accent-start text-white'
											: 'text-surface-400 hover:text-surface-200'}"
										title="Click pages in viewer below"
									>
										<MousePointerClick class="h-3 w-3" />
										Visual
									</button>
									<button
										onclick={() => (useVisualPicker = false)}
										class="flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-all {!useVisualPicker
											? 'bg-accent-start text-white'
											: 'text-surface-400 hover:text-surface-200'}"
										title="Type page numbers"
									>
										<Type class="h-3 w-3" />
										Text
									</button>
								</div>
							</div>

							{#if useVisualPicker}
								<!-- Visual picker info -->
								<div class="bg-surface-800/50 border-surface-700/50 rounded-lg border p-3">
									<div class="mb-2 flex items-center justify-between">
										<span class="text-surface-400 text-xs">Selected pages:</span>
										{#if hasVisualSelection}
											<span class="text-accent-start text-xs font-medium"
												>{visuallySelectedPages.length} page{visuallySelectedPages.length !== 1
													? 's'
													: ''}</span
											>
										{/if}
									</div>
									{#if hasVisualSelection}
										<p class="text-surface-200 text-sm font-medium">
											{formatPageSelection(visuallySelectedPages)}
										</p>
									{:else}
										<p class="text-surface-500 text-sm">
											Click pages in the viewer below to select them
										</p>
									{/if}
								</div>
							{:else}
								<!-- Text input -->
								<input
									id="split-range"
									type="text"
									placeholder="e.g., 1-5 or 1, 3, 5-8"
									value={pdfs.settings.splitRange}
									oninput={(e) => pdfs.updateSettings({ splitRange: e.currentTarget.value })}
									class="bg-surface-800 border-surface-700 text-surface-200 focus:border-accent-start w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
								/>
							{/if}
						</div>
					{:else if pdfs.settings.splitMode === 'every-n'}
						<div class="space-y-2">
							<label for="split-every" class="text-surface-300 text-sm font-medium"
								>Pages per file</label
							>
							<input
								id="split-every"
								type="number"
								min="1"
								value={pdfs.settings.splitEveryN}
								oninput={(e) =>
									pdfs.updateSettings({ splitEveryN: parseInt(e.currentTarget.value) || 1 })}
								class="bg-surface-800 border-surface-700 text-surface-200 focus:border-accent-start w-24 rounded-lg border px-3 py-2 text-sm focus:outline-none"
							/>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Rotate Settings -->
			{#if pdfs.settings.tool === 'rotate'}
				<div class="space-y-2">
					<span class="text-surface-300 text-sm font-medium">Rotation Angle</span>
					<div class="flex gap-2">
						{#each [90, 180, 270] as angle}
							<button
								onclick={() => pdfs.updateSettings({ rotationAngle: angle as any })}
								class="rounded-lg px-4 py-2 text-sm transition-all {pdfs.settings.rotationAngle ===
								angle
									? 'bg-accent-start text-white'
									: 'bg-surface-800 text-surface-400 hover:text-surface-200'}"
							>
								{angle}°
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- PDF to Images Settings -->
			{#if pdfs.settings.tool === 'pdf-to-images'}
				<div class="space-y-3">
					<div class="space-y-2">
						<span class="text-surface-300 text-sm font-medium">Image Format</span>
						<div class="flex gap-2">
							{#each IMAGE_FORMAT_OPTIONS as format}
								<button
									onclick={() => pdfs.updateSettings({ imageFormat: format.value })}
									class="rounded-lg px-3 py-2 text-sm transition-all {pdfs.settings.imageFormat ===
									format.value
										? 'bg-accent-start text-white'
										: 'bg-surface-800 text-surface-400 hover:text-surface-200'}"
								>
									{format.label}
								</button>
							{/each}
						</div>
					</div>

					<div class="space-y-2">
						<span class="text-surface-300 flex items-center gap-1 text-sm font-medium">
							Resolution (DPI)
							<Tooltip
								text="DPI (Dots Per Inch) controls image quality. 72 is good for screens, 150 for general use, 300 for printing. Higher DPI = larger file size."
							/>
						</span>
						<div class="flex gap-2">
							{#each DPI_OPTIONS as dpi}
								<button
									onclick={() => pdfs.updateSettings({ imageDPI: dpi.value })}
									class="rounded-lg px-3 py-2 text-sm transition-all {pdfs.settings.imageDPI ===
									dpi.value
										? 'bg-accent-start text-white'
										: 'bg-surface-800 text-surface-400 hover:text-surface-200'}"
								>
									{dpi.label}
								</button>
							{/each}
						</div>
					</div>

					<div class="space-y-2">
						<label for="image-quality" class="text-surface-300 text-sm font-medium">
							Quality: {pdfs.settings.imageQuality}%
						</label>
						<input
							id="image-quality"
							type="range"
							min="10"
							max="100"
							step="5"
							value={pdfs.settings.imageQuality}
							oninput={(e) =>
								pdfs.updateSettings({ imageQuality: parseInt(e.currentTarget.value) })}
							class="accent-accent-start w-full"
						/>
					</div>
				</div>
			{/if}

			<!-- Page Numbers Settings -->
			{#if pdfs.settings.tool === 'add-page-numbers'}
				<div class="space-y-2">
					<span class="text-surface-300 text-sm font-medium">Position</span>
					<div class="grid grid-cols-2 gap-2">
						{#each [{ value: 'bottom-center', label: 'Bottom Center' }, { value: 'bottom-right', label: 'Bottom Right' }, { value: 'top-center', label: 'Top Center' }, { value: 'top-right', label: 'Top Right' }] as pos}
							<button
								onclick={() => pdfs.updateSettings({ pageNumberPosition: pos.value as any })}
								class="rounded-lg px-3 py-2 text-sm transition-all {pdfs.settings
									.pageNumberPosition === pos.value
									? 'bg-accent-start text-white'
									: 'bg-surface-800 text-surface-400 hover:text-surface-200'}"
							>
								{pos.label}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Watermark Settings -->
			{#if pdfs.settings.tool === 'watermark'}
				<div class="space-y-3">
					<div class="space-y-2">
						<label for="watermark-text" class="text-surface-300 text-sm font-medium"
							>Watermark Text</label
						>
						<input
							id="watermark-text"
							type="text"
							placeholder="Enter watermark text"
							value={pdfs.settings.watermarkText}
							oninput={(e) => pdfs.updateSettings({ watermarkText: e.currentTarget.value })}
							class="bg-surface-800 border-surface-700 text-surface-200 focus:border-accent-start w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
						/>
					</div>
					<div class="space-y-2">
						<label for="watermark-opacity" class="text-surface-300 text-sm font-medium">
							Opacity: {pdfs.settings.watermarkOpacity}%
						</label>
						<input
							id="watermark-opacity"
							type="range"
							min="5"
							max="100"
							step="5"
							value={pdfs.settings.watermarkOpacity}
							oninput={(e) =>
								pdfs.updateSettings({ watermarkOpacity: parseInt(e.currentTarget.value) })}
							class="accent-accent-start w-full"
						/>
					</div>
				</div>
			{/if}

			<!-- Password Protection Settings -->
			{#if pdfs.settings.tool === 'protect'}
				<div class="space-y-3">
					<!-- Encryption info -->
					<div class="text-surface-400 flex items-center gap-2 text-xs">
						<Lock class="h-3.5 w-3.5 text-green-400" />
						<span>Uses AES-256 encryption</span>
						<Tooltip
							text="AES-256 is the same military-grade encryption used by banks and governments. It's virtually impossible to crack without the password."
						/>
					</div>
					<div class="space-y-2">
						<label
							for="user-password"
							class="text-surface-300 flex items-center gap-1 text-sm font-medium"
						>
							Password to Open
							<Tooltip
								text="This password will be required every time someone tries to open the PDF."
							/>
						</label>
						<input
							id="user-password"
							type="password"
							placeholder="Enter password"
							value={pdfs.settings.userPassword}
							oninput={(e) => pdfs.updateSettings({ userPassword: e.currentTarget.value })}
							class="bg-surface-800 border-surface-700 text-surface-200 focus:border-accent-start w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
						/>
					</div>
					<div class="space-y-2">
						<label
							for="owner-password"
							class="text-surface-300 flex items-center gap-1 text-sm font-medium"
						>
							Owner Password (optional)
							<Tooltip
								text="The owner password controls editing permissions. If set differently from the open password, users can view but not edit the PDF. Leave empty to use the same password for both."
							/>
						</label>
						<input
							id="owner-password"
							type="password"
							placeholder="Same as above if empty"
							value={pdfs.settings.ownerPassword}
							oninput={(e) => pdfs.updateSettings({ ownerPassword: e.currentTarget.value })}
							class="bg-surface-800 border-surface-700 text-surface-200 focus:border-accent-start w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
						/>
					</div>
				</div>
			{/if}

			<!-- Unlock Settings -->
			{#if pdfs.settings.tool === 'unlock'}
				<div class="space-y-2">
					<label for="unlock-password" class="text-surface-300 text-sm font-medium"
						>PDF Password</label
					>
					<input
						id="unlock-password"
						type="password"
						placeholder="Enter the PDF password"
						value={pdfs.settings.userPassword}
						oninput={(e) => pdfs.updateSettings({ userPassword: e.currentTarget.value })}
						class="bg-surface-800 border-surface-700 text-surface-200 focus:border-accent-start w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
					/>
				</div>
			{/if}

			<!-- Output Preview (for split/delete operations) -->
			{#if (pdfs.settings.tool === 'split' || pdfs.settings.tool === 'delete-pages') && hasVisualSelection && totalPageCount > 0}
				<div
					class="rounded-lg border border-green-500/30 bg-green-500/10 p-3"
					transition:slide={{ duration: 150 }}
				>
					<div class="flex items-start gap-2">
						<FileCheck class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
						<div class="text-xs">
							<p class="mb-1 font-medium text-green-400">Output Preview</p>
							{#if pdfs.settings.tool === 'split'}
								<p class="text-surface-300">
									New PDF will contain <span class="font-semibold text-green-400"
										>{visuallySelectedPages.length}</span
									>
									page{visuallySelectedPages.length !== 1 ? 's' : ''}:
									<span class="text-surface-400">{formatPageSelection(visuallySelectedPages)}</span>
								</p>
							{:else if pdfs.settings.tool === 'delete-pages'}
								{@const remaining = remainingPagesAfterDelete()}
								<p class="text-surface-300">
									After deleting {visuallySelectedPages.length} page{visuallySelectedPages.length !==
									1
										? 's'
										: ''},
									<span class="font-semibold text-green-400">{remaining.length}</span>
									page{remaining.length !== 1 ? 's' : ''} will remain
									{#if remaining.length > 0 && remaining.length <= 10}
										: <span class="text-surface-400">{formatPageSelection(remaining)}</span>
									{/if}
								</p>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			<!-- Info box -->
			<div class="bg-surface-800/50 border-surface-700/50 rounded-lg border p-3">
				<div class="flex items-start gap-2">
					<Info class="text-surface-400 mt-0.5 h-4 w-4 flex-shrink-0" />
					<p class="text-surface-500 text-xs">
						{#if pdfs.settings.tool === 'compress'}
							Uses Ghostscript for true PDF compression. Text remains selectable. Higher quality =
							larger files.
						{:else if pdfs.settings.tool === 'merge'}
							Drag to reorder files before merging. The output will contain all pages in the order
							shown.
						{:else if pdfs.settings.tool === 'split'}
							Select pages in the viewer below, then click Split to extract them. Original file is
							not modified.
						{:else if pdfs.settings.tool === 'rotate'}
							Rotate all pages in the PDF by the selected angle. Clockwise rotation.
						{:else if pdfs.settings.tool === 'delete-pages'}
							Select pages to delete in the viewer below. Click thumbnails to toggle selection.
						{:else if pdfs.settings.tool === 'reorder'}
							Drag pages to rearrange them. The new order will be saved to the output PDF.
						{:else if pdfs.settings.tool === 'pdf-to-images'}
							Each page will be exported as a separate image file. Higher DPI = larger files but
							better quality.
						{:else if pdfs.settings.tool === 'images-to-pdf'}
							Images will be added as full pages in the order shown. Drag to reorder before creating
							PDF.
						{:else if pdfs.settings.tool === 'add-page-numbers'}
							Add page numbers to every page. Numbers start from 1.
						{:else if pdfs.settings.tool === 'watermark'}
							Add a diagonal text watermark across all pages. Adjust opacity as needed.
						{:else if pdfs.settings.tool === 'protect'}
							Add password protection using AES-256 encryption. You'll need this password to open
							the PDF.
						{:else if pdfs.settings.tool === 'unlock'}
							Remove password protection from a PDF. You'll need to know the current password.
						{/if}
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>
