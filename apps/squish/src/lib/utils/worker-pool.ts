import { createWorkerPool, type WorkerPoolJob } from '@neutron/utils';
import type { ImageFormat } from '$lib/workers/compress.worker';

export interface CompressionJob extends WorkerPoolJob {
	imageBuffer: ArrayBuffer;
	inputFormat: ImageFormat;
	outputFormat: ImageFormat;
	quality: number;
	lossless: boolean;
}

const pool = createWorkerPool<CompressionJob>({
	workerFactory: () =>
		new Worker(new URL('../workers/compress.worker.ts', import.meta.url), { type: 'module' }),
	buildMessage: (job) => ({
		data: {
			id: job.id,
			type: 'compress',
			imageBuffer: job.imageBuffer,
			inputFormat: job.inputFormat,
			outputFormat: job.outputFormat,
			quality: job.quality,
			lossless: job.lossless,
		},
		transfer: [job.imageBuffer],
	}),
});

export const initPool = pool.initPool;
export const queueJob = pool.queueJob;
export const terminatePool = pool.terminatePool;
export const getPoolStatus = pool.getPoolStatus;

export function processImage(
	id: string,
	imageBuffer: ArrayBuffer,
	inputFormat: ImageFormat,
	outputFormat: ImageFormat,
	quality: number,
	lossless: boolean,
	onProgress?: (progress: number) => void
): Promise<{ result: ArrayBuffer; mimeType: string; width: number; height: number }> {
	return new Promise((resolve, reject) => {
		pool.queueJob({
			id,
			imageBuffer,
			inputFormat,
			outputFormat,
			quality,
			lossless,
			onProgress,
			onComplete: (result, mimeType, width, height) => resolve({ result, mimeType, width, height }),
			onError: (error) => reject(new Error(error)),
		});
	});
}
