<script lang="ts" module>
	import { Check, X, AlertCircle, Info } from 'lucide-svelte';

	export type ToastType = 'success' | 'error' | 'info';

	export interface ToastAction {
		label: string;
		onClick: () => void;
	}

	export interface ToastOptions {
		duration?: number;
		action?: ToastAction;
	}

	export interface Toast {
		id: string;
		message: string;
		type: ToastType;
		duration?: number;
		action?: ToastAction;
	}

	// Global toast state
	let toasts = $state<Toast[]>([]);

	export function addToast(
		message: string, 
		type: ToastType = 'info', 
		options?: number | ToastOptions
	): string {
		const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
		
		// Handle both old API (duration as number) and new API (options object)
		let duration = 3000;
		let action: ToastAction | undefined;
		
		if (typeof options === 'number') {
			duration = options;
		} else if (options) {
			duration = options.duration ?? 3000;
			action = options.action;
		}
		
		toasts = [...toasts, { id, message, type, duration, action }];

		// Auto-dismiss
		if (duration > 0) {
			setTimeout(() => {
				removeToast(id);
			}, duration);
		}

		return id;
	}

	export function removeToast(id: string): void {
		toasts = toasts.filter(t => t.id !== id);
	}

	// Convenience methods
	export const toast = {
		success: (message: string, options?: number | ToastOptions) => addToast(message, 'success', options),
		error: (message: string, options?: number | ToastOptions) => addToast(message, 'error', typeof options === 'number' ? options : { duration: options?.duration ?? 5000, action: options?.action }),
		info: (message: string, options?: number | ToastOptions) => addToast(message, 'info', options)
	};
</script>

<script lang="ts">
	import { fly, fade } from 'svelte/transition';

	const icons = {
		success: Check,
		error: AlertCircle,
		info: Info
	};

	const styles = {
		success: 'bg-green-500/10 border-green-500/30 text-green-500',
		error: 'bg-red-500/10 border-red-500/30 text-red-500',
		info: 'bg-accent-start/10 border-accent-start/30 text-accent-start'
	};

	function handleAction(toastItem: Toast) {
		if (toastItem.action) {
			toastItem.action.onClick();
			removeToast(toastItem.id);
		}
	}
</script>

{#if toasts.length > 0}
	<div
		class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm"
		role="region"
		aria-label="Notifications"
		aria-live="polite"
	>
		{#each toasts as toastItem (toastItem.id)}
			{@const IconComponent = icons[toastItem.type]}
			<div
				class="glass flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg {styles[toastItem.type]}"
				in:fly={{ x: 100, duration: 200 }}
				out:fade={{ duration: 150 }}
				role="alert"
			>
				<IconComponent class="h-5 w-5 flex-shrink-0" />
				<p class="flex-1 text-sm font-medium text-surface-100">
					{toastItem.message}
				</p>
				{#if toastItem.action}
					<button
						onclick={() => handleAction(toastItem)}
						class="flex-shrink-0 rounded-lg px-2 py-1 text-sm font-medium bg-surface-700 text-surface-200 transition-colors hover:bg-surface-600"
					>
						{toastItem.action.label}
					</button>
				{/if}
				<button
					onclick={() => removeToast(toastItem.id)}
					class="flex-shrink-0 rounded-lg p-1 text-surface-400 transition-colors hover:bg-surface-700 hover:text-surface-300"
					aria-label="Dismiss notification"
				>
					<X class="h-4 w-4" />
				</button>
			</div>
		{/each}
	</div>
{/if}
