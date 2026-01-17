<script lang="ts">
	import { Upload, Film } from 'lucide-svelte';
	import { videos } from '$lib/stores/videos.svelte';

	let isDragging = $state(false);
	let fileInput: HTMLInputElement;

	const acceptedFormats = '.mp4,.webm,.mov,.avi';
	const hasVideos = $derived(videos.items.length > 0);

	const formats = [
		{ name: 'MP4', color: 'from-orange-500 to-red-500' },
		{ name: 'WebM', color: 'from-green-500 to-emerald-500' },
		{ name: 'MOV', color: 'from-blue-500 to-indigo-500' },
		{ name: 'AVI', color: 'from-purple-500 to-pink-500' }
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
			// Just add files - don't auto-compress
			await videos.addFiles(files);
		}
	}

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = input.files;
		if (files && files.length > 0) {
			// Just add files - don't auto-compress
			await videos.addFiles(files);
		}
		input.value = '';
	}

	function openFilePicker() {
		fileInput?.click();
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
		accept={acceptedFormats}
		multiple
		class="hidden"
		onchange={handleFileSelect}
	/>

	{#if hasVideos}
		<!-- Compact dropzone when videos exist -->
		<div
			class="group flex items-center justify-center gap-4 rounded-2xl border-2 border-dashed py-4 sm:py-5 px-6 transition-all duration-300 cursor-pointer {isDragging
				? 'border-accent-start bg-accent-start/5'
				: 'border-surface-700 hover:border-accent-start/50'}"
		>
			<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-800 transition-colors group-hover:bg-accent-start/10">
				{#if isDragging}
					<Film class="h-5 w-5 text-accent-start animate-pulse" />
				{:else}
					<Upload class="h-5 w-5 text-surface-400 group-hover:text-accent-start" />
				{/if}
			</div>
			<p class="text-base text-surface-500">
				{#if isDragging}
					<span class="font-medium text-accent-start">Release to add more</span>
				{:else}
					Drop more videos or <span class="font-medium text-accent-start">click to browse</span>
				{/if}
			</p>
		</div>
	{:else}
		<!-- Full dropzone when no videos -->
		<div
			class="group relative overflow-hidden rounded-2xl border-2 border-dashed py-12 sm:py-16 transition-all duration-300 cursor-pointer {isDragging
				? 'border-accent-start bg-accent-start/5 scale-[1.01]'
				: 'border-surface-700 hover:border-accent-start/50'}"
		>
			<!-- Background pattern -->
			<div
				class="absolute inset-0 opacity-[0.05]"
				style="background-image: url(&quot;data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f97316' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E&quot;);"
			></div>

			<div class="relative flex flex-col items-center justify-center px-6 text-center">
				<!-- Icon -->
				<div
					class="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 {isDragging
						? 'bg-accent-start/20 scale-110 rotate-3'
						: 'bg-surface-800 group-hover:bg-accent-start/10 group-hover:scale-105'}"
				>
					{#if isDragging}
						<Film class="h-8 w-8 text-accent-start animate-pulse" />
					{:else}
						<Upload
							class="h-8 w-8 text-surface-400 transition-all group-hover:text-accent-start group-hover:-translate-y-1"
						/>
					{/if}
				</div>

				<!-- Text -->
				{#if isDragging}
					<p class="text-xl font-semibold text-accent-start">Release to upload</p>
					<p class="mt-2 text-base text-accent-start/70">Your videos are ready to be compressed</p>
				{:else}
					<p class="text-xl font-semibold text-surface-300">Drop videos here</p>
					<p class="mt-2 text-base text-surface-500">
						or <span class="font-medium text-accent-start underline-offset-2 hover:underline">click to browse</span>
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
				<p class="mt-5 text-sm text-surface-400">
					Max file size: Unlimited • Batch upload supported
				</p>
			</div>
		</div>
	{/if}
</div>
