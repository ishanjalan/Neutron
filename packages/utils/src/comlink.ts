/**
 * Comlink utilities for type-safe Web Worker communication
 *
 * @example Worker file (compress.worker.ts):
 * ```ts
 * import { expose } from '@neutron/utils/comlink';
 *
 * const api = {
 *   async compress(data: ArrayBuffer, quality: number): Promise<ArrayBuffer> {
 *     // Heavy compression work here
 *     return compressedData;
 *   }
 * };
 *
 * export type CompressWorkerAPI = typeof api;
 * expose(api);
 * ```
 *
 * @example Main thread usage:
 * ```ts
 * import { createWorker } from '@neutron/utils/comlink';
 * import type { CompressWorkerAPI } from './compress.worker';
 *
 * const worker = createWorker<CompressWorkerAPI>(
 *   new Worker(new URL('./compress.worker.ts', import.meta.url), { type: 'module' })
 * );
 *
 * // Call worker methods like normal async functions!
 * const result = await worker.compress(data, 85);
 * ```
 */

import { wrap, expose, transfer, proxy, type Remote } from 'comlink';

// Re-export Comlink primitives
export { wrap, expose, transfer, proxy, type Remote };

/**
 * Create a type-safe worker wrapper
 * @param worker - The Worker instance
 * @returns A proxy object that mirrors the worker's API
 */
export function createWorker<T>(worker: Worker): Remote<T> {
	return wrap<T>(worker);
}

/**
 * Create a worker from a URL with type safety
 * @param url - URL to the worker script
 * @param options - Worker options
 */
export function createWorkerFromURL<T>(url: URL | string, options?: WorkerOptions): Remote<T> {
	const worker = new Worker(url, { type: 'module', ...options });
	return wrap<T>(worker);
}

/**
 * Transfer ArrayBuffer ownership to worker (zero-copy)
 * Use this when sending large binary data to avoid copying
 *
 * @example
 * ```ts
 * const buffer = new ArrayBuffer(1024 * 1024);
 * await worker.processData(transferBuffer(buffer));
 * // buffer is now neutered (unusable) - ownership transferred to worker
 * ```
 */
export function transferBuffer(buffer: ArrayBuffer): ArrayBuffer {
	return transfer(buffer, [buffer]);
}

/**
 * Transfer multiple ArrayBuffers
 */
export function transferBuffers(buffers: ArrayBuffer[]): ArrayBuffer[] {
	return transfer(buffers, buffers);
}

/**
 * Create a callback proxy that can be called from the worker
 * Useful for progress callbacks
 *
 * @example
 * ```ts
 * await worker.compress(data, createCallback((progress: number) => {
 *   updateUI(progress);
 * }));
 * ```
 */
export function createCallback<T extends (...args: unknown[]) => unknown>(fn: T): T {
	return proxy(fn);
}

/**
 * Worker pool for parallel processing
 * Automatically distributes work across multiple workers
 */
export class WorkerPool<T> {
	private workers: Remote<T>[] = [];
	private queue: Array<{
		task: (worker: Remote<T>) => Promise<unknown>;
		resolve: (value: unknown) => void;
		reject: (error: unknown) => void;
	}> = [];
	private activeCount = 0;

	constructor(
		private createWorkerFn: () => Worker,
		private poolSize: number = navigator.hardwareConcurrency || 4
	) {
		// Pre-create workers
		for (let i = 0; i < this.poolSize; i++) {
			this.workers.push(wrap<T>(this.createWorkerFn()));
		}
	}

	/**
	 * Execute a task on an available worker
	 */
	async execute<R>(task: (worker: Remote<T>) => Promise<R>): Promise<R> {
		return new Promise((resolve, reject) => {
			this.queue.push({
				task: task as (worker: Remote<T>) => Promise<unknown>,
				resolve: resolve as (value: unknown) => void,
				reject,
			});
			this.processQueue();
		});
	}

	private async processQueue() {
		if (this.activeCount >= this.poolSize || this.queue.length === 0) return;

		const { task, resolve, reject } = this.queue.shift()!;
		const worker = this.workers[this.activeCount % this.poolSize];
		this.activeCount++;

		try {
			const result = await task(worker);
			resolve(result);
		} catch (error) {
			reject(error);
		} finally {
			this.activeCount--;
			this.processQueue();
		}
	}

	/**
	 * Process multiple items in parallel
	 */
	async map<I, R>(items: I[], processor: (worker: Remote<T>, item: I) => Promise<R>): Promise<R[]> {
		return Promise.all(items.map((item) => this.execute((worker) => processor(worker, item))));
	}

	/**
	 * Terminate all workers
	 */
	terminate() {
		// Workers created with wrap() don't have direct terminate access
		// The underlying workers should be stored separately if termination is needed
		this.workers = [];
		this.queue = [];
	}
}

/**
 * Helper to create a worker pool
 */
export function createWorkerPool<T>(workerUrl: URL | string, poolSize?: number): WorkerPool<T> {
	return new WorkerPool<T>(() => new Worker(workerUrl, { type: 'module' }), poolSize);
}
