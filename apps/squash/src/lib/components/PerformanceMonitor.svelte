<script lang="ts">
	import { videos } from '$lib/stores/videos.svelte';
	import { getCapabilities } from '$lib/utils/compress';
	import { onMount } from 'svelte';
	import { Activity, Cpu, HardDrive, Zap, Check, X as XIcon, Gpu, Server } from 'lucide-svelte';
	import { slide } from 'svelte/transition';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();

	interface Capabilities {
		sharedArrayBuffer: boolean;
		hardwareConcurrency: number;
		deviceMemory: number;
		webCodecs: {
			supported: boolean;
			hardwareAcceleration: boolean;
			supportedVideoCodecs: string[];
			supportedAudioCodecs: string[];
			maxResolution: { width: number; height: number };
		};
		ffmpegLoaded: boolean;
		ffmpegMultiThreaded: boolean;
	}

	let capabilities = $state<Capabilities | null>(null);
	let loading = $state(true);

	onMount(async () => {
		try {
			capabilities = await getCapabilities();
		} catch (e) {
			console.error('Failed to get capabilities:', e);
		} finally {
			loading = false;
		}
	});

	// Compression statistics
	const stats = $derived(() => {
		const completed = videos.items.filter((i) => i.status === 'completed');
		const totalOriginal = completed.reduce((acc, i) => acc + i.originalSize, 0);
		const totalCompressed = completed.reduce((acc, i) => acc + (i.compressedSize || 0), 0);
		const avgCompressionTime =
			completed.length > 0
				? completed.reduce((acc, i) => acc + (i.compressionDuration || 0), 0) / completed.length
				: 0;
		const avgSavings =
			totalOriginal > 0 ? Math.round((1 - totalCompressed / totalOriginal) * 100) : 0;

		// Encoder usage breakdown
		const webCodecsCount = completed.filter((i) => i.encoderUsed === 'webcodecs').length;
		const ffmpegCount = completed.filter((i) => i.encoderUsed === 'ffmpeg').length;

		return {
			totalProcessed: completed.length,
			totalOriginal,
			totalCompressed,
			totalSaved: totalOriginal - totalCompressed,
			avgCompressionTime,
			avgSavings,
			webCodecsCount,
			ffmpegCount,
		};
	});

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	function formatDuration(ms: number): string {
		if (ms < 1000) return `${Math.round(ms)}ms`;
		return `${(ms / 1000).toFixed(1)}s`;
	}
</script>

