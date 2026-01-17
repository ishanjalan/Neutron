/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope;

import { build, files, version } from '$service-worker';

const CACHE_NAME = `squash-cache-${version}`;
const RUNTIME_CACHE_NAME = 'squash-runtime-v1';

// Assets to cache immediately (app shell)
const PRECACHE_ASSETS = [
	...build, // App build files (JS, CSS bundles)
	...files // Static files (icons, manifest, etc.)
];

// External libraries to cache (Mediabunny)
const EXTERNAL_LIBS = [
	'https://cdn.jsdelivr.net/npm/mediabunny'
];

// Check if a URL is an external library we should cache
function isExternalLib(url: string): boolean {
	return EXTERNAL_LIBS.some((lib) => url.startsWith(lib));
}

// Install: Cache app shell immediately
self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME);
			
			// Cache all precache assets
			await cache.addAll(PRECACHE_ASSETS);
			
			// Skip waiting to activate immediately
			await self.skipWaiting();
		})()
	);
});

// Activate: Clean up old caches and claim clients
self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			// Get all cache keys
			const keys = await caches.keys();
			
			// Delete old caches (keep current app cache and runtime cache)
			await Promise.all(
				keys
					.filter((key) => 
						key !== CACHE_NAME && 
						key !== RUNTIME_CACHE_NAME &&
						!key.startsWith('squash-cache-') // Keep versioned caches during transition
					)
					.map((key) => caches.delete(key))
			);
			
			// Claim all clients immediately
			await self.clients.claim();
			
			// Notify all clients that the service worker is ready
			const clients = await self.clients.matchAll({ type: 'window' });
			clients.forEach((client) => {
				client.postMessage({ type: 'SW_READY' });
			});
		})()
	);
});

// Fetch: Smart caching strategies
self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	// Skip non-GET requests
	if (event.request.method !== 'GET') return;

	// Skip chrome-extension and other non-http(s) requests
	if (!url.protocol.startsWith('http')) return;

	// Handle external libraries (Mediabunny) - Stale While Revalidate
	if (isExternalLib(event.request.url)) {
		event.respondWith(staleWhileRevalidate(event.request, RUNTIME_CACHE_NAME));
		return;
	}

	// Handle same-origin requests
	if (url.origin === self.location.origin) {
		// App shell (HTML, JS, CSS) - Cache First with Network Fallback
		if (
			event.request.destination === 'document' ||
			event.request.destination === 'script' ||
			event.request.destination === 'style' ||
			event.request.destination === 'font' ||
			event.request.destination === 'image'
		) {
			event.respondWith(cacheFirst(event.request, CACHE_NAME));
			return;
		}

		// API/data requests - Network First
		event.respondWith(networkFirst(event.request, RUNTIME_CACHE_NAME));
		return;
	}

	// For all other requests, try network first
	event.respondWith(networkFirst(event.request, RUNTIME_CACHE_NAME));
});

// Cache First Strategy: Check cache, fallback to network
async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
	const cache = await caches.open(cacheName);
	const cachedResponse = await cache.match(request);
	
	if (cachedResponse) {
		return cachedResponse;
	}

	try {
		const networkResponse = await fetch(request);
		
		// Cache successful responses
		if (networkResponse.ok) {
			cache.put(request, networkResponse.clone());
		}
		
		return networkResponse;
	} catch (error) {
		// Return offline fallback for navigation requests
		if (request.destination === 'document') {
			const offlineResponse = await cache.match('/');
			if (offlineResponse) {
				return offlineResponse;
			}
		}
		
		throw error;
	}
}

// Network First Strategy: Try network, fallback to cache
async function networkFirst(request: Request, cacheName: string): Promise<Response> {
	const cache = await caches.open(cacheName);

	try {
		const networkResponse = await fetch(request);
		
		// Cache successful responses
		if (networkResponse.ok) {
			cache.put(request, networkResponse.clone());
		}
		
		return networkResponse;
	} catch (error) {
		const cachedResponse = await cache.match(request);
		
		if (cachedResponse) {
			return cachedResponse;
		}
		
		throw error;
	}
}

// Stale While Revalidate: Return cache immediately, update in background
async function staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
	const cache = await caches.open(cacheName);
	const cachedResponse = await cache.match(request);

	// Fetch in background to update cache
	const fetchPromise = fetch(request).then((networkResponse) => {
		if (networkResponse.ok) {
			cache.put(request, networkResponse.clone());
		}
		return networkResponse;
	}).catch(() => {
		// Ignore network errors for background updates
		return null;
	});

	// Return cached response immediately, or wait for network
	if (cachedResponse) {
		return cachedResponse;
	}

	const networkResponse = await fetchPromise;
	if (networkResponse) {
		return networkResponse;
	}

	throw new Error('No cached response and network failed');
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
	const { type } = event.data;

	switch (type) {
		case 'SKIP_WAITING':
			self.skipWaiting();
			break;

		case 'GET_VERSION':
			event.source?.postMessage({ type: 'VERSION', version });
			break;

		case 'CLEAR_CACHE':
			clearAllCaches();
			break;

		case 'CHECK_OFFLINE':
			checkOfflineCapability().then((isReady) => {
				event.source?.postMessage({ type: 'OFFLINE_STATUS', isReady });
			});
			break;
	}
});

// Check if app can work offline
async function checkOfflineCapability(): Promise<boolean> {
	const appCache = await caches.open(CACHE_NAME);

	// Check if main app is cached
	const appCached = await appCache.match('/');

	return !!appCached;
}

// Clear all caches
async function clearAllCaches(): Promise<void> {
	const keys = await caches.keys();
	await Promise.all(keys.map((key) => caches.delete(key)));
}
