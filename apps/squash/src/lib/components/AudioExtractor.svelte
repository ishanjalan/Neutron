<script lang="ts">
	import Header from '#lib/components/Header.svelte';
	import { DropZone, Footer, Toast, toast, SEOSection, RelatedTools } from '@neutron/ui';
	import { downloadAllAsZip, downloadBlob } from '@neutron/utils/download';
	import { formatBytes } from '@neutron/utils';
	import { resolve } from '$app/paths';
	import { onMount, onDestroy } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { Music, Download, X, Loader2, Check } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import { audioSEO } from '#lib/seo-content.ts';
	import { squashRelated } from '#lib/related-tools.ts';
	import { isSupportedVideo, rejectionMessage } from '#lib/utils/file-rejection.ts';
	import { CompressionCancelledError, isUnsupportedInputError } from '#lib/utils/webcodecs.ts';
	import {
		AUDIO_FORMATS,
		AUDIO_FORMAT_ORDER,
		AUDIO_BITRATE_CHOICES,
		DEFAULT_AUDIO_BITRATE,
		NoAudioTrackError,
		audioFilename,
		detectAudioFormats,
		extractAudio,
		type AudioFormat,
	} from '#lib/utils/audio-extract.ts';

	const siteUrl = 'https://ishanjalan.github.io/Squash';

	type RowStatus = 'ready' | 'working' | 'done' | 'error';
	interface Row {
		id: string;
		file: File;
		status: RowStatus;
		progress: number;
		format?: AudioFormat;
		blob?: Blob;
		error?: string;
	}

	const formatBadges = [
		{ name: 'MP4', color: 'from-orange-500 to-red-500' },
		{ name: 'WebM', color: 'from-green-500 to-emerald-500' },
		{ name: 'MOV', color: 'from-blue-500 to-indigo-500' },
		{ name: 'MKV', color: 'from-cyan-500 to-teal-500' },
	];

	let rows = $state<Row[]>([]);
	let format = $state<AudioFormat>('mp3');
	let bitrate = $state<number>(DEFAULT_AUDIO_BITRATE);
	let available = $state<Record<AudioFormat, boolean>>({
		mp3: true,
		m4a: true,
		opus: true,
		wav: true,
	});
	let busy = $state(false);

	const controllers = new SvelteMap<string, AbortController>();
	const info = $derived(AUDIO_FORMATS[format]);
	const readyCount = $derived(rows.filter((r) => r.status === 'ready').length);
	const doneRows = $derived(rows.filter((r) => r.status === 'done' && r.blob));

	onMount(async () => {
		available = await detectAudioFormats();
		// If the default isn't producible here, fall back to the first format that is
		if (!available[format]) {
			format = AUDIO_FORMAT_ORDER.find((f) => available[f]) ?? 'mp3';
		}
	});

	onDestroy(() => {
		for (const controller of controllers.values()) controller.abort();
	});

	function patch(id: string, changes: Partial<Row>) {
		rows = rows.map((r) => (r.id === id ? { ...r, ...changes } : r));
	}

	function addFiles(files: File[]) {
		const rejected: File[] = [];
		const added: Row[] = [];
		for (const file of files) {
			if (!isSupportedVideo(file)) {
				rejected.push(file);
				continue;
			}
			added.push({
				id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
				file,
				status: 'ready',
				progress: 0,
			});
		}
		rows = [...rows, ...added];
		if (rejected.length > 0) toast.error(rejectionMessage(rejected));
	}

	/** Changing format or quality makes finished results stale — put them back to ready. */
	function invalidateDone() {
		rows = rows.map((r) => {
			if (r.status !== 'done') return r;
			return { ...r, status: 'ready', progress: 0, blob: undefined };
		});
	}

	function chooseFormat(next: AudioFormat) {
		if (!available[next] || next === format) return;
		format = next;
		invalidateDone();
	}

	function chooseBitrate(next: number) {
		if (next === bitrate) return;
		bitrate = next;
		invalidateDone();
	}

	async function extractOne(row: Row) {
		const controller = new AbortController();
		controllers.set(row.id, controller);
		patch(row.id, { status: 'working', progress: 0, error: undefined, format });
		try {
			const blob = await extractAudio(row.file, format, bitrate, {
				signal: controller.signal,
				onProgress: (progress) => patch(row.id, { progress }),
			});
			patch(row.id, {
				status: 'done',
				progress: 100,
				blob,
			});
		} catch (error) {
			if (error instanceof CompressionCancelledError) {
				patch(row.id, { status: 'ready', progress: 0 });
			} else if (error instanceof NoAudioTrackError) {
				patch(row.id, { status: 'error', error: error.message });
			} else if (isUnsupportedInputError(error)) {
				patch(row.id, {
					status: 'error',
					error:
						'Squash can’t read this file — its format or codec isn’t supported by your browser. Try converting it to MP4 first.',
				});
			} else {
				console.error('Audio extraction failed:', error);
				patch(row.id, {
					status: 'error',
					error: error instanceof Error ? error.message : 'Audio extraction failed',
				});
			}
		} finally {
			controllers.delete(row.id);
		}
	}

	async function extractAll() {
		if (busy) return;
		busy = true;
		for (const row of rows.filter((r) => r.status === 'ready')) {
			// A row may have been removed or cancelled while earlier ones ran
			const current = rows.find((r) => r.id === row.id);
			if (current?.status === 'ready') await extractOne(current);
		}
		busy = false;
	}

	function cancel(id: string) {
		controllers.get(id)?.abort();
	}

	function remove(id: string) {
		controllers.get(id)?.abort();
		rows = rows.filter((r) => r.id !== id);
	}

	function clearAll() {
		for (const row of rows) {
			controllers.get(row.id)?.abort();
		}
		rows = [];
	}

	async function downloadZip() {
		await downloadAllAsZip(
			doneRows.map((r) => ({
				name: audioFilename(r.file.name, r.format ?? format),
				blob: r.blob!,
			})),
			'squash-audio.zip'
		);
	}

	const breadcrumbs = [
		{ name: 'Squash', item: `${siteUrl}/` },
		{ name: 'Video to MP3', item: `${siteUrl}/video-to-mp3` },
	];
	const title = 'Video to MP3 Converter — Free, No Upload | Squash';
	const description =
		'Extract audio from MP4, WebM, MOV or MKV videos as MP3, M4A, Opus or WAV in your browser. No upload, no account, no watermark.';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:url" content="{siteUrl}/video-to-mp3" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href="{siteUrl}/video-to-mp3" />
