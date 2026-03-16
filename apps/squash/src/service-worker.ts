/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope;

import { build, files, version } from '$service-worker';
import {
	cacheFirst,
	networkFirst,
	staleWhileRevalidate,
	cleanupOldCaches,
	handleMessage,
} from '@neutron/utils/service-worker';

const CACHE_NAME = `squash-cache-${version}`;
const RUNTIME_CACHE = 'squash-runtime-v1';

// Assets to cache immediately (app shell)
const PRECACHE_ASSETS = [
	...build, // App build files (JS, CSS bundles)
	...files, // Static files (icons, manifest, etc.)
];

// External libraries to cache via stale-while-revalidate
const EXTERNAL_LIBS = ['https://cdn.jsdelivr.net/npm/mediabunny'];

function isExternalLib(url: string): boolean {
	return EXTERNAL_LIBS.some((lib) => url.startsWith(lib));
}

// Install: Cache app shell immediately
self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME);
			await cache.addAll(PRECACHE_ASSETS);
			await self.skipWaiting();
		})()
	);
});

// Activate: Clean up old caches and claim clients
self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			await cleanupOldCaches([CACHE_NAME, RUNTIME_CACHE]);
			await self.clients.claim();

			// Notify all clients that the service worker is ready
			const clients = await self.clients.matchAll({ type: 'window' });
			clients.forEach((client) => client.postMessage({ type: 'SW_READY' }));
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

	// External libraries - Stale While Revalidate
	if (isExternalLib(event.request.url)) {
		event.respondWith(staleWhileRevalidate(event.request, RUNTIME_CACHE));
		return;
	}

	// Same-origin requests
	if (url.origin === self.location.origin) {
		// HTML documents - Network First so deploys are picked up immediately
		if (event.request.destination === 'document') {
			event.respondWith(networkFirst(event.request, CACHE_NAME));
			return;
		}

		// Immutable build assets (content-hashed JS, CSS, fonts, images) - Cache First
		if (
			event.request.destination === 'script' ||
			event.request.destination === 'style' ||
			event.request.destination === 'font' ||
			event.request.destination === 'image'
		) {
			event.respondWith(cacheFirst(event.request, CACHE_NAME));
			return;
		}

		// API/data requests - Network First
		event.respondWith(networkFirst(event.request, RUNTIME_CACHE));
		return;
	}

	// All other requests - Network First
	event.respondWith(networkFirst(event.request, RUNTIME_CACHE));
});

// Messages from main thread (SKIP_WAITING, GET_VERSION)
self.addEventListener('message', (event) => {
	const { type } = event.data ?? {};

	// App-specific: clear all caches
	if (type === 'CLEAR_CACHE') {
		caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
		return;
	}

	// App-specific: check offline capability
	if (type === 'CHECK_OFFLINE') {
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.match('/'))
			.then((match) => {
				(event.source as WindowClient | null)?.postMessage({
					type: 'OFFLINE_STATUS',
					isReady: !!match,
				});
			});
		return;
	}

	// Common messages (SKIP_WAITING, GET_VERSION)
	handleMessage(event, version);
});
