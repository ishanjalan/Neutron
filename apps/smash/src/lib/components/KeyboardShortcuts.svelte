<script lang="ts">
	import { X } from 'lucide-svelte';
	import { fade, scale } from 'svelte/transition';
	import { trapFocus } from '$lib/utils/focus-trap';

	interface Props {
		show: boolean;
	}

	let { show = $bindable() }: Props = $props();

	const shortcuts = [
		{ keys: ['1'], description: 'Compress' },
		{ keys: ['2'], description: 'Merge' },
		{ keys: ['3'], description: 'Split' },
		{ keys: ['4'], description: 'Rotate' },
		{ keys: ['5'], description: 'Delete Pages' },
		{ keys: ['6'], description: 'Reorder' },
		{ keys: ['7'], description: 'PDF → Images' },
		{ keys: ['8'], description: 'Images → PDF' },
		{ keys: ['9'], description: 'Page Numbers' },
		{ keys: ['⌘/Ctrl', 'Shift', 'D'], description: 'Download all as ZIP' },
		{ keys: ['⌘/Ctrl', 'V'], description: 'Paste from clipboard' },
		{ keys: ['Escape'], description: 'Clear all / Close modal' },
		{ keys: ['?'], description: 'Show this help' }
	];

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			show = false;
		}
	}
</script>

{#if show}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="shortcuts-title"
		tabindex="-1"
		onkeydown={handleKeydown}
		use:trapFocus
		transition:fade={{ duration: 150 }}
	>
		<!-- Backdrop -->
		<button
			class="absolute inset-0 bg-black/60 backdrop-blur-sm"
			onclick={() => (show = false)}
			aria-label="Close"
		></button>

		<!-- Modal -->
		<div
			class="glass relative max-w-md w-full rounded-2xl p-6 shadow-2xl"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			<!-- Header -->
			<div class="flex items-center justify-between mb-6">
				<h2 id="shortcuts-title" class="text-xl font-semibold text-surface-100">
					Keyboard Shortcuts
				</h2>
				<button
					onclick={() => (show = false)}
					class="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors"
					aria-label="Close"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Shortcuts list -->
			<div class="space-y-3">
				{#each shortcuts as shortcut}
					<div class="flex items-center justify-between">
						<span class="text-sm text-surface-400">{shortcut.description}</span>
						<div class="flex items-center gap-1">
							{#each shortcut.keys as key}
								<kbd
									class="px-2 py-1 text-xs font-medium bg-surface-800 text-surface-300 rounded border border-surface-700"
								>
									{key}
								</kbd>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
