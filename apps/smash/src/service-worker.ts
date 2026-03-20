/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version, base } from '$service-worker';
import {
	cacheFirst,
	networkFirst,
	cleanupOldCaches,
	handleMessage,
} from '@neutron/utils/service-worker';

declare let self: ServiceWorkerGlobalScope;

const CACHE_NAME = `smash-cache-${version}`;
const WASM_CACHE = 'smash-wasm-v1';

// WASM files to cache separately (they're large and rarely change)
const WASM_FILES = [`${base}/gs.wasm`];

// All app files to cache
const APP_FILES = [...build, ...files];

// Install event - cache app files
self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME);
			await cache.addAll(APP_FILES);
			await self.skipWaiting();
		})()
	);
});

// Activate event - clean up old caches (keep WASM cache across versions)
self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			await cleanupOldCaches([CACHE_NAME, WASM_CACHE]);
			await self.clients.claim();
		})()
	);
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	// Skip non-GET requests
	if (event.request.method !== 'GET') return;

	// Skip cross-origin requests
	if (url.origin !== self.location.origin) return;

	// WASM files - cache-first with dedicated long-lived cache
	if (WASM_FILES.some((f) => url.pathname.endsWith(f))) {
		event.respondWith(cacheFirst(event.request, WASM_CACHE));
		return;
	}

	// App shell files - cache-first
	if (APP_FILES.some((file) => url.pathname.endsWith(file))) {
		event.respondWith(cacheFirst(event.request, CACHE_NAME));
		return;
	}

	// Everything else (API calls etc.) - network-first
	event.respondWith(networkFirst(event.request, CACHE_NAME));
});

// Messages from main thread
self.addEventListener('message', (event) => {
	handleMessage(event, version);
});
