import { CompressionCancelledError } from '#lib/utils/webcodecs.ts';
import { estimateKey, estimateLevels, type LevelBytes } from '#lib/utils/estimate.ts';
import type { CompressionSettings, VideoItem } from './videos.svelte.ts';

type State = { key: string; status: 'running' | 'done' | 'failed'; bytes?: LevelBytes };

let state = $state<State | undefined>();
let controller: AbortController | undefined;

/**
 * Size predictions for the video the quality slider is currently about. One at a time: a new
 * request for a different video or different settings cancels the one in flight.
 */
export const estimates = {
	get current() {
		return state;
	},

	/** Predicted output bytes for this video at the chosen level, once its estimate is ready. */
	bytesFor(item: VideoItem, settings: CompressionSettings): number | undefined {
		if (!state || state.key !== estimateKey(item, settings)) return;
		return state.bytes?.[settings.quality];
	},

	/** Stop sampling (e.g. a real compression is starting and should have the encoder to itself). */
	stop() {
		if (state?.status !== 'running') return;
		controller?.abort();
		controller = undefined;
		state = undefined;
	},

	cancel() {
		controller?.abort();
		controller = undefined;
		state = undefined;
	},

	ensure(item: VideoItem, settings: CompressionSettings): void {
		const key = estimateKey(item, settings);
		if (state?.key === key) return;

		controller?.abort();
		const mine = new AbortController();
		controller = mine;
		state = { key, status: 'running', bytes: {} };

		estimateLevels(item, settings, mine.signal, (level, total) => {
			if (mine.signal.aborted || state?.key !== key) return;
			state = { key, status: 'running', bytes: { ...state.bytes, [level]: total } };
		})
			.then((bytes) => {
				if (mine.signal.aborted) return;
				state = bytes ? { key, status: 'done', bytes } : { key, status: 'failed' };
			})
			.catch((error) => {
				if (mine.signal.aborted || error instanceof CompressionCancelledError) return;
				console.warn('Size estimate failed:', error);
				state = { key, status: 'failed' };
			});
	},
};
