<script lang="ts">
	import { Upload, Film, Image, Link, Loader2, X } from 'lucide-svelte';

	interface Props {
		accept?: string;
		acceptLabel?: string;
		onfiles: (files: File[]) => void;
		compact?: boolean;
	}

	let {
		accept = '.gif,.mp4,.webm,.mov,.webp,.png,.apng',
		acceptLabel = 'GIF, MP4, WebM, MOV, WebP, PNG',
		onfiles,
		compact = false,
	}: Props = $props();

	let isDragging = $state(false);
	let fileInput: HTMLInputElement;
	let urlInput = $state('');
	let isLoadingUrl = $state(false);
	let urlError = $state('');
	let showUrlInput = $state(false);

	const formats = [
		{ name: 'GIF', color: 'from-pink-500 to-rose-500' },
		{ name: 'MP4', color: 'from-orange-500 to-amber-500' },
		{ name: 'WebM', color: 'from-green-500 to-emerald-500' },
		{ name: 'WebP', color: 'from-blue-500 to-cyan-500' },
	];

	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const x = e.clientX;
		const y = e.clientY;
		if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
			isDragging = false;
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;

		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			onfiles(Array.from(files));
		}
	}

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = input.files;
		if (files && files.length > 0) {
			onfiles(Array.from(files));
		}
		input.value = '';
	}

	function openFilePicker() {
		fileInput?.click();
	}

	async function handleUrlSubmit(e?: Event) {
		e?.preventDefault();

		const url = urlInput.trim();
		if (!url) return;

		// Basic URL validation
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

			if (!response.ok) {
				throw new Error(`Failed to fetch: ${response.status}`);
			}

			const contentType = response.headers.get('content-type') || '';
			const blob = await response.blob();

			// Extract filename from URL or generate one
			let filename = url.split('/').pop()?.split('?')[0] || 'file';

			// Add extension based on content type if missing
			if (!filename.includes('.')) {
				if (contentType.includes('gif')) filename += '.gif';
				else if (contentType.includes('mp4')) filename += '.mp4';
				else if (contentType.includes('webm')) filename += '.webm';
				else if (contentType.includes('webp')) filename += '.webp';
				else if (contentType.includes('png')) filename += '.png';
				else if (contentType.includes('jpeg') || contentType.includes('jpg')) filename += '.jpg';
			}

			const file = new File([blob], filename, { type: blob.type || contentType });
			onfiles([file]);
			urlInput = '';
			showUrlInput = false;
		} catch (err) {
			console.error('URL fetch error:', err);
			if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
				urlError = 'Cannot fetch this URL (CORS blocked). Try downloading the file first.';
			} else {
				urlError = err instanceof Error ? err.message : 'Failed to fetch file';
			}
		} finally {
			isLoadingUrl = false;
		}
	}

	function handleUrlKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleUrlSubmit();
		} else if (e.key === 'Escape') {
			showUrlInput = false;
			urlInput = '';
			urlError = '';
		}
	}
</script>

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
>
	<input
		bind:this={fileInput}
		type="file"
		{accept}
		multiple
		class="hidden"
		onchange={handleFileSelect}
	/>

	{#if compact}
		<!-- Compact dropzone -->
		<div
			class="group flex cursor-pointer items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-4 transition-all duration-300 sm:py-5 {isDragging
				? 'border-accent-start bg-accent-start/5'
				: 'border-surface-700 hover:border-accent-start/50'}"
		>
			<div
				class="bg-surface-800 group-hover:bg-accent-start/10 flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
			>
				{#if isDragging}
					<Film class="text-accent-start h-5 w-5 animate-pulse" />
				{:else}
					<Upload class="text-surface-400 group-hover:text-accent-start h-5 w-5" />
				{/if}
			</div>
			<p class="text-surface-500 text-base">
				{#if isDragging}
					<span class="text-accent-start font-medium">Release to add more</span>
				{:else}
					Drop more files or <span class="text-accent-start font-medium">click to browse</span>
				{/if}
			</p>
		</div>

		<!-- URL input for compact mode -->
		{#if !showUrlInput}
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
		<!-- Full dropzone -->
		<div
			class="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed py-12 transition-all duration-300 sm:py-16 {isDragging
				? 'border-accent-start bg-accent-start/5 scale-[1.01]'
				: 'border-surface-700 hover:border-accent-start/50'}"
		>
			<!-- Background pattern -->
			<div
				class="absolute inset-0 opacity-[0.03]"
				style="background-image: url(&quot;data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ec4899' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E&quot;);"
			></div>

			<div class="relative flex flex-col items-center justify-center px-6 text-center">
				<!-- Icon -->
				<div
					class="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 {isDragging
						? 'bg-accent-start/20 rotate-3 scale-110'
						: 'bg-surface-800 group-hover:bg-accent-start/10 group-hover:scale-105'}"
				>
					{#if isDragging}
						<Film class="text-accent-start h-8 w-8 animate-pulse" />
					{:else}
						<Upload
							class="text-surface-400 group-hover:text-accent-start h-8 w-8 transition-all group-hover:-translate-y-1"
						/>
					{/if}
				</div>

				<!-- Text -->
				{#if isDragging}
					<p class="text-accent-start text-xl font-semibold">Release to upload</p>
					<p class="text-accent-start/70 mt-2 text-base">Your files are ready to be processed</p>
				{:else}
					<p class="text-surface-300 text-xl font-semibold">Drop files here</p>
					<p class="text-surface-500 mt-2 text-base">
						or <span class="text-accent-start font-medium underline-offset-2 hover:underline"
							>click to browse</span
						>
					</p>
				{/if}

				<!-- Supported formats -->
				<div class="mt-6 flex flex-wrap items-center justify-center gap-2">
					{#each formats as format}
						<span
							class="rounded-lg bg-gradient-to-r {format.color} px-3 py-1 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-105"
						>
							{format.name}
						</span>
					{/each}
				</div>
				<p class="text-surface-400 mt-5 text-sm">
					{acceptLabel} • Large files supported • Batch upload
				</p>

				<!-- URL input toggle -->
				{#if !showUrlInput}
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
			</div>
		</div>
	{/if}

	<!-- URL Input Field (shown when toggled) -->
	{#if showUrlInput}
		<div class="mt-3" onclick={(e) => e.stopPropagation()}>
			<div class="flex gap-2">
				<div class="relative flex-1">
					<Link class="text-surface-500 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
					<input
						type="url"
						bind:value={urlInput}
						onkeydown={handleUrlKeydown}
						placeholder="https://example.com/image.gif"
						disabled={isLoadingUrl}
						class="bg-surface-800 border-surface-700 text-surface-100 placeholder:text-surface-500 focus:border-accent-start focus:ring-accent-start w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 disabled:opacity-50"
					/>
				</div>
				<button
					type="button"
					onclick={handleUrlSubmit}
					disabled={isLoadingUrl || !urlInput.trim()}
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
						urlInput = '';
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