</svelte:head>

{#snippet iconSnippet(isDragging: boolean)}
	<Music
		class={isDragging
			? 'text-accent-start h-5 w-5 animate-pulse sm:h-8 sm:w-8'
			: 'text-surface-400 group-hover:text-accent-start h-5 w-5 transition-all sm:h-8 sm:w-8'}
	/>
{/snippet}

<div class="flex min-h-screen flex-col">
	<Header />

	<div class="fixed inset-0 -z-10 overflow-hidden">
		<div
			class="from-accent-start/10 to-accent-end/10 absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br blur-3xl"
		></div>
	</div>

	<main class="flex-1 px-4 pt-24 pb-8 sm:px-6 sm:pt-28 sm:pb-12 lg:px-8">
		<div class="mx-auto max-w-3xl">
			<div class="mb-8 text-center sm:mb-10">
				<h1 class="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
					<span class="gradient-text">Video to MP3.</span>
					<span class="text-surface-400"> Private, instant.</span>
				</h1>
				<p class="text-surface-500 mx-auto max-w-2xl text-base leading-relaxed sm:text-lg">
					Extract the audio from any video as MP3, M4A, Opus or WAV. It all happens in your browser
					— the video never leaves your device.
				</p>
			</div>

			<!-- Options -->
			<div class="glass mb-6 rounded-2xl p-4 sm:p-6">
				<div class="flex flex-col gap-5 sm:flex-row sm:gap-10">
					<div class="sm:flex-shrink-0">
						<span class="text-surface-500 mb-2 block text-[10px] tracking-wider uppercase"
							>Format</span
						>
						<div
							class="flex flex-wrap gap-1.5 sm:flex-nowrap"
							role="group"
							aria-label="Audio format"
						>
							{#each AUDIO_FORMAT_ORDER as f (f)}
								<button
									onclick={() => chooseFormat(f)}
									disabled={!available[f]}
									aria-pressed={format === f}
									title={available[f] ? AUDIO_FORMATS[f].blurb : 'Not supported in this browser'}
									class="rounded-lg px-3 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 {format ===
									f
										? 'bg-accent-start shadow-accent-start/30 text-white shadow-md'
										: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
								>
									{AUDIO_FORMATS[f].label}
								</button>
							{/each}
						</div>
						<p class="text-surface-500 mt-2 text-xs">{info.blurb}</p>
					</div>

					{#if info.lossy}
						<div>
							<span class="text-surface-500 mb-2 block text-[10px] tracking-wider uppercase"
								>Quality</span
							>
							<div class="flex flex-wrap gap-1.5" role="group" aria-label="Audio bitrate">
								{#each AUDIO_BITRATE_CHOICES as b (b)}
									<button
										onclick={() => chooseBitrate(b)}
										aria-pressed={bitrate === b}
										class="rounded-lg px-3 py-2 text-sm transition-all {bitrate === b
											? 'bg-accent-start shadow-accent-start/30 text-white shadow-md'
											: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
									>
										{b / 1000} kbps
									</button>
								{/each}
							</div>
							<p class="text-surface-500 mt-2 text-xs">
								About {((bitrate * 60) / 8 / 1_000_000).toFixed(1)} MB per minute
							</p>
						</div>
					{/if}
				</div>
			</div>

			<DropZone
				accept=".mp4,.webm,.mov,.mkv"
				compact={rows.length > 0}
				onfiles={addFiles}
				{formatBadges}
				title="Drop videos here"
				subtitle="click to browse"
				compactLabel="Drop more videos or click to browse"
				icon={iconSnippet}
			/>

			{#if rows.length > 0}
				<div class="mt-6 space-y-3" in:fade={{ duration: 200 }}>
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h2 class="text-surface-300 text-sm font-medium">
							{rows.length}
							{rows.length === 1 ? 'video' : 'videos'}
						</h2>
						<div class="flex flex-wrap items-center gap-2">
							{#if doneRows.length > 1}
								<button
									onclick={downloadZip}
									class="bg-surface-800 text-surface-200 hover:bg-surface-700 rounded-lg px-3 py-2 text-sm transition"
								>
									Download all (ZIP)
								</button>
							{/if}
							<button
								onclick={clearAll}
								class="text-surface-400 rounded-lg px-3 py-2 text-sm transition hover:bg-red-500/10 hover:text-red-400"
							>
								Clear all
							</button>
							<button
								onclick={extractAll}
								disabled={busy || readyCount === 0}
								class="from-accent-start to-accent-end rounded-lg bg-gradient-to-r px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
							>
								Extract audio{readyCount > 0 ? ` (${readyCount})` : ''}
							</button>
						</div>
					</div>

					{#each rows as row (row.id)}
						<div class="glass rounded-xl p-3 sm:p-4" in:fade={{ duration: 150 }}>
							<div class="flex items-center justify-between gap-3">
								<div class="min-w-0">
									<p class="text-surface-200 truncate text-sm font-medium" title={row.file.name}>
										{row.file.name}
									</p>
									<p class="text-surface-500 text-xs">
										{formatBytes(row.file.size)}
										{#if row.status === 'done' && row.blob && row.format}
											→ {AUDIO_FORMATS[row.format].label}
											· {formatBytes(row.blob.size)}
										{/if}
									</p>
								</div>

								<div class="flex flex-shrink-0 items-center gap-2">
									{#if row.status === 'working'}
										<Loader2 class="text-accent-start h-4 w-4 animate-spin" />
										<button
											onclick={() => cancel(row.id)}
											aria-label="Cancel extraction for {row.file.name}"
											class="text-surface-400 rounded-lg px-2.5 py-1.5 text-xs transition hover:bg-red-500/10 hover:text-red-400"
										>
											Cancel
										</button>
									{:else if row.status === 'done' && row.blob && row.format}
										<Check class="h-4 w-4 text-emerald-400" />
										<button
											onclick={() =>
												downloadBlob(row.blob!, audioFilename(row.file.name, row.format!))}
											class="from-accent-start to-accent-end inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
										>
											<Download class="h-4 w-4" />
											Download
										</button>
									{/if}
									{#if row.status !== 'working'}
										<button
											onclick={() => remove(row.id)}
											aria-label="Remove {row.file.name}"
											class="text-surface-500 hover:text-surface-200 rounded-lg p-1.5 transition"
										>
											<X class="h-4 w-4" />
										</button>
									{/if}
								</div>
							</div>

							{#if row.status === 'working'}
								<div class="bg-surface-700 mt-3 h-1.5 w-full overflow-hidden rounded-full">
									<div
										class="from-accent-start to-accent-end h-full rounded-full bg-gradient-to-r transition-all duration-300"
										style="width: {row.progress}%"
									></div>
								</div>
							{:else if row.status === 'error'}
								<p class="mt-2 text-xs text-red-400">{row.error}</p>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<nav class="mx-auto mt-10 max-w-3xl" aria-label="More from Squash">
			<a
				href={resolve('/')}
				class="bg-surface-800 text-surface-300 hover:bg-surface-700 inline-block rounded-full px-3 py-1.5 text-sm transition"
				>Compress a video instead →</a
			>
		</nav>

		<RelatedTools tools={squashRelated} />
		<SEOSection intro={audioSEO.intro} faqs={audioSEO.faqs} {breadcrumbs} />
	</main>

	<Footer currentApp="squash" />
</div>

<Toast />
