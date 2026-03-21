<script lang="ts">
	import {
		pdfs,
		COMPRESSION_PRESETS,
		DPI_OPTIONS,
		IMAGE_FORMAT_OPTIONS,
		TOOLS,
	} from '$lib/stores/pdfs.svelte';
	import { processFiles } from '$lib/utils/pdf';
	import { isGhostscriptReady, onInitStart, onInitComplete } from '$lib/utils/ghostscript';
	import { onMount } from 'svelte';
	import {
		Monitor,
		BookOpen,
		Printer,
		FileCheck,
		Play,
		Loader2,
		Lock,
		Info,
		MousePointerClick,
		Type,
	} from 'lucide-svelte';
	import Tooltip from './Tooltip.svelte';

	let isProcessing = $state(false);
	let isLoadingWasm = $state(false);

	const pendingCount = $derived(pdfs.items.filter((i) => i.status === 'pending').length);
	const isAnyProcessing = $derived(pdfs.items.some((i) => i.status === 'processing'));
	const canProcess = $derived(pendingCount > 0);
	const needsMultipleFiles = $derived(
		pdfs.settings.tool === 'merge' || pdfs.settings.tool === 'images-to-pdf'
	);
	const canStartProcessing = $derived(canProcess && (!needsMultipleFiles || pendingCount >= 2));

	const currentTool = $derived(TOOLS.find((t) => t.value === pdfs.settings.tool));

	// For page selection display (split / delete-pages)
	const firstPendingItem = $derived(pdfs.items.find((i) => i.status === 'pending'));
	const visuallySelectedPages = $derived(firstPendingItem?.selectedPages ?? []);
	const hasVisualSelection = $derived(visuallySelectedPages.length > 0);
	let useVisualPicker = $state(true);

	function getProcessLabel() {
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
			case 'protect':
				return 'Protect';
			case 'unlock':
				return 'Unlock';
			case 'ocr':
				return 'Run OCR';
			case 'add-page-numbers':
				return 'Add Numbers';
			case 'watermark':
				return 'Apply';
			case 'edit-metadata':
				return 'Save';
			case 'reverse-pages':
				return 'Reverse';
			case 'remove-blank-pages':
				return 'Remove Blanks';
			default:
				return 'Process';
		}
	}

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

	function getPresetIcon(preset: string) {
		const icons = { Monitor, BookOpen, Printer, FileCheck };
		return (
			icons[
				COMPRESSION_PRESETS[preset as keyof typeof COMPRESSION_PRESETS]?.icon as keyof typeof icons
			] || Monitor
		);
	}

	onMount(() => {
		onInitStart(() => (isLoadingWasm = true));
		onInitComplete(() => (isLoadingWasm = false));
	});

	async function handleApply() {
		if (!canStartProcessing || isProcessing || isAnyProcessing) return;
		isProcessing = true;
		try {
			await processFiles();
		} finally {
			isProcessing = false;
		}
	}
</script>

