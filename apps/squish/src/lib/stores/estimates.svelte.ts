import { estimateKey, estimateLevels, type LevelBytes } from '#lib/utils/estimate.ts';
import type { CompressionSettings, ImageItem } from './images.svelte.ts';

type State = { key: string; status: 'running' | 'done' | 'failed'; bytes: LevelBytes };

let state = $state<State | undefined>();
let controller: AbortController | undefined;

/**
 * Size predictions for the image the quality slider is currently about. One at a time: a new
 * request for a different image or format cancels the one in flight.
 */
export const estimates = {
	get current() {
		return state;
	},

	/** Stop sampling (a real compression is starting and should have the workers to itself). */
	stop() {
		if (state?.status !== 'running') return;
		controller?.abort();
		controller = undefined;
		state = undefined;
	},

	ensure(item: ImageItem, settings: CompressionSettings): void {
		const key = estimateKey(item);
		if (state?.key === key) return;

		controller?.abort();
		const mine = new AbortController();
		controller = mine;
		state = { key, status: 'running', bytes: {} };

		estimateLevels(item, settings, mine.signal, (level, total) => {
			if (mine.signal.aborted || state?.key !== key) return;
			state = { key, status: 'running', bytes: { ...state.bytes, [level]: total } };
		})
			.then(() => {
				if (mine.signal.aborted || state?.key !== key) return;
				state = { ...state, status: 'done' };
			})
			.catch((error) => {
				if (mine.signal.aborted) return;
				console.warn('Size estimate failed:', error);
				state = { key, status: 'failed', bytes: {} };
			});
	},
};
