<script lang="ts">
	import { X, Keyboard } from 'lucide-svelte';
	import { fade, scale } from 'svelte/transition';
	import { createFocusTrap } from '$lib/utils/focus-trap';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();

	let modalRef = $state<HTMLDivElement | undefined>(undefined);

	$effect(() => {
		if (open && modalRef) {
			const cleanup = createFocusTrap(modalRef);
			return cleanup;
		}
	});

	const shortcuts = [
		{
			category: 'General',
			items: [
				{ keys: ['Cmd/Ctrl', 'Shift', 'D'], action: 'Download all as ZIP' },
				{ keys: ['Cmd/Ctrl', 'V'], action: 'Paste video from clipboard' },
				{ keys: ['Escape'], action: 'Clear all videos / Close modal' },
				{ keys: ['?'], action: 'Show keyboard shortcuts' }
			]
		},
		{
			category: 'Quality Presets',
			items: [
				{ keys: ['1'], action: 'Tiny quality preset' },
				{ keys: ['2'], action: 'Web quality preset' },
				{ keys: ['3'], action: 'Social quality preset' },
				{ keys: ['4'], action: 'High quality preset' },
				{ keys: ['5'], action: 'Lossless quality preset' }
			]
		},
		{
			category: 'Output Format',
			items: [
				{ keys: ['M'], action: 'Switch to MP4 format' },
				{ keys: ['W'], action: 'Switch to WebM format' },
				{ keys: ['A'], action: 'Switch to AV1 format' }
			]
		},
		{
			category: 'Navigation',
			items: [
				{ keys: ['Tab'], action: 'Navigate between elements' },
				{ keys: ['Enter'], action: 'Activate focused element' },
				{ keys: ['Space'], action: 'Play/pause preview' }
			]
		}
	];

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		transition:fade={{ duration: 150 }}
	>
		<!-- Backdrop -->
		<button
			class="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-default"
			onclick={onclose}
			aria-label="Close shortcuts"
		></button>

		<!-- Modal -->
		<div
			bind:this={modalRef}
			class="relative w-full max-w-2xl max-h-[85vh] overflow-auto rounded-2xl bg-surface-900 shadow-2xl ring-1 ring-white/10"
			role="dialog"
			aria-modal="true"
			aria-labelledby="shortcuts-title"
			onkeydown={handleKeydown}
			tabindex="-1"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			<!-- Header -->
			<div class="sticky top-0 z-10 flex items-center justify-between border-b border-surface-700/50 bg-surface-900/95 backdrop-blur-sm p-6">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-start/20 to-accent-end/20 text-accent-start">
						<Keyboard class="h-5 w-5" />
					</div>
					<h2 id="shortcuts-title" class="text-xl font-bold text-surface-100">
						Keyboard Shortcuts
					</h2>
				</div>
				<button
					onclick={onclose}
					class="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-surface-200 transition-colors"
					aria-label="Close"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Content -->
			<div class="p-6 space-y-8">
				{#each shortcuts as section}
					<div>
						<h3 class="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-4">
							{section.category}
						</h3>
						<div class="space-y-3">
							{#each section.items as shortcut}
								<div class="flex items-center justify-between rounded-lg bg-surface-800/50 px-4 py-3">
									<span class="text-surface-300">{shortcut.action}</span>
									<div class="flex items-center gap-1.5">
										{#each shortcut.keys as key, i}
											{#if i > 0}
												<span class="text-surface-500">+</span>
											{/if}
											<kbd class="min-w-[2rem] rounded-lg bg-surface-700 px-2.5 py-1.5 text-center text-sm font-medium text-surface-200 shadow-sm">
												{key}
											</kbd>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			<!-- Footer -->
			<div class="sticky bottom-0 border-t border-surface-700/50 bg-surface-900/95 backdrop-blur-sm p-4 text-center">
				<p class="text-sm text-surface-500">
					Press <kbd class="rounded bg-surface-700 px-2 py-0.5 text-surface-300">?</kbd> anytime to show this help
				</p>
			</div>
		</div>
	</div>
{/if}
