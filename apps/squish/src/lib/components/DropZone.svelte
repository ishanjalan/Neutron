<script lang="ts">
	import { Upload, FileImage, AlertCircle, Link, Loader2, X } from 'lucide-svelte';
	import { images } from '$lib/stores/images.svelte';
	import { processImages } from '$lib/utils/compress';
	import { fade } from 'svelte/transition';

	let isDragging = $state(false);
	let fileInput: HTMLInputElement;
	let errorMessage = $state<string | null>(null);
	let errorTimeout: ReturnType<typeof setTimeout>;

	// URL input state
	let showUrlInput = $state(false);
	let urlValue = $state('');
	let isLoadingUrl = $state(false);
	let urlInputRef: HTMLInputElement;

	const acceptedFormats = '.jpg,.jpeg,.png,.webp,.avif,.jxl,.svg,.heic,.heif';
	const validTypes = [
		'image/jpeg',
		'image/jpg',
		'image/png',
		'image/webp',
		'image/avif',
		'image/jxl',
		'image/svg+xml',
		'image/heic',
		'image/heif',
	];
	const hasImages = $derived(images.items.length > 0);

	const formats = [
		{ name: 'JPEG', color: 'from-orange-500 to-red-500' },
		{ name: 'PNG', color: 'from-blue-500 to-indigo-500' },
		{ name: 'WebP', color: 'from-green-500 to-emerald-500' },
		{ name: 'AVIF', color: 'from-purple-500 to-pink-500' },
		{ name: 'JXL', color: 'from-amber-500 to-orange-500' },
		{ name: 'SVG', color: 'from-cyan-500 to-blue-500' },
		{ name: 'HEIC', color: 'from-pink-500 to-rose-500' },
	];

	function showError(message: string) {
		errorMessage = message;
		clearTimeout(errorTimeout);
		errorTimeout = setTimeout(() => {
			errorMessage = null;
		}, 4000);
	}

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

	async function processFiles(files: FileList | File[]) {
		const fileArray = Array.from(files);
		const validFiles = fileArray.filter((f) => validTypes.includes(f.type));
		const skippedCount = fileArray.length - validFiles.length;

		if (skippedCount > 0) {
			const plural = skippedCount === 1 ? 'file was' : 'files were';
			showError(`${skippedCount} ${plural} skipped (unsupported format)`);
		}

		if (validFiles.length > 0) {
			const newItems = await images.addFiles(validFiles);
			if (newItems.length > 0) {
				await processImages(newItems.map((i) => i.id));
			}
		}
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;

		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			await processFiles(files);
		}
	}

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = input.files;
		if (files && files.length > 0) {
			await processFiles(files);
		}
		input.value = '';
	}

	function openFilePicker() {
		fileInput?.click();
	}

	function handleUrlInputClick(e: MouseEvent) {
		e.stopPropagation();
		showUrlInput = true;
		// Focus the input after it's shown
		setTimeout(() => urlInputRef?.focus(), 50);
	}

	function closeUrlInput() {
		showUrlInput = false;
		urlValue = '';
	}

	async function fetchImageFromUrl(url: string) {
		if (!url.trim()) return;

		isLoadingUrl = true;
		try {
			// Validate URL
			const parsedUrl = new URL(url);

			// Fetch the image
			const response = await fetch(url, {
				mode: 'cors',
				credentials: 'omit',
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch: ${response.status}`);
			}

			const contentType = response.headers.get('content-type') || '';
			if (!contentType.startsWith('image/')) {
				throw new Error('URL does not point to an image');
			}

			const blob = await response.blob();

			// Extract filename from URL or use default
			const pathname = parsedUrl.pathname;
			const filename =
				pathname.split('/').pop() || `image-${Date.now()}.${contentType.split('/')[1] || 'png'}`;

			// Create File object
			const file = new File([blob], filename, { type: blob.type });

			// Process the file
			await processFiles([file]);

			// Close the input
			closeUrlInput();
		} catch (error) {
			console.error('URL fetch error:', error);
			if (error instanceof TypeError && error.message.includes('fetch')) {
				showError('CORS blocked - try downloading the image first');
			} else if (error instanceof Error) {
				showError(error.message);
			} else {
				showError('Failed to fetch image from URL');
			}
		} finally {
			isLoadingUrl = false;
		}
	}

	function handleUrlKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			fetchImageFromUrl(urlValue);
		} else if (e.key === 'Escape') {
			closeUrlInput();
		}
	}

	// Export for parent component to call
	export async function processImageUrl(url: string) {
		await fetchImageFromUrl(url);
	}
</script>

<div
	class="relative"
	role="button"
	tabindex="0"
	aria-label="Drop zone for image files"
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
		accept={acceptedFormats}
		multiple
		class="hidden"
		onchange={handleFileSelect}
		aria-hidden="true"
	/>

	{#if hasImages}
		<!-- Compact dropzone when images exist - minimum 44px touch target -->
		<div
			class="group flex min-h-[56px] cursor-pointer items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-5 transition-all duration-300 sm:py-6 {isDragging
				? 'border-accent-start bg-accent-start/5'
				: 'border-surface-700 hover:border-accent-start/50'}"
		>
			<div
				class="bg-surface-800 group-hover:bg-accent-start/10 flex h-12 w-12 items-center justify-center rounded-xl transition-colors"
			>
				{#if isDragging}
					<FileImage class="text-accent-start h-6 w-6 animate-pulse" />
				{:else}
					<Upload class="text-surface-400 group-hover:text-accent-start h-6 w-6" />
				{/if}
			</div>
			<p class="text-surface-500 text-lg">
				{#if isDragging}
					<span class="text-accent-start font-medium">Release to add more</span>
				{:else}
					Drop more images or <span class="text-accent-start font-medium">click to browse</span>
				{/if}
			</p>
		</div>
	{:else}
		<!-- Full dropzone when no images -->
		<div
			class="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed py-12 transition-all duration-300 sm:py-16 {isDragging
				? 'border-accent-start bg-accent-start/5 scale-[1.01]'
				: 'border-surface-700 hover:border-accent-start/50'}"
		>
			<!-- Background pattern -->
			<div
				class="absolute inset-0 opacity-[0.05]"
				style="background-image: url(&quot;data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E&quot;);"
			></div>

			<div class="relative flex flex-col items-center justify-center px-6 text-center">
				<!-- Icon -->
				<div
					class="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 {isDragging
						? 'bg-accent-start/20 rotate-3 scale-110'
						: 'bg-surface-800 group-hover:bg-accent-start/10 group-hover:scale-105'}"
				>
					{#if isDragging}
						<FileImage class="text-accent-start h-8 w-8 animate-pulse" />
					{:else}
						<Upload
							class="text-surface-400 group-hover:text-accent-start h-8 w-8 transition-all group-hover:-translate-y-1"
						/>
					{/if}
				</div>

				<!-- Text -->
				{#if isDragging}
					<p class="text-accent-start text-xl font-semibold">Release to upload</p>
					<p class="text-accent-start/70 mt-2 text-base">Your images are ready to be optimized</p>
				{:else}
					<p class="text-surface-300 text-xl font-semibold">Drop images here</p>
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
					Max file size: Unlimited • Batch upload supported • Paste from clipboard
				</p>
			</div>
		</div>
	{/if}

	<!-- URL Input section -->
	{#if !hasImages}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="mt-4 flex justify-center"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			{#if showUrlInput}
				<div class="flex w-full max-w-md items-center gap-2" transition:fade={{ duration: 150 }}>
					<div class="relative flex-1">
						<Link class="text-surface-400 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
						<input
							bind:this={urlInputRef}
							bind:value={urlValue}
							type="url"
							placeholder="https://example.com/image.jpg"
							class="bg-surface-800 border-surface-700 text-surface-100 placeholder:text-surface-500 focus:border-accent-start focus:ring-accent-start w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1"
							onkeydown={handleUrlKeydown}
							disabled={isLoadingUrl}
						/>
					</div>
					{#if isLoadingUrl}
						<div class="flex h-10 w-10 items-center justify-center">
							<Loader2 class="text-accent-start h-5 w-5 animate-spin" />
						</div>
					{:else}
						<button
							onclick={() => fetchImageFromUrl(urlValue)}
							disabled={!urlValue.trim()}
							class="bg-accent-start hover:bg-accent-start/90 flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
						>
							Fetch
						</button>
						<button
							onclick={closeUrlInput}
							class="text-surface-400 hover:bg-surface-700 hover:text-surface-200 flex h-10 w-10 items-center justify-center rounded-xl"
							aria-label="Close URL input"
						>
							<X class="h-5 w-5" />
						</button>
					{/if}
				</div>
			{:else}
				<button
					onclick={handleUrlInputClick}
					class="text-surface-400 hover:text-accent-start flex items-center gap-2 text-sm transition-colors"
				>
					<Link class="h-4 w-4" />
					<span>or paste image URL</span>
				</button>
			{/if}
		</div>
	{/if}

	<!-- Error message -->
	{#if errorMessage}
		<div
			class="absolute bottom-full left-1/2 mb-3 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500"
			transition:fade={{ duration: 150 }}
			role="alert"
		>
			<AlertCircle class="h-4 w-4 flex-shrink-0" />
			{errorMessage}
		</div>
	{/if}
</div>