{#if open}
	<div
		class="bg-surface-900 fixed bottom-4 right-4 z-40 w-96 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10"
		transition:slide={{ duration: 200 }}
	>
		<!-- Header -->
		<div
			class="border-surface-700/50 from-surface-900 to-surface-800 flex items-center justify-between border-b bg-gradient-to-r px-4 py-3"
		>
			<div class="flex items-center gap-2">
				<Activity class="text-accent-start h-4 w-4" />
				<span class="text-surface-200 text-sm font-semibold">Performance Monitor</span>
			</div>
			<button
				onclick={onclose}
				class="text-surface-400 hover:bg-surface-800 hover:text-surface-200 rounded p-1 transition-colors"
				aria-label="Close"
			>
				<XIcon class="h-4 w-4" />
			</button>
		</div>

		{#if loading}
			<div class="p-6 text-center">
				<div
					class="border-accent-start mx-auto h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
				></div>
				<p class="text-surface-400 mt-2 text-sm">Detecting capabilities...</p>
			</div>
		{:else if capabilities}
			<!-- Encoder Status -->
			<div class="border-surface-700/50 border-b p-4">
				<h4 class="text-surface-400 mb-3 text-xs font-semibold uppercase tracking-wider">
					Encoders
				</h4>

				<!-- WebCodecs Status -->
				<div class="bg-surface-800/50 mb-2 rounded-lg p-3">
					<div class="mb-2 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<Gpu class="h-4 w-4 text-purple-400" />
							<span class="text-surface-200 text-sm font-medium">WebCodecs</span>
						</div>
						{#if capabilities.webCodecs.supported}
							<span class="flex items-center gap-1 text-xs font-medium text-green-400">
								<Check class="h-3 w-3" />
								Available
							</span>
						{:else}
							<span class="text-surface-500 flex items-center gap-1 text-xs">
								<XIcon class="h-3 w-3" />
								Not supported
							</span>
						{/if}
					</div>

					{#if capabilities.webCodecs.supported}
						<div class="space-y-1.5 text-xs">
							<div class="flex items-center justify-between">
								<span class="text-surface-400">Hardware Acceleration</span>
								{#if capabilities.webCodecs.hardwareAcceleration}
									<span class="font-medium text-green-400">GPU Enabled 🚀</span>
								{:else}
									<span class="text-amber-400">Software only</span>
								{/if}
							</div>
							<div class="flex items-center justify-between">
								<span class="text-surface-400">Video Codecs</span>
								<span class="text-surface-200">
									{capabilities.webCodecs.supportedVideoCodecs
										.map((c) => c.toUpperCase())
										.join(', ')}
								</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-surface-400">Max Resolution</span>
								<span class="text-surface-200">
									{capabilities.webCodecs.maxResolution.width}×{capabilities.webCodecs.maxResolution
										.height}
								</span>
							</div>
						</div>
					{/if}
				</div>

				<!-- FFmpeg Status -->
				<div class="bg-surface-800/50 rounded-lg p-3">
					<div class="mb-2 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<Server class="h-4 w-4 text-orange-400" />
							<span class="text-surface-200 text-sm font-medium">FFmpeg.wasm</span>
						</div>
						{#if capabilities.ffmpegLoaded}
							<span class="flex items-center gap-1 text-xs font-medium text-green-400">
								<Check class="h-3 w-3" />
								Loaded
							</span>
						{:else if videos.ffmpegLoading}
							<span class="text-xs text-amber-400">Loading...</span>
						{:else}
							<span class="text-surface-500 text-xs">Not loaded</span>
						{/if}
					</div>

					{#if capabilities.ffmpegLoaded}
						<div class="space-y-1.5 text-xs">
							<div class="flex items-center justify-between">
								<span class="text-surface-400">Threading</span>
								<span class="text-surface-200">
									{capabilities.ffmpegMultiThreaded ? 'Multi-threaded' : 'Single-threaded'}
								</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-surface-400">Codecs</span>
								<span class="text-surface-200">H.264, VP9, AV1, AAC, Opus</span>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- System Capabilities -->
			<div class="border-surface-700/50 border-b p-4">
				<h4 class="text-surface-400 mb-3 text-xs font-semibold uppercase tracking-wider">System</h4>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<div class="text-surface-300 flex items-center gap-2 text-sm">
							<Cpu class="text-surface-500 h-4 w-4" />
							CPU Threads
						</div>
						<span class="text-surface-200 font-mono text-sm"
							>{capabilities.hardwareConcurrency}</span
						>
					</div>
					<div class="flex items-center justify-between">
						<div class="text-surface-300 flex items-center gap-2 text-sm">
							<HardDrive class="text-surface-500 h-4 w-4" />
							Device Memory
						</div>
						<span class="text-surface-200 font-mono text-sm">{capabilities.deviceMemory} GB</span>
					</div>
					<div class="flex items-center justify-between">
						<div class="text-surface-300 flex items-center gap-2 text-sm">
							<Zap class="text-surface-500 h-4 w-4" />
							SharedArrayBuffer
						</div>
						{#if capabilities.sharedArrayBuffer}
							<span class="flex items-center gap-1 text-xs text-green-400">
								<Check class="h-3 w-3" />
								Yes
							</span>
						{:else}
							<span class="flex items-center gap-1 text-xs text-amber-400">
								<XIcon class="h-3 w-3" />
								No
							</span>
						{/if}
					</div>
				</div>
			</div>

			<!-- Session Statistics -->
			<div class="p-4">
				<h4 class="text-surface-400 mb-3 text-xs font-semibold uppercase tracking-wider">
					Session Stats
				</h4>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-surface-300 text-sm">Videos processed</span>
						<span class="text-surface-200 font-mono text-sm">{stats().totalProcessed}</span>
					</div>
					{#if stats().totalProcessed > 0}
						<div class="flex items-center justify-between">
							<span class="text-surface-300 text-sm">Total saved</span>
							<span class="font-mono text-sm text-green-400">{formatBytes(stats().totalSaved)}</span
							>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-surface-300 text-sm">Avg. savings</span>
							<span class="text-accent-start font-mono text-sm">{stats().avgSavings}%</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-surface-300 text-sm">Avg. time</span>
							<span class="text-surface-200 font-mono text-sm"
								>{formatDuration(stats().avgCompressionTime)}</span
							>
						</div>
						<!-- Encoder Usage Breakdown -->
						{#if stats().webCodecsCount > 0 || stats().ffmpegCount > 0}
							<div class="border-surface-700/50 mt-2 border-t pt-2">
								<div class="text-surface-400 mb-2 text-xs uppercase tracking-wider">
									Encoder Usage
								</div>
								<div class="flex gap-3">
									{#if stats().webCodecsCount > 0}
										<div
											class="flex items-center gap-1.5 rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-1"
										>
											<Gpu class="h-3 w-3 text-purple-400" />
											<span class="text-xs text-purple-300">{stats().webCodecsCount} GPU</span>
										</div>
									{/if}
									{#if stats().ffmpegCount > 0}
										<div
											class="flex items-center gap-1.5 rounded-md border border-orange-500/20 bg-orange-500/10 px-2 py-1"
										>
											<Server class="h-3 w-3 text-orange-400" />
											<span class="text-xs text-orange-300">{stats().ffmpegCount} Software</span>
										</div>
									{/if}
								</div>
							</div>
						{/if}
					{/if}
				</div>
			</div>

			<!-- Encoder Preference -->
			<div class="px-4 pb-4">
				<div
					class="rounded-lg border border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-orange-500/10 p-3"
				>
					<p class="text-surface-300 text-xs">
						<span class="font-medium text-purple-400">Hybrid Mode:</span>
						{#if capabilities.webCodecs.supported && capabilities.webCodecs.hardwareAcceleration}
							Using GPU acceleration for MP4/WebM, FFmpeg for AV1 and complex operations.
						{:else if capabilities.webCodecs.supported}
							WebCodecs available (software). FFmpeg used as primary encoder.
						{:else}
							FFmpeg.wasm handles all encoding (software).
						{/if}
					</p>
				</div>
			</div>
		{/if}
	</div>
{/if}
