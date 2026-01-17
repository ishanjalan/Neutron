<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { Upload, Sliders, Play, Download, X } from 'lucide-svelte';
	import { createFocusTrap } from '$lib/utils/focus-trap';

	interface Props {
		open: boolean;
		onclose: (dontShowAgain: boolean) => void;
	}

	let { open, onclose }: Props = $props();
	let dontShowAgain = $state(false);
	let modalRef = $state<HTMLDivElement | undefined>(undefined);

	$effect(() => {
		if (open && modalRef) {
			const cleanup = createFocusTrap(modalRef);
			return cleanup;
		}
	});

	const steps = [
		{
			icon: Upload,
			title: 'Drop your videos',
			desc: 'Drag files onto the drop zone, click to browse, or paste with Cmd+V. Supports MP4, WebM, MOV, and AVI.',
			color: 'from-orange-500 to-red-500'
		},
		{
			icon: Sliders,
			title: 'Choose settings',
			desc: 'Pick a quality preset or set a target file size for platforms like WhatsApp or Discord.',
			color: 'from-blue-500 to-cyan-500'
		},
		{
			icon: Play,
			title: 'Compress',
			desc: 'Click the Compress button. GPU acceleration makes it blazing fast. Watch real-time progress.',
			color: 'from-green-500 to-emerald-500'
		},
		{
			icon: Download,
			title: 'Download',
			desc: 'Download individual files or get everything as a ZIP. Drag compressed videos directly to your desktop.',
			color: 'from-purple-500 to-pink-500'
		}
	];

	function handleClose() {
		onclose(dontShowAgain);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleClose();
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
			onclick={handleClose}
			aria-label="Close onboarding"
		></button>

		<!-- Modal -->
		<div
			bind:this={modalRef}
			class="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-surface-900 shadow-2xl ring-1 ring-white/10"
			role="dialog"
			aria-modal="true"
			aria-labelledby="onboarding-title"
			onkeydown={handleKeydown}
			tabindex="-1"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			<!-- Header -->
			<div class="relative p-6 pb-4 text-center">
				<button
					onclick={handleClose}
					class="absolute top-4 right-4 rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-surface-200 transition-colors"
					aria-label="Close"
				>
					<X class="h-5 w-5" />
				</button>
				<h2 id="onboarding-title" class="text-2xl font-bold text-surface-100">
					Welcome to <span class="gradient-text">Squash</span>
				</h2>
				<p class="mt-2 text-surface-400">
					GPU-accelerated video compression that's 100% private
				</p>
			</div>

			<!-- Steps -->
			<div class="px-6 pb-4">
				<div class="grid gap-4 sm:grid-cols-2">
					{#each steps as step, i}
						<div
							class="flex items-start gap-4 rounded-xl bg-surface-800/50 p-4"
						>
							<div
								class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br {step.color}"
							>
								<step.icon class="h-5 w-5 text-white" />
							</div>
							<div>
								<div class="flex items-center gap-2">
									<span class="flex h-5 w-5 items-center justify-center rounded-full bg-surface-700 text-xs font-bold text-surface-300">
										{i + 1}
									</span>
									<h3 class="font-semibold text-surface-200">{step.title}</h3>
								</div>
								<p class="mt-1 text-sm text-surface-400">{step.desc}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-between border-t border-surface-700/50 bg-surface-900/50 px-6 py-4">
				<label class="flex items-center gap-2 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={dontShowAgain}
						class="h-4 w-4 rounded bg-surface-700 border-surface-600 text-accent-start focus:ring-accent-start focus:ring-offset-surface-900"
					/>
					<span class="text-sm text-surface-400">Don't show this again</span>
				</label>
				<button
					onclick={handleClose}
					class="rounded-xl bg-gradient-to-r from-accent-start to-accent-end px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-start/30 hover:shadow-xl hover:shadow-accent-start/40 transition-all"
				>
					Get Started
				</button>
			</div>
		</div>
	</div>
{/if}
