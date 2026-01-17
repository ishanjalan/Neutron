<script lang="ts">
	import { Upload, FileText, Image } from 'lucide-svelte';
	import { pdfs, TOOLS } from '$lib/stores/pdfs.svelte';

	let isDragging = $state(false);
	let fileInput: HTMLInputElement;

	const currentTool = $derived(TOOLS.find(t => t.value === pdfs.settings.tool));
	const acceptedFormats = $derived(currentTool?.accepts || '.pdf');
	const hasItems = $derived(pdfs.items.length > 0);
	const isImageTool = $derived(pdfs.settings.tool === 'images-to-pdf');

	const formats = $derived(
		isImageTool
			? [
					{ name: 'JPG', color: 'from-orange-500 to-red-500' },
					{ name: 'PNG', color: 'from-green-500 to-emerald-500' },
					{ name: 'WebP', color: 'from-purple-500 to-pink-500' }
			  ]
			: [{ name: 'PDF', color: 'from-sky-500 to-cyan-500' }]
	);

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
			await pdfs.addFiles(files);
		}
	}

	function openFilePicker() {
		fileInput?.click();
	}

	async function handleFileInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const files = target.files;
		if (files && files.length > 0) {
			await pdfs.addFiles(files);
		}
		// Reset input so the same file can be selected again
		target.value = '';
	}
</script>

<div
	class="relative"
	role="button"
	tabindex="0"
	aria-label={isImageTool ? 'Drop images here or click to browse' : 'Drop PDF files here or click to browse'}
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
		onchange={handleFileInput}
	/>

	<div
		class="relative overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 {isDragging
			? 'border-accent-start bg-accent-start/10 scale-[1.02]'
			: 'border-surface-700 hover:border-surface-600 bg-surface-900/50'}"
	>
		<div
			class="flex flex-col items-center justify-center gap-6 px-6 py-12 sm:py-16 {hasItems
				? 'py-8 sm:py-10'
				: ''}"
		>
			<!-- Icon -->
			<div
				class="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-start/20 to-accent-end/20 {isDragging
					? 'animate-pulse-glow'
					: ''}"
			>
				{#if isImageTool}
					<Image
						class="h-10 w-10 text-accent-start transition-transform {isDragging ? 'scale-110' : ''}"
					/>
				{:else}
					<FileText
						class="h-10 w-10 text-accent-start transition-transform {isDragging ? 'scale-110' : ''}"
					/>
				{/if}

				<div
					class="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-surface-800 ring-2 ring-surface-900"
				>
					<Upload class="h-4 w-4 text-accent-start" />
				</div>
			</div>

			<!-- Text -->
			<div class="text-center">
				<p class="text-lg sm:text-xl font-medium text-surface-200">
					{#if isDragging}
						Drop to add files
					{:else if hasItems}
						Add more files
					{:else}
						Drop {isImageTool ? 'images' : 'PDFs'} here or click to browse
					{/if}
				</p>
				<p class="mt-2 text-sm text-surface-500">
					{#if isImageTool}
						Supports JPG, PNG, WebP
					{:else}
						Supports PDF files
					{/if}
				</p>
			</div>

			<!-- Format badges -->
			{#if !hasItems}
				<div class="flex flex-wrap justify-center gap-2">
					{#each formats as format}
						<span
							class="rounded-full bg-gradient-to-r {format.color} px-3 py-1 text-xs font-bold uppercase text-white shadow-lg"
						>
							{format.name}
						</span>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Animated border gradient on drag -->
		{#if isDragging}
			<div class="absolute inset-0 rounded-3xl gradient-border pointer-events-none"></div>
		{/if}
	</div>
</div>
