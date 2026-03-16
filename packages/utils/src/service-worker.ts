/**
 * Shared Service Worker helper functions.
 *
 * These run inside a Service Worker scope (ServiceWorkerGlobalScope).
 * Import in SvelteKit service-worker.ts files -- they are compiled as ES modules.
 *
 * Squish uses a plain static sw.js that cannot import from packages,
 * so its implementations are inline but follow the same patterns here.
 */

declare let self: ServiceWorkerGlobalScope;

// ── Cache strategies ─────────────────────────────────────────────────────────

/**
 * Cache-first strategy: return cached response immediately; fetch and cache on miss.
 * Best for immutable assets (JS bundles, WASM, fonts).
 */
export async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);

	if (cached) return cached;

	const network = await fetch(request);
	if (network.ok) cache.put(request, network.clone());
	return network;
}

/**
 * Network-first strategy: try the network; fall back to cache on failure.
 * Best for API requests and frequently-updated resources.
 */
export async function networkFirst(request: Request, cacheName: string): Promise<Response> {
	const cache = await caches.open(cacheName);

	try {
		const network = await fetch(request);
		if (network.ok) cache.put(request, network.clone());
		return network;
	} catch {
		const cached = await cache.match(request);
		if (cached) return cached;
		throw new Error(`Network failed and no cache for ${request.url}`);
	}
}

/**
 * Stale-while-revalidate: return cached immediately and update cache in background.
 * Best for resources that can tolerate a one-version-stale read (e.g. external CDN libs).
 */
export async function staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);

	// Always revalidate in the background
	const fetchPromise = fetch(request)
		.then((network) => {
			if (network.ok) cache.put(request, network.clone());
			return network;
		})
		.catch(() => null as unknown as Response);

	if (cached) return cached;

	const network = await fetchPromise;
	if (network) return network;
	throw new Error(`No cache and network failed for ${request.url}`);
}

// ── Lifecycle helpers ─────────────────────────────────────────────────────────

/**
 * Delete all caches except the ones in `keepNames`.
 * Call inside the `activate` event's `waitUntil`.
 */
export async function cleanupOldCaches(keepNames: string[]): Promise<void> {
	const keys = await caches.keys();
	await Promise.all(keys.filter((k) => !keepNames.includes(k)).map((k) => caches.delete(k)));
}

/**
 * Handle common service worker messages (`SKIP_WAITING`, `GET_VERSION`).
 * `version` is the SvelteKit build version string (pass from `$service-worker`).
 */
export function handleMessage(event: ExtendableMessageEvent, version?: string): void {
	const type = typeof event.data === 'string' ? event.data : event.data?.type;

	switch (type) {
		case 'SKIP_WAITING':
		case 'skipWaiting':
			self.skipWaiting();
			break;

		case 'GET_VERSION':
			if (version) {
				(event.source as WindowClient | null)?.postMessage({ type: 'VERSION', version });
			}
			break;
	}
}
