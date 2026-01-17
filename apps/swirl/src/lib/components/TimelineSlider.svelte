<script lang="ts">
	import { Scissors } from 'lucide-svelte';

	let {
		duration,
		startTime = $bindable(0),
		endTime = $bindable(0),
		currentTime = 0,
		onseek,
	}: {
		duration: number;
		startTime: number;
		endTime: number;
		currentTime?: number;
		onseek?: (time: number) => void;
	} = $props();

	let containerRef: HTMLDivElement;
	let isDraggingStart = $state(false);
	let isDraggingEnd = $state(false);
	let isDraggingRange = $state(false);
	let dragStartX = $state(0);
	let dragStartTimeStart = $state(0);
	let dragStartTimeEnd = $state(0);

	const clipDuration = $derived(endTime - startTime);
	const startPercent = $derived(duration > 0 ? (startTime / duration) * 100 : 0);
	const endPercent = $derived(duration > 0 ? (endTime / duration) * 100 : 100);
	const currentPercent = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);

	function getTimeFromPosition(clientX: number): number {
		if (!containerRef || duration === 0) return 0;
		const rect = containerRef.getBoundingClientRect();
		const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
		return (percent / 100) * duration;
	}

	function handlePointerDownStart(e: PointerEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDraggingStart = true;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerDownEnd(e: PointerEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDraggingEnd = true;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerDownRange(e: PointerEvent) {
		e.preventDefault();
		isDraggingRange = true;
		dragStartX = e.clientX;
		dragStartTimeStart = startTime;
		dragStartTimeEnd = endTime;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (isDraggingStart) {
			const newTime = getTimeFromPosition(e.clientX);
			startTime = Math.max(0, Math.min(newTime, endTime - 0.1));
		} else if (isDraggingEnd) {
			const newTime = getTimeFromPosition(e.clientX);
			endTime = Math.max(startTime + 0.1, Math.min(newTime, duration));
		} else if (isDraggingRange && containerRef) {
			const rect = containerRef.getBoundingClientRect();
			const deltaX = e.clientX - dragStartX;
			const deltaTime = (deltaX / rect.width) * duration;

			const newStart = dragStartTimeStart + deltaTime;
			const newEnd = dragStartTimeEnd + deltaTime;

			if (newStart >= 0 && newEnd <= duration) {
				startTime = newStart;
				endTime = newEnd;
			}
		}
	}

	function handlePointerUp(e: PointerEvent) {
		isDraggingStart = false;
		isDraggingEnd = false;
		isDraggingRange = false;
		(e.target as HTMLElement).releasePointerCapture(e.pointerId);
	}

	function handleTrackClick(e: MouseEvent) {
		if (isDraggingStart || isDraggingEnd || isDraggingRange) return;
		const time = getTimeFromPosition(e.clientX);
		onseek?.(time);
	}

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		const ms = Math.floor((seconds % 1) * 10);
		return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
	}
</script>

<div class="space-y-3">
	<!-- Label -->
	<div class="text-surface-300 flex items-center gap-2 text-sm font-medium">
		<Scissors class="h-4 w-4 text-pink-400" />
		<span>Trim Video</span>
		<span class="text-surface-500">({formatTime(clipDuration)} selected)</span>
	</div>

	<!-- Timeline -->
	<div
		bind:this={containerRef}
		class="bg-surface-800 relative h-12 cursor-pointer touch-none select-none overflow-hidden rounded-xl"
		onclick={handleTrackClick}
		role="slider"
		aria-valuenow={startTime}
		aria-valuemin={0}
		aria-valuemax={duration}
		tabindex="0"
	>
		<!-- Timeline ticks -->
		<div class="absolute inset-0 flex">
			{#each Array(10) as _, i}
				<div class="border-surface-700 flex-1 border-r first:border-l"></div>
			{/each}
		</div>

		<!-- Selected range (draggable) -->
		<div
			class="absolute bottom-0 top-0 cursor-grab border-y-2 border-pink-500/50 bg-gradient-to-r from-pink-500/30 to-rose-500/30 active:cursor-grabbing"
			style="left: {startPercent}%; right: {100 - endPercent}%"
			onpointerdown={handlePointerDownRange}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerUp}
			role="presentation"
		>
			<!-- Inner glow -->
			<div class="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent"></div>
		</div>

		<!-- Current playhead -->
		{#if currentTime >= startTime && currentTime <= endTime}
			<div
				class="pointer-events-none absolute bottom-0 top-0 z-10 w-0.5 bg-white/80"
				style="left: {currentPercent}%"
			></div>
		{/if}

		<!-- Start handle -->
		<div
			class="group absolute bottom-0 top-0 z-20 w-4 cursor-ew-resize"
			style="left: calc({startPercent}% - 8px)"
			onpointerdown={handlePointerDownStart}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerUp}
			role="slider"
			aria-label="Start time"
			aria-valuenow={startTime}
			tabindex="0"
		>
			<div
				class="absolute bottom-0 left-1/2 top-0 w-1 -translate-x-1/2 rounded-full bg-pink-500 transition-all group-hover:w-1.5"
			>
				<div
					class="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-pink-500 shadow-lg"
				></div>
				<div
					class="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-pink-500 shadow-lg"
				></div>
			</div>
		</div>

		<!-- End handle -->
		<div
			class="group absolute bottom-0 top-0 z-20 w-4 cursor-ew-resize"
			style="left: calc({endPercent}% - 8px)"
			onpointerdown={handlePointerDownEnd}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerUp}
			role="slider"
			aria-label="End time"
			aria-valuenow={endTime}
			tabindex="0"
		>
			<div
				class="absolute bottom-0 left-1/2 top-0 w-1 -translate-x-1/2 rounded-full bg-rose-500 transition-all group-hover:w-1.5"
			>
				<div
					class="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-rose-500 shadow-lg"
				></div>
				<div
					class="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-rose-500 shadow-lg"
				></div>
			</div>
		</div>
	</div>

	<!-- Time labels -->
	<div class="flex items-center justify-between text-xs">
		<div class="flex items-center gap-2">
			<span class="font-medium text-pink-400">{formatTime(startTime)}</span>
			<span class="text-surface-600">→</span>
			<span class="font-medium text-rose-400">{formatTime(endTime)}</span>
		</div>
		<span class="text-surface-500">Total: {formatTime(duration)}</span>
	</div>

	<!-- Fine-tune inputs -->
	<div class="flex items-center gap-4 text-sm">
		<label class="flex items-center gap-2">
			<span class="text-surface-500">Start:</span>
			<input
				type="number"
				bind:value={startTime}
				min="0"
				max={endTime - 0.1}
				step="0.1"
				class="bg-surface-800 border-surface-700 text-surface-100 w-20 rounded-lg border px-2 py-1 text-center focus:border-pink-500 focus:outline-none"
			/>
		</label>
		<label class="flex items-center gap-2">
			<span class="text-surface-500">End:</span>
			<input
				type="number"
				bind:value={endTime}
				min={startTime + 0.1}
				max={duration}
				step="0.1"
				class="bg-surface-800 border-surface-700 text-surface-100 w-20 rounded-lg border px-2 py-1 text-center focus:border-rose-500 focus:outline-none"
			/>
		</label>
	</div>
</div>
