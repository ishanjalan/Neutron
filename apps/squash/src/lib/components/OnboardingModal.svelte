<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { Upload, Sliders, Play, Download, X } from 'lucide-svelte';
	import { createFocusTrap } from '@neutron/utils';

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
			color: 'from-orange-500 to-red-500',
		},
		{
			icon: Sliders,
			title: 'Choose settings',
			desc: 'Pick a quality preset or set a target file size for platforms like WhatsApp or Discord.',
			color: 'from-blue-500 to-cyan-500',
		},
		{
			icon: Play,
			title: 'Compress',
			desc: 'Click the Compress button. GPU acceleration makes it blazing fast. Watch real-time progress.',
			color: 'from-green-500 to-emerald-500',
		},
		{
			icon: Download,
			title: 'Download',
			desc: 'Download individual files or get everything as a ZIP. Drag compressed videos directly to your desktop.',
			color: 'from-purple-500 to-pink-500',
		},
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
			class="absolute inset-0 cursor-default bg-black/80 backdrop-blur-sm"
			onclick={handleClose}
			aria-label="Close onboarding"
		></button>

		<!-- Modal -->
		<div
			bind:this={modalRef}
			class="bg-surface-900 relative w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10"
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
					class="text-surface-400 hover:bg-surface-800 hover:text-surface-200 absolute right-4 top-4 rounded-lg p-2 transition-colors"
					aria-label="Close"
				>
					<X class="h-5 w-5" />
				</button>
				<h2 id="onboarding-title" class="text-surface-100 text-2xl font-bold">
					Welcome to <span class="gradient-text">Squash</span>
				</h2>
				<p class="text-surface-400 mt-2">GPU-accelerated video compression that's 100% private</p>
			</div>

			<!-- Steps -->
			<div class="px-6 pb-4">
				<div class="grid gap-4 sm:grid-cols-2">
					{#each steps as step, i}
						<div class="bg-surface-800/50 flex items-start gap-4 rounded-xl p-4">
							<div
								class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br {step.color}"
							>
								<step.icon class="h-5 w-5 text-white" />
							</div>
							<div>
								<div class="flex items-center gap-2">
									<span
										class="bg-surface-700 text-surface-300 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
									>
										{i + 1}
									</span>
									<h3 class="text-surface-200 font-semibold">{step.title}</h3>
								</div>
								<p class="text-surface-400 mt-1 text-sm">{step.desc}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Footer -->
			<div
				class="border-surface-700/50 bg-surface-900/50 flex items-center justify-between border-t px-6 py-4"
			>
				<label class="flex cursor-pointer items-center gap-2">
					<input
						type="checkbox"
						bind:checked={dontShowAgain}
						class="bg-surface-700 border-surface-600 text-accent-start focus:ring-accent-start focus:ring-offset-surface-900 h-4 w-4 rounded"
					/>
					<span class="text-surface-400 text-sm">Don't show this again</span>
				</label>
				<button
					onclick={handleClose}
					class="from-accent-start to-accent-end shadow-accent-start/30 hover:shadow-accent-start/40 rounded-xl bg-gradient-to-r px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl"
				>
					Get Started
				</button>
			</div>
		</div>
	</div>
{/if}
