<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Upload, Link, Loader2, X, FolderOpen } from 'lucide-svelte';
	import { fade } from 'svelte/transition';

	export interface FormatBadge {
		name: string;
		color: string; // Tailwind gradient classes, e.g. "from-blue-500 to-indigo-500"
	}

	interface Props {
		/** Accepted MIME types/extensions for the file picker, e.g. "image/*,.heic" */
		accept?: string;
		/** Allow selecting multiple files */
		multiple?: boolean;
		/** Show compact layout (e.g. when files already exist) */
		compact?: boolean;
		/** Allow folder drop and folder picker button */
		allowFolders?: boolean;
		/** Show URL fetch input */
		allowUrlInput?: boolean;
		/** Called with all files from drop, picker, or folder */
		onfiles: (files: File[]) => void;
		/** Format badge descriptors shown in the full layout */
		formatBadges?: FormatBadge[];
		/** Main title text in full layout */
		title?: string;
		/** Subtitle / hints text in full layout */
		subtitle?: string;
		/** Compact layout label when not dragging */
		compactLabel?: string;
		/** Custom icon snippet (receives isDragging: boolean) */
		icon?: Snippet<[boolean]>;
		/** Extra content rendered below badges in the full layout (e.g. demo) */
		children?: Snippet;
	}

	let {
		accept = '*',
		multiple = true,
		compact = false,
		allowFolders = false,
		allowUrlInput = false,
		onfiles,
		formatBadges,
		title = 'Drop files here',
		subtitle = 'or click to browse',
		compactLabel = 'Drop more files or click to browse',
		icon,
		children,
	}: Props = $props();

	let isDragging = $state(false);
	let fileInput = $state<HTMLInputElement | undefined>(undefined);
	let folderInput = $state<HTMLInputElement | undefined>(undefined);

	// URL input state
	let showUrlInput = $state(false);
	let urlValue = $state('');
	let isLoadingUrl = $state(false);
	let urlError = $state('');

	// ──────────────────────────────────────────────────────────────────────
	// Drag events
	// ──────────────────────────────────────────────────────────────────────

	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		if (
			e.clientX < rect.left ||
			e.clientX > rect.right ||
			e.clientY < rect.top ||
			e.clientY > rect.bottom
		) {
			isDragging = false;
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}

	// ──────────────────────────────────────────────────────────────────────
	// Folder support (recursive via File System Entries API)
	// ──────────────────────────────────────────────────────────────────────

	function readDirectoryEntries(dir: FileSystemDirectoryEntry): Promise<File[]> {
		return new Promise((resolve) => {
			const reader = dir.createReader();
			const all: File[] = [];

			function readBatch() {
				reader.readEntries(async (entries) => {
					if (entries.length === 0) {
						resolve(all);
						return;
					}
					const promises = entries.map((entry) => {
						if (entry.isFile) {
							return new Promise<File | null>((res) => {
								(entry as FileSystemFileEntry).file(
									(f) => res(f),
									() => res(null)
								);
							});
						}
						if (entry.isDirectory) {
							return readDirectoryEntries(entry as FileSystemDirectoryEntry);
						}
						return Promise.resolve(null);
					});
					const results = await Promise.all(promises);
					for (const r of results) {
						if (r instanceof File) all.push(r);
						else if (Array.isArray(r)) all.push(...r);
					}
					readBatch();
				});
			}
			readBatch();
		});
	}

	async function extractFilesFromDataTransfer(dt: DataTransfer): Promise<File[]> {
		const all: File[] = [];
		const promises: Promise<File | File[] | null>[] = [];

		for (let i = 0; i < dt.items.length; i++) {
			const entry = dt.items[i].webkitGetAsEntry?.();
			if (!entry) continue;
			if (entry.isFile) {
				promises.push(
					new Promise<File | null>((res) => {
						(entry as FileSystemFileEntry).file(
							(f) => res(f),
							() => res(null)
						);
					})
				);
			} else if (entry.isDirectory) {
				promises.push(readDirectoryEntries(entry as FileSystemDirectoryEntry));
			}
		}

		const results = await Promise.all(promises);
		for (const r of results) {
			if (r instanceof File) all.push(r);
			else if (Array.isArray(r)) all.push(...r);
		}
		return all;
	}

	// ──────────────────────────────────────────────────────────────────────
	// Drop + file picker
	// ──────────────────────────────────────────────────────────────────────

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (!e.dataTransfer) return;

		if (
			allowFolders &&
			e.dataTransfer.items?.length > 0 &&
			typeof e.dataTransfer.items[0].webkitGetAsEntry === 'function'
		) {
			const files = await extractFilesFromDataTransfer(e.dataTransfer);
			if (files.length > 0) onfiles(files);
		} else {
			const files = e.dataTransfer.files;
			if (files?.length > 0) onfiles(Array.from(files));
		}
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files?.length) {
			onfiles(Array.from(input.files));
		}
		input.value = '';
	}

	function openFilePicker() {
		fileInput?.click();
	}

	function openFolderPicker(e: MouseEvent) {
		e.stopPropagation();
		folderInput?.click();
	}

	// ──────────────────────────────────────────────────────────────────────
	// URL fetching
	// ──────────────────────────────────────────────────────────────────────

	async function handleUrlSubmit(e?: Event) {
		e?.preventDefault();
		const url = urlValue.trim();
		if (!url) return;

		try {
			new URL(url);
		} catch {
			urlError = 'Please enter a valid URL';
			return;
		}

		isLoadingUrl = true;
		urlError = '';

		try {
			const response = await fetch(url);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);

			const contentType = response.headers.get('content-type') || '';
			const blob = await response.blob();

			let filename = url.split('/').pop()?.split('?')[0] || `file-${Date.now()}`;
			if (!filename.includes('.')) {
				const ext = contentType.split('/')[1]?.split(';')[0];
				if (ext) filename += `.${ext}`;
			}

			onfiles([new File([blob], filename, { type: blob.type || contentType })]);
			urlValue = '';
			showUrlInput = false;
		} catch (err) {
			if (err instanceof TypeError && err.message.includes('fetch')) {
				urlError = 'Cannot fetch this URL (CORS blocked). Try downloading the file first.';
			} else {
				urlError = err instanceof Error ? err.message : 'Failed to fetch file';
			}
		} finally {
			isLoadingUrl = false;
		}
	}

	function handleUrlKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleUrlSubmit();
		else if (e.key === 'Escape') {
			showUrlInput = false;
			urlValue = '';
			urlError = '';
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="relative"
	role="button"
	tabindex="0"
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
	onclick={openFilePicker}
	onkeydown={(e) => e.key === 'Enter' && openFilePicker()}
	aria-label="File drop zone"
>
	<input
		bind:this={fileInput}
		type="file"
		{accept}
		{multiple}
		class="hidden"
		onchange={handleFileSelect}
		aria-hidden="true"
	/>
	{#if allowFolders}
		<!-- @ts-ignore webkitdirectory is non-standard but widely supported -->
		<input
			bind:this={folderInput}
			type="file"
			multiple
			webkitdirectory
			class="hidden"
			onchange={handleFileSelect}
			aria-hidden="true"
		/>
	{/if}

	{#if compact}
		<!-- ── Compact layout ─────────────────────────────────────────── -->
		<div
			class="group flex min-h-[56px] cursor-pointer items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-4 transition-all duration-300 sm:py-5 {isDragging
				? 'border-accent-start bg-accent-start/5'
				: 'border-surface-700 hover:border-accent-start/50'}"
		>
			<div
				class="bg-surface-800 group-hover:bg-accent-start/10 flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
			>
				{#if icon}
					{@render icon(isDragging)}
				{:else}
					<Upload
						class="{isDragging
							? 'text-accent-start animate-pulse'
							: 'text-surface-400 group-hover:text-accent-start'} h-5 w-5"
					/>
				{/if}
			</div>
			<p class="text-surface-500 text-base">
				{#if isDragging}
					<span class="text-accent-start font-medium">Release to add more</span>
				{:else}
					{compactLabel}
				{/if}
			</p>
		</div>

		{#if allowUrlInput && !showUrlInput}
			<button
				type="button"
				class="text-surface-500 hover:text-accent-start mt-2 text-sm transition-colors"
				onclick={(e) => {
					e.stopPropagation();
					showUrlInput = true;
				}}
			>
				<Link class="mr-1 inline h-3.5 w-3.5" />
				or paste a URL
			</button>
		{/if}
	{:else}
		<!-- ── Full layout ──────────────────────────────────────────────── -->
		<div
			class="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed py-12 transition-all duration-300 sm:py-16 {isDragging
				? 'border-accent-start bg-accent-start/5 scale-[1.01]'
				: 'border-surface-700 hover:border-accent-start/50'}"
		>
			<!-- Subtle background pattern -->
			<div
				class="absolute inset-0 opacity-[0.03]"
				style="background-image: url(&quot;data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E&quot;);"
			></div>

			<div class="relative flex flex-col items-center justify-center px-6 text-center">
				<!-- Icon -->
				<div
					class="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 {isDragging
						? 'bg-accent-start/20 scale-110 rotate-3'
						: 'bg-surface-800 group-hover:bg-accent-start/10 group-hover:scale-105'}"
				>
					{#if icon}
						{@render icon(isDragging)}
					{:else}
						<Upload
							class="{isDragging
								? 'text-accent-start animate-pulse'
								: 'text-surface-400 group-hover:text-accent-start'} h-8 w-8 transition-all group-hover:-translate-y-1"
						/>
					{/if}
				</div>

				{#if isDragging}
					<p class="text-accent-start text-xl font-semibold">Release to upload</p>
					<p class="text-accent-start/70 mt-2 text-base">Your files are ready to be processed</p>
				{:else}
					<p class="text-surface-300 text-xl font-semibold">{title}</p>
					<p class="text-surface-500 mt-2 text-base">
						or <span class="text-accent-start font-medium underline-offset-2 hover:underline"
							>{subtitle}</span
						>
					</p>
					{#if allowFolders}
						<button
							onclick={openFolderPicker}
							class="text-surface-400 hover:text-accent-start mt-1 flex items-center gap-1.5 text-sm transition-colors"
						>
							<FolderOpen class="h-4 w-4" />
							<span class="underline-offset-2 hover:underline">or select a folder</span>
						</button>
					{/if}
				{/if}

				{#if formatBadges?.length}
					<div class="mt-6 flex flex-wrap items-center justify-center gap-2">
						{#each formatBadges as badge (badge.name)}
							<span
								class="rounded-lg bg-gradient-to-r {badge.color} px-3 py-1 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-105"
							>
								{badge.name}
							</span>
						{/each}
					</div>
				{/if}

				{#if allowUrlInput && !showUrlInput}
					<button
						type="button"
						class="text-surface-500 hover:text-accent-start mt-4 inline-flex items-center gap-1.5 text-sm transition-colors"
						onclick={(e) => {
							e.stopPropagation();
							showUrlInput = true;
						}}
					>
						<Link class="h-4 w-4" />
						or paste a URL
					</button>
				{/if}

				{#if children}
					<div class="mt-8">
						{@render children()}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- URL Input Field -->
	{#if allowUrlInput && showUrlInput}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="mt-3" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
			<div class="flex gap-2" transition:fade={{ duration: 150 }}>
				<div class="relative flex-1">
					<Link class="text-surface-500 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
					<input
						type="url"
						bind:value={urlValue}
						onkeydown={handleUrlKeydown}
						placeholder="https://example.com/file"
						disabled={isLoadingUrl}
						class="bg-surface-800 border-surface-700 text-surface-100 placeholder:text-surface-500 focus:border-accent-start focus:ring-accent-start w-full rounded-xl border py-2.5 pr-4 pl-10 text-sm focus:ring-1 focus:outline-none disabled:opacity-50"
					/>
				</div>
				<button
					type="button"
					onclick={handleUrlSubmit}
					disabled={isLoadingUrl || !urlValue.trim()}
					class="bg-accent-start hover:bg-accent-start/90 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if isLoadingUrl}
						<Loader2 class="h-4 w-4 animate-spin" />
					{:else}
						Fetch
					{/if}
				</button>
				<button
					type="button"
					onclick={() => {
						showUrlInput = false;
						urlValue = '';
						urlError = '';
					}}
					class="bg-surface-800 text-surface-400 hover:text-surface-100 hover:bg-surface-700 rounded-xl px-3 py-2.5 transition-colors"
				>
					<X class="h-4 w-4" />
				</button>
			</div>
			{#if urlError}
				<p class="mt-2 text-sm text-red-400">{urlError}</p>
			{/if}
		</div>
	{/if}
</div>