<div class="flex h-full flex-col overflow-hidden">
	<!-- Tool header -->
	<div class="border-surface-700/50 border-b px-4 py-3">
		<h2 class="text-surface-200 text-sm font-semibold">{currentTool?.label ?? 'Settings'}</h2>
		<p class="text-surface-500 mt-0.5 text-xs">{currentTool?.desc}</p>
	</div>

	<!-- Settings body (scrollable) -->
	<div class="flex-1 space-y-5 overflow-y-auto px-4 py-4">
		<!-- WASM loading -->
		{#if isLoadingWasm}
			<div class="bg-accent-start/10 border-accent-start/30 flex items-center gap-2 rounded-lg border p-3">
				<Loader2 class="text-accent-start h-4 w-4 animate-spin" />
				<span class="text-accent-start text-xs font-medium">Loading compression engine…</span>
			</div>
		{/if}

		<!-- ── Compress ── -->
		{#if pdfs.settings.tool === 'compress'}
			<div class="space-y-2">
				<span class="text-surface-300 text-xs font-semibold uppercase tracking-wider">Quality</span>
				<div class="grid grid-cols-2 gap-2">
					{#each Object.entries(COMPRESSION_PRESETS) as [key, preset] (key)}
						{@const PresetIcon = getPresetIcon(key)}
						<button
							onclick={() => pdfs.updateSettings({ compressionPreset: key as any })}
							class="relative rounded-lg px-3 py-2.5 text-left text-xs transition-all
								{pdfs.settings.compressionPreset === key
								? 'bg-accent-start ring-accent-start/50 text-white ring-2'
								: 'bg-surface-800 text-surface-400 hover:text-surface-200 hover:bg-surface-700'}"
						>
							{#if preset.recommended}
								<div class="absolute -top-1.5 -right-1.5 rounded-full bg-green-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
									Best
								</div>
							{/if}
							<div class="mb-1 flex items-center gap-1.5">
								<PresetIcon class="h-3.5 w-3.5 flex-shrink-0" />
								<span class="font-semibold">{preset.label}</span>
							</div>
							<div class="text-[10px] opacity-70">{preset.desc}</div>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- ── Split / Delete pages ── -->
		{#if pdfs.settings.tool === 'split' || pdfs.settings.tool === 'delete-pages'}
			<div class="space-y-3">
				{#if pdfs.settings.tool === 'split'}
					<div class="space-y-1.5">
						<span class="text-surface-300 text-xs font-semibold uppercase tracking-wider">Split Mode</span>
						<div class="flex gap-2">
							{#each [{ value: 'range', label: 'Page Range' }, { value: 'every-n', label: 'Every N Pages' }] as mode (mode.value)}
								<button
									onclick={() => pdfs.updateSettings({ splitMode: mode.value as any })}
									class="rounded-lg px-3 py-1.5 text-xs transition-all
										{pdfs.settings.splitMode === mode.value
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
					<div class="space-y-1.5">
						<div class="flex items-center justify-between">
							<span class="text-surface-300 text-xs font-semibold uppercase tracking-wider">
								{pdfs.settings.tool === 'delete-pages' ? 'Pages to Delete' : 'Page Range'}
							</span>
							<div class="bg-surface-800 flex items-center gap-0.5 rounded p-0.5">
								<button
									onclick={() => (useVisualPicker = true)}
									class="flex items-center gap-1 rounded px-1.5 py-1 text-[10px] transition-all
										{useVisualPicker ? 'bg-accent-start text-white' : 'text-surface-400 hover:text-surface-200'}"
									title="Click pages in viewer"
								>
									<MousePointerClick class="h-3 w-3" />
									Visual
								</button>
								<button
									onclick={() => (useVisualPicker = false)}
									class="flex items-center gap-1 rounded px-1.5 py-1 text-[10px] transition-all
										{!useVisualPicker ? 'bg-accent-start text-white' : 'text-surface-400 hover:text-surface-200'}"
									title="Type page numbers"
								>
									<Type class="h-3 w-3" />
									Text
								</button>
							</div>
						</div>

						{#if useVisualPicker}
							<div class="bg-surface-800/50 border-surface-700/50 rounded-lg border p-3">
								{#if hasVisualSelection}
									<p class="text-surface-400 mb-1 text-[10px]">{visuallySelectedPages.length} page{visuallySelectedPages.length !== 1 ? 's' : ''} selected</p>
									<p class="text-surface-200 text-xs">{formatPageSelection(visuallySelectedPages)}</p>
								{:else}
									<p class="text-surface-500 text-xs">Click pages in the viewer to select them</p>
								{/if}
							</div>
						{:else}
							<input
								type="text"
								placeholder="e.g. 1-5 or 1, 3, 5-8"
								value={pdfs.settings.splitRange}
								oninput={(e) => pdfs.updateSettings({ splitRange: e.currentTarget.value })}
								class="bg-surface-800 border-surface-700 text-surface-200 focus:border-accent-start w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
							/>
						{/if}
					</div>
				{:else if pdfs.settings.splitMode === 'every-n'}
					<div class="space-y-1.5">
						<label class="text-surface-300 text-xs font-semibold uppercase tracking-wider" for="split-n">Pages per file</label>
						<input
							id="split-n"
							type="number"
							min="1"
							value={pdfs.settings.splitEveryN}
							oninput={(e) => pdfs.updateSettings({ splitEveryN: parseInt(e.currentTarget.value) || 1 })}
							class="bg-surface-800 border-surface-700 text-surface-200 focus:border-accent-start w-24 rounded-lg border px-3 py-2 text-xs focus:outline-none"
						/>
					</div>
				{/if}
			</div>
		{/if}

		<!-- ── Rotate ── -->
		{#if pdfs.settings.tool === 'rotate'}
			<div class="space-y-1.5">
				<span class="text-surface-300 text-xs font-semibold uppercase tracking-wider">Angle</span>
				<div class="flex gap-2">
					{#each [90, 180, 270] as angle (angle)}
						<button
							onclick={() => pdfs.updateSettings({ rotationAngle: angle as any })}
							class="rounded-lg px-4 py-2 text-sm font-medium transition-all
								{pdfs.settings.rotationAngle === angle
								? 'bg-accent-start text-white'
								: 'bg-surface-800 text-surface-400 hover:text-surface-200'}"
						>
							{angle}°
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- ── PDF to Images ── -->
		{#if pdfs.settings.tool === 'pdf-to-images'}
			<div class="space-y-4">
				<div class="space-y-1.5">
					<span class="text-surface-300 text-xs font-semibold uppercase tracking-wider">Format</span>
					<div class="flex gap-2">
						{#each IMAGE_FORMAT_OPTIONS as fmt (fmt.value)}
							<button
								onclick={() => pdfs.updateSettings({ imageFormat: fmt.value })}
								class="rounded-lg px-3 py-1.5 text-xs transition-all
									{pdfs.settings.imageFormat === fmt.value
									? 'bg-accent-start text-white'
									: 'bg-surface-800 text-surface-400 hover:text-surface-200'}"
							>
								{fmt.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="space-y-1.5">
					<span class="text-surface-300 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider">
						DPI
						<Tooltip text="Higher DPI = larger files but better quality. 72 for screens, 300 for print." />
					</span>
					<div class="flex flex-wrap gap-2">
						{#each DPI_OPTIONS as dpi (dpi.value)}
							<button
								onclick={() => pdfs.updateSettings({ imageDPI: dpi.value })}
								class="rounded-lg px-3 py-1.5 text-xs transition-all
									{pdfs.settings.imageDPI === dpi.value
									? 'bg-accent-start text-white'
									: 'bg-surface-800 text-surface-400 hover:text-surface-200'}"
							>
								{dpi.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="space-y-1.5">
					<label for="img-quality" class="text-surface-300 text-xs font-semibold uppercase tracking-wider">
						Quality: {pdfs.settings.imageQuality}%
					</label>
					<input
						id="img-quality"
						type="range"
						min="10"
						max="100"
						step="5"
						value={pdfs.settings.imageQuality}
						oninput={(e) => pdfs.updateSettings({ imageQuality: parseInt(e.currentTarget.value) })}
						class="accent-accent-start w-full"
					/>
				</div>
			</div>
		{/if}

		<!-- ── Protect ── -->
		{#if pdfs.settings.tool === 'protect'}
			<div class="space-y-3">
				<div class="text-surface-400 flex items-center gap-2 text-xs">
					<Lock class="h-3.5 w-3.5 text-green-400" />
					<span>AES-128 encryption</span>
				</div>
				<div class="space-y-1.5">
					<label for="user-pw" class="text-surface-300 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider">
						Password to Open
						<Tooltip text="Required to open the PDF." />
					</label>
					<input
						id="user-pw"
						type="password"
						placeholder="Enter password"
						value={pdfs.settings.userPassword}
						oninput={(e) => pdfs.updateSettings({ userPassword: e.currentTarget.value })}
						class="bg-surface-800 border-surface-700 text-surface-200 focus:border-accent-start w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
					/>
				</div>
				<div class="space-y-1.5">
					<label for="owner-pw" class="text-surface-300 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider">
						Owner Password
						<Tooltip text="Controls editing permissions. Leave blank to use the open password." />
					</label>
					<input
						id="owner-pw"
						type="password"
						placeholder="Same as above if empty"
						value={pdfs.settings.ownerPassword}
						oninput={(e) => pdfs.updateSettings({ ownerPassword: e.currentTarget.value })}
						class="bg-surface-800 border-surface-700 text-surface-200 focus:border-accent-start w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
					/>
				</div>
			</div>
		{/if}

		<!-- ── Unlock ── -->
		{#if pdfs.settings.tool === 'unlock'}
			<div class="space-y-1.5">
				<label for="unlock-pw" class="text-surface-300 text-xs font-semibold uppercase tracking-wider">PDF Password</label>
				<input
					id="unlock-pw"
					type="password"
					placeholder="Enter the PDF password"
					value={pdfs.settings.userPassword}
					oninput={(e) => pdfs.updateSettings({ userPassword: e.currentTarget.value })}
					class="bg-surface-800 border-surface-700 text-surface-200 focus:border-accent-start w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
				/>
			</div>
		{/if}

		<!-- ── OCR ── -->
		{#if pdfs.settings.tool === 'ocr'}
			<div class="space-y-3">
				<div class="space-y-1.5">
					<span class="text-surface-300 text-xs font-semibold uppercase tracking-wider">Language</span>
					<select
						value={pdfs.settings.ocrLanguage}
						onchange={(e) => pdfs.updateSettings({ ocrLanguage: e.currentTarget.value })}
						class="bg-surface-800 border-surface-700 text-surface-200 focus:border-accent-start w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
					>
						<option value="eng">English</option>
						<option value="fra">French</option>
						<option value="deu">German</option>
						<option value="spa">Spanish</option>
						<option value="ita">Italian</option>
						<option value="por">Portuguese</option>
						<option value="rus">Russian</option>
						<option value="chi_sim">Chinese (Simplified)</option>
						<option value="chi_tra">Chinese (Traditional)</option>
						<option value="jpn">Japanese</option>
						<option value="kor">Korean</option>
						<option value="ara">Arabic</option>
					</select>
				</div>
				<div class="space-y-1.5">
					<span class="text-surface-300 text-xs font-semibold uppercase tracking-wider">Output</span>
					<div class="flex flex-col gap-1.5">
						{#each [{ value: 'searchable-pdf', label: 'Searchable PDF' }, { value: 'text-only', label: 'Text File' }, { value: 'text-and-pdf', label: 'Both' }] as mode (mode.value)}
							<button
								onclick={() => pdfs.updateSettings({ ocrOutputMode: mode.value as any })}
								class="rounded-lg px-3 py-1.5 text-left text-xs transition-all
									{pdfs.settings.ocrOutputMode === mode.value
									? 'bg-accent-start text-white'
									: 'bg-surface-800 text-surface-400 hover:text-surface-200'}"
							>
								{mode.label}
							</button>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- ── Add Page Numbers ── -->
		{#if pdfs.settings.tool === 'add-page-numbers'}
			<div class="space-y-3">
				<div class="space-y-1.5">
					<span class="text-surface-300 text-xs font-semibold uppercase tracking-wider">Position</span>
					<div class="grid grid-cols-2 gap-2">
						{#each [{ value: 'bottom-center', label: 'Bottom Center' }, { value: 'bottom-right', label: 'Bottom Right' }, { value: 'top-center', label: 'Top Center' }, { value: 'top-right', label: 'Top Right' }] as pos (pos.value)}
							<button
								onclick={() => pdfs.updateSettings({ pageNumberPosition: pos.value as any })}
								class="rounded-lg px-2 py-1.5 text-xs transition-all
									{pdfs.settings.pageNumberPosition === pos.value
									? 'bg-accent-start text-white'
									: 'bg-surface-800 text-surface-400 hover:text-surface-200'}"
							>
								{pos.label}
							</button>
						{/each}
					</div>
				</div>
				<div class="flex gap-3">
					<div class="space-y-1.5 flex-1">
						<label for="pn-start" class="text-surface-300 text-xs font-semibold uppercase tracking-wider">Start at</label>
						<input
							id="pn-start"
							type="number"
							min="0"
							value={pdfs.settings.pageNumberStartAt}
							oninput={(e) => pdfs.updateSettings({ pageNumberStartAt: parseInt(e.currentTarget.value) || 1 })}
							class="bg-surface-800 border-surface-700 text-surface-200 focus:border-accent-start w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
						/>
					</div>
					<div class="space-y-1.5 flex-1">
						<label for="pn-size" class="text-surface-300 text-xs font-semibold uppercase tracking-wider">Font size</label>
						<input
							id="pn-size"
							type="number"
							min="6"
							max="72"
							value={pdfs.settings.pageNumberFontSize}
							oninput={(e) => pdfs.updateSettings({ pageNumberFontSize: parseInt(e.currentTarget.value) || 12 })}
							class="bg-surface-800 border-surface-700 text-surface-200 focus:border-accent-start w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
						/>
					</div>
				</div>
			</div>
		{/if}

		<!-- ── Watermark ── -->
		{#if pdfs.settings.tool === 'watermark'}
			<div class="space-y-3">
				<div class="space-y-1.5">
					<label for="wm-text" class="text-surface-300 text-xs font-semibold uppercase tracking-wider">Text</label>
					<input
						id="wm-text"
						type="text"
						placeholder="e.g. CONFIDENTIAL"
						value={pdfs.settings.watermarkText}
						oninput={(e) => pdfs.updateSettings({ watermarkText: e.currentTarget.value })}
						class="bg-surface-800 border-surface-700 text-surface-200 focus:border-accent-start w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
					/>
				</div>
				<div class="space-y-1.5">
					<label for="wm-opacity" class="text-surface-300 text-xs font-semibold uppercase tracking-wider">
						Opacity: {pdfs.settings.watermarkOpacity}%
					</label>
					<input
						id="wm-opacity"
						type="range"
						min="5"
						max="100"
						step="5"
						value={pdfs.settings.watermarkOpacity}
						oninput={(e) => pdfs.updateSettings({ watermarkOpacity: parseInt(e.currentTarget.value) })}
						class="accent-accent-start w-full"
					/>
				</div>
				<div class="space-y-1.5">
					<label for="wm-size" class="text-surface-300 text-xs font-semibold uppercase tracking-wider">Font size: {pdfs.settings.watermarkFontSize}pt</label>
					<input
						id="wm-size"
						type="range"
						min="12"
						max="200"
						step="4"
						value={pdfs.settings.watermarkFontSize}
						oninput={(e) => pdfs.updateSettings({ watermarkFontSize: parseInt(e.currentTarget.value) })}
						class="accent-accent-start w-full"
					/>
				</div>
			</div>
		{/if}

		<!-- ── Edit Metadata ── -->
		{#if pdfs.settings.tool === 'edit-metadata'}
			<div class="space-y-3">
				{#each [{ key: 'metadataTitle', label: 'Title', placeholder: 'Document title' }, { key: 'metadataAuthor', label: 'Author', placeholder: 'Author name' }, { key: 'metadataSubject', label: 'Subject', placeholder: 'Subject' }, { key: 'metadataKeywords', label: 'Keywords', placeholder: 'keyword1, keyword2' }] as field (field.key)}
					<div class="space-y-1.5">
						<label for="meta-{field.key}" class="text-surface-300 text-xs font-semibold uppercase tracking-wider">{field.label}</label>
						<input
							id="meta-{field.key}"
							type="text"
							placeholder={field.placeholder}
							value={pdfs.settings[field.key as keyof typeof pdfs.settings] as string}
							oninput={(e) => pdfs.updateSettings({ [field.key]: e.currentTarget.value } as any)}
							class="bg-surface-800 border-surface-700 text-surface-200 focus:border-accent-start w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
						/>
					</div>
				{/each}
			</div>
		{/if}

		<!-- ── Remove Blank Pages ── -->
		{#if pdfs.settings.tool === 'remove-blank-pages'}
			<div class="space-y-1.5">
				<label for="blank-threshold" class="text-surface-300 text-xs font-semibold uppercase tracking-wider">
					Sensitivity: {pdfs.settings.blankPageThreshold}%
					<Tooltip text="0% = only fully blank pages. Higher values remove near-blank pages too." />
				</label>
				<input
					id="blank-threshold"
					type="range"
					min="0"
					max="50"
					step="5"
					value={pdfs.settings.blankPageThreshold}
					oninput={(e) => pdfs.updateSettings({ blankPageThreshold: parseInt(e.currentTarget.value) })}
					class="accent-accent-start w-full"
				/>
			</div>
		{/if}

		<!-- ── Tools with no settings (merge, reorder, images-to-pdf, reverse-pages) ── -->
		{#if ['merge', 'reorder', 'images-to-pdf', 'reverse-pages'].includes(pdfs.settings.tool)}
			<div class="bg-surface-800/50 border-surface-700/50 rounded-lg border p-3">
				<div class="flex items-start gap-2">
					<Info class="text-surface-500 mt-0.5 h-4 w-4 flex-shrink-0" />
					<p class="text-surface-500 text-xs">
						{#if pdfs.settings.tool === 'merge'}
							Drag to reorder files before merging. The output will contain all pages in the order shown.
						{:else if pdfs.settings.tool === 'reorder'}
							Select pages in the viewer. The new order will be saved to the output PDF.
						{:else if pdfs.settings.tool === 'images-to-pdf'}
							Images will become full pages in the order shown. Add multiple images, then click Create PDF.
						{:else if pdfs.settings.tool === 'reverse-pages'}
							All pages will be reversed in order — last page becomes first.
						{/if}
					</p>
				</div>
			</div>
		{/if}
	</div>

	<!-- Apply button (pinned to bottom) -->
	<div class="border-surface-700/50 border-t p-4">
		{#if !canProcess}
			<div class="text-surface-500 rounded-lg py-2 text-center text-xs">
				{needsMultipleFiles ? 'Add at least 2 files to continue' : 'Add a file to get started'}
			</div>
		{:else}
			<button
				onclick={handleApply}
				disabled={!canStartProcessing || isProcessing || isAnyProcessing}
				class="from-accent-start to-accent-end shadow-accent-start/30 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if isProcessing || isAnyProcessing}
					<Loader2 class="h-4 w-4 animate-spin" />
					Processing…
				{:else}
					<Play class="h-4 w-4" fill="currentColor" />
					{getProcessLabel()}
					{#if pendingCount > 1}
						<span class="bg-white/20 rounded-full px-1.5 py-0.5 text-xs">{pendingCount}</span>
					{/if}
				{/if}
			</button>
		{/if}
	</div>
</div>
