import { createWorkerPool, type WorkerPoolJob } from '@neutron/utils';
import type { OutputFormat } from '$lib/workers/convert.worker';

export interface ConversionJob extends WorkerPoolJob {
	imageBuffer: ArrayBuffer;
	inputFormat: 'png';
	outputFormat: OutputFormat;
	quality: number;
	lossless: boolean;
}

const pool = createWorkerPool<ConversionJob>({
	workerFactory: () =>
		new Worker(new URL('../workers/convert.worker.ts', import.meta.url), { type: 'module' }),
	buildMessage: (job) => ({
		data: {
			id: job.id,
			type: 'encode',
			imageBuffer: job.imageBuffer,
			outputFormat: job.outputFormat,
			quality: job.quality,
		},
		transfer: [job.imageBuffer],
	}),
});

export const initPool = pool.initPool;
export const queueJob = pool.queueJob;
export const terminatePool = pool.terminatePool;
export const getPoolStatus = pool.getPoolStatus;

export function processImage(
	imageBuffer: ArrayBuffer,
	inputFormat: 'png',
	outputFormat: OutputFormat,
	quality: number,
	lossless: boolean,
	onProgress?: (progress: number) => void
): Promise<{ result: ArrayBuffer; mimeType: string; width: number; height: number }> {
	const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
