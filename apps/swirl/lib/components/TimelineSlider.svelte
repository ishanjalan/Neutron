<script lang="ts">
	import { Scissors } from 'lucide-svelte';

	let {
		duration,
		startTime = $bindable(0),
		endTime = $bindable(0),
		currentTime = 0,
		onseek
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
	<div class="flex items-center gap-2 text-sm font-medium text-surface-300">
		<Scissors class="h-4 w-4 text-pink-400" />
		<span>Trim Video</span>
		<span class="text-surface-500">({formatTime(clipDuration)} selected)</span>
	</div>

	<!-- Timeline -->
	<div 
		bind:this={containerRef}
		class="relative h-12 bg-surface-800 rounded-xl select-none touch-none overflow-hidden cursor-pointer"
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
				<div class="flex-1 border-r border-surface-700 first:border-l"></div>
			{/each}
		</div>

		<!-- Selected range (draggable) -->
		<div 
			class="absolute top-0 bottom-0 bg-gradient-to-r from-pink-500/30 to-rose-500/30 border-y-2 border-pink-500/50 cursor-grab active:cursor-grabbing"
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
				class="absolute top-0 bottom-0 w-0.5 bg-white/80 pointer-events-none z-10"
				style="left: {currentPercent}%"
			></div>
		{/if}

		<!-- Start handle -->
		<div 
			class="absolute top-0 bottom-0 w-4 cursor-ew-resize z-20 group"
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
			<div class="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 bg-pink-500 rounded-full group-hover:w-1.5 transition-all">
				<div class="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-pink-500 rounded-full shadow-lg"></div>
				<div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-pink-500 rounded-full shadow-lg"></div>
			</div>
		</div>

		<!-- End handle -->
		<div 
			class="absolute top-0 bottom-0 w-4 cursor-ew-resize z-20 group"
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
			<div class="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 bg-rose-500 rounded-full group-hover:w-1.5 transition-all">
				<div class="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-rose-500 rounded-full shadow-lg"></div>
				<div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-rose-500 rounded-full shadow-lg"></div>
			</div>
		</div>
	</div>

	<!-- Time labels -->
	<div class="flex items-center justify-between text-xs">
		<div class="flex items-center gap-2">
			<span class="text-pink-400 font-medium">{formatTime(startTime)}</span>
			<span class="text-surface-600">→</span>
			<span class="text-rose-400 font-medium">{formatTime(endTime)}</span>
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
				class="w-20 rounded-lg bg-surface-800 border border-surface-700 px-2 py-1 text-surface-100 text-center focus:outline-none focus:border-pink-500"
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
				class="w-20 rounded-lg bg-surface-800 border border-surface-700 px-2 py-1 text-surface-100 text-center focus:outline-none focus:border-rose-500"
			/>
		</label>
	</div>
</div>
