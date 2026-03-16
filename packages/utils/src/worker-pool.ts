export interface WorkerPoolJob {
	id: string;
	onProgress?: (progress: number) => void;
	onComplete: (result: ArrayBuffer, mimeType: string, width: number, height: number) => void;
	onError: (error: string) => void;
}

export interface WorkerPoolConfig<TJob extends WorkerPoolJob> {
	workerFactory: () => Worker;
	buildMessage: (job: TJob) => { data: unknown; transfer?: Transferable[] };
	maxWorkers?: number;
	minWorkers?: number;
	initTimeoutMs?: number;
}

export interface PoolStatus {
	initialized: boolean;
	workerCount: number;
	busyWorkers: number;
	queuedJobs: number;
}

export interface WorkerPoolInstance<TJob extends WorkerPoolJob> {
	initPool: () => Promise<void>;
	queueJob: (job: TJob) => Promise<void>;
	terminatePool: () => void;
	getPoolStatus: () => PoolStatus;
}

interface PoolWorker {
	worker: Worker;
	busy: boolean;
	currentJobId: string | null;
}

interface WorkerResponse {
	id: string;
	success: boolean;
	result?: ArrayBuffer;
	mimeType?: string;
	width?: number;
	height?: number;
	error?: string;
	progress?: number;
}

export function createWorkerPool<TJob extends WorkerPoolJob>(
	config: WorkerPoolConfig<TJob>
): WorkerPoolInstance<TJob> {
	const {
		workerFactory,
		buildMessage,
		maxWorkers = 4,
		minWorkers = 1,
		initTimeoutMs = 10_000,
	} = config;

	let workers: PoolWorker[] = [];
	let jobQueue: TJob[] = [];
	const jobCallbacks = new Map<string, TJob>();
	let poolInitialized = false;
	let poolInitializing = false;

	function getOptimalWorkerCount(): number {
		if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
			const cores = navigator.hardwareConcurrency;
			return Math.min(maxWorkers, Math.max(minWorkers, Math.floor(cores / 2)));
		}
		return minWorkers;
	}

	function processNextJob(): void {
		if (jobQueue.length === 0) return;
		const available = workers.find((w) => !w.busy);
		if (!available) return;
		const job = jobQueue.shift()!;
		assignJob(available, job);
	}

	function assignJob(poolWorker: PoolWorker, job: TJob): void {
		poolWorker.busy = true;
		poolWorker.currentJobId = job.id;
		jobCallbacks.set(job.id, job);

		const { data, transfer } = buildMessage(job);
		if (transfer?.length) {
			poolWorker.worker.postMessage(data, transfer);
		} else {
			poolWorker.worker.postMessage(data);
		}
	}

	function spawnWorker(): Promise<PoolWorker> {
		return new Promise((resolve, reject) => {
			try {
				const worker = workerFactory();
				const poolWorker: PoolWorker = { worker, busy: false, currentJobId: null };

				worker.onmessage = (event: MessageEvent<WorkerResponse | { type: string }>) => {
					const data = event.data;

					if ('type' in data && data.type === 'ready') {
						resolve(poolWorker);
						return;
					}

					const response = data as WorkerResponse;
					const job = jobCallbacks.get(response.id);
					if (!job) return;

					if (response.progress !== undefined && !response.result && !response.error) {
						job.onProgress?.(response.progress);
						return;
					}

					if (response.success && response.result && response.mimeType) {
						job.onComplete(response.result, response.mimeType, response.width!, response.height!);
					} else if (!response.success) {
						job.onError(response.error || 'Unknown error');
					}

					jobCallbacks.delete(response.id);
					poolWorker.busy = false;
					poolWorker.currentJobId = null;
					processNextJob();
				};

				worker.onerror = (error) => {
					console.error('Worker error:', error);
					if (poolWorker.currentJobId) {
						const job = jobCallbacks.get(poolWorker.currentJobId);
						if (job) {
							job.onError('Worker crashed');
							jobCallbacks.delete(poolWorker.currentJobId);
						}
					}
					poolWorker.busy = false;
					poolWorker.currentJobId = null;
					processNextJob();
				};

				setTimeout(() => reject(new Error('Worker initialization timeout')), initTimeoutMs);
			} catch (error) {
				reject(error);
			}
		});
	}

	async function initPool(): Promise<void> {
		if (poolInitialized || poolInitializing) return;
		poolInitializing = true;
		try {
			const count = getOptimalWorkerCount();
			workers = await Promise.all(Array.from({ length: count }, () => spawnWorker()));
			poolInitialized = true;
			processNextJob();
		} catch (error) {
			console.error('Failed to initialize worker pool:', error);
			throw error;
		} finally {
			poolInitializing = false;
		}
	}

	async function queueJob(job: TJob): Promise<void> {
		if (!poolInitialized) await initPool();
		const available = workers.find((w) => !w.busy);
		if (available) {
			assignJob(available, job);
		} else {
			jobQueue.push(job);
		}
	}

	function terminatePool(): void {
		for (const { worker } of workers) worker.terminate();
		workers = [];
		jobQueue = [];
		jobCallbacks.clear();
		poolInitialized = false;
	}

	function getPoolStatus(): PoolStatus {
		return {
			initialized: poolInitialized,
			workerCount: workers.length,
			busyWorkers: workers.filter((w) => w.busy).length,
			queuedJobs: jobQueue.length,
		};
	}

	return { initPool, queueJob, terminatePool, getPoolStatus };
}
