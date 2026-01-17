<script lang="ts">
	import { X, AlertTriangle } from 'lucide-svelte';
	import { fade, scale } from 'svelte/transition';

	let {
		open = false,
		title = 'Confirm',
		message = 'Are you sure?',
		confirmText = 'Confirm',
		onconfirm,
		oncancel
	}: {
		open: boolean;
		title?: string;
		message?: string;
		confirmText?: string;
		onconfirm: () => void;
		oncancel: () => void;
	} = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			oncancel();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			oncancel();
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="-1"
		transition:fade={{ duration: 150 }}
	>
		<div
			class="glass w-full max-w-md rounded-2xl p-6 shadow-2xl"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			<!-- Header -->
			<div class="mb-4 flex items-start justify-between">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 text-red-500">
						<AlertTriangle class="h-5 w-5" />
					</div>
					<h2 id="modal-title" class="text-lg font-semibold text-surface-100">{title}</h2>
				</div>
				<button
					onclick={oncancel}
					class="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-700 hover:text-surface-100"
					aria-label="Close"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Body -->
			<p class="mb-6 text-surface-400">{message}</p>

			<!-- Actions -->
			<div class="flex justify-end gap-3">
				<button
					onclick={oncancel}
					class="rounded-xl bg-surface-700 px-5 py-2.5 text-sm font-medium text-surface-300 transition-all hover:bg-surface-600"
				>
					Cancel
				</button>
				<button
					onclick={onconfirm}
					class="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-500/30 transition-all hover:bg-red-600 hover:shadow-xl hover:shadow-red-500/40"
				>
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
