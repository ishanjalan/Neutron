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
			ffmpegCount
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
		class="fixed bottom-4 right-4 z-40 w-96 rounded-2xl bg-surface-900 shadow-2xl ring-1 ring-white/10 overflow-hidden"
		transition:slide={{ duration: 200 }}
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-surface-700/50 px-4 py-3 bg-gradient-to-r from-surface-900 to-surface-800">
			<div class="flex items-center gap-2">
				<Activity class="h-4 w-4 text-accent-start" />
				<span class="text-sm font-semibold text-surface-200">Performance Monitor</span>
			</div>
			<button
				onclick={onclose}
				class="rounded p-1 text-surface-400 hover:bg-surface-800 hover:text-surface-200 transition-colors"
				aria-label="Close"
			>
				<XIcon class="h-4 w-4" />
			</button>
		</div>

		{#if loading}
			<div class="p-6 text-center">
				<div class="animate-spin h-8 w-8 border-2 border-accent-start border-t-transparent rounded-full mx-auto"></div>
				<p class="mt-2 text-sm text-surface-400">Detecting capabilities...</p>
			</div>
		{:else if capabilities}
			<!-- Encoder Status -->
			<div class="p-4 border-b border-surface-700/50">
				<h4 class="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">
					Encoders
				</h4>
				
				<!-- WebCodecs Status -->
				<div class="rounded-lg bg-surface-800/50 p-3 mb-2">
					<div class="flex items-center justify-between mb-2">
						<div class="flex items-center gap-2">
							<Gpu class="h-4 w-4 text-purple-400" />
							<span class="text-sm font-medium text-surface-200">WebCodecs</span>
						</div>
						{#if capabilities.webCodecs.supported}
							<span class="flex items-center gap-1 text-green-400 text-xs font-medium">
								<Check class="h-3 w-3" />
								Available
							</span>
						{:else}
							<span class="flex items-center gap-1 text-surface-500 text-xs">
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
									<span class="text-green-400 font-medium">GPU Enabled 🚀</span>
								{:else}
									<span class="text-amber-400">Software only</span>
								{/if}
							</div>
							<div class="flex items-center justify-between">
								<span class="text-surface-400">Video Codecs</span>
								<span class="text-surface-200">
									{capabilities.webCodecs.supportedVideoCodecs.map(c => c.toUpperCase()).join(', ')}
								</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-surface-400">Max Resolution</span>
								<span class="text-surface-200">
									{capabilities.webCodecs.maxResolution.width}×{capabilities.webCodecs.maxResolution.height}
								</span>
							</div>
						</div>
					{/if}
				</div>

				<!-- FFmpeg Status -->
				<div class="rounded-lg bg-surface-800/50 p-3">
					<div class="flex items-center justify-between mb-2">
						<div class="flex items-center gap-2">
							<Server class="h-4 w-4 text-orange-400" />
							<span class="text-sm font-medium text-surface-200">FFmpeg.wasm</span>
						</div>
						{#if capabilities.ffmpegLoaded}
							<span class="flex items-center gap-1 text-green-400 text-xs font-medium">
								<Check class="h-3 w-3" />
								Loaded
							</span>
						{:else if videos.ffmpegLoading}
							<span class="text-amber-400 text-xs">Loading...</span>
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
			<div class="p-4 border-b border-surface-700/50">
				<h4 class="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">
					System
				</h4>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2 text-sm text-surface-300">
							<Cpu class="h-4 w-4 text-surface-500" />
							CPU Threads
						</div>
						<span class="font-mono text-sm text-surface-200">{capabilities.hardwareConcurrency}</span>
					</div>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2 text-sm text-surface-300">
							<HardDrive class="h-4 w-4 text-surface-500" />
							Device Memory
						</div>
						<span class="font-mono text-sm text-surface-200">{capabilities.deviceMemory} GB</span>
					</div>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2 text-sm text-surface-300">
							<Zap class="h-4 w-4 text-surface-500" />
							SharedArrayBuffer
						</div>
						{#if capabilities.sharedArrayBuffer}
							<span class="flex items-center gap-1 text-green-400 text-xs">
								<Check class="h-3 w-3" />
								Yes
							</span>
						{:else}
							<span class="flex items-center gap-1 text-amber-400 text-xs">
								<XIcon class="h-3 w-3" />
								No
							</span>
						{/if}
					</div>
				</div>
			</div>

			<!-- Session Statistics -->
			<div class="p-4">
				<h4 class="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">
					Session Stats
				</h4>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-sm text-surface-300">Videos processed</span>
						<span class="font-mono text-sm text-surface-200">{stats().totalProcessed}</span>
					</div>
					{#if stats().totalProcessed > 0}
						<div class="flex items-center justify-between">
							<span class="text-sm text-surface-300">Total saved</span>
							<span class="font-mono text-sm text-green-400">{formatBytes(stats().totalSaved)}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-surface-300">Avg. savings</span>
							<span class="font-mono text-sm text-accent-start">{stats().avgSavings}%</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-surface-300">Avg. time</span>
							<span class="font-mono text-sm text-surface-200">{formatDuration(stats().avgCompressionTime)}</span>
						</div>
						<!-- Encoder Usage Breakdown -->
						{#if stats().webCodecsCount > 0 || stats().ffmpegCount > 0}
							<div class="pt-2 mt-2 border-t border-surface-700/50">
								<div class="text-xs text-surface-400 uppercase tracking-wider mb-2">Encoder Usage</div>
								<div class="flex gap-3">
									{#if stats().webCodecsCount > 0}
										<div class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20">
											<Gpu class="h-3 w-3 text-purple-400" />
											<span class="text-xs text-purple-300">{stats().webCodecsCount} GPU</span>
										</div>
									{/if}
									{#if stats().ffmpegCount > 0}
										<div class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/20">
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
				<div class="rounded-lg bg-gradient-to-r from-purple-500/10 to-orange-500/10 p-3 border border-purple-500/20">
					<p class="text-xs text-surface-300">
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
