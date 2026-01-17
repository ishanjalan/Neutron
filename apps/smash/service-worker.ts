/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version, base } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

// Unique cache names
const CACHE_NAME = `smash-cache-${version}`;
const WASM_CACHE = 'smash-wasm-v1';

// WASM files to cache separately (they're large and rarely change)
const WASM_FILES = [`${base}/gs.wasm`, `${base}/qpdf.wasm`];

// All app files to cache
const APP_FILES = [...build, ...files];

// Install event - cache app files
sw.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME);
			// Cache all app files
			await cache.addAll(APP_FILES);
			// Skip waiting to activate immediately
			await sw.skipWaiting();
		})()
	);
});

// Activate event - clean up old caches
sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			// Delete old app caches (but keep WASM cache)
			const keys = await caches.keys();
			await Promise.all(
				keys
					.filter(key => key !== CACHE_NAME && key !== WASM_CACHE)
					.map(key => caches.delete(key))
			);
			// Take control of all pages immediately
			await sw.clients.claim();
		})()
	);
});

// Fetch event - serve from cache, fall back to network
sw.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	// Skip non-GET requests
	if (event.request.method !== 'GET') return;

	// Skip cross-origin requests
	if (url.origin !== location.origin) return;

	// Special handling for WASM files - cache-first with separate cache
	if (WASM_FILES.some(f => url.pathname.endsWith(f))) {
		event.respondWith(
			(async () => {
				const cache = await caches.open(WASM_CACHE);
				const cached = await cache.match(event.request);
				
				if (cached) {
					return cached;
				}

				// Fetch and cache WASM file
				const response = await fetch(event.request);
				if (response.ok) {
					cache.put(event.request, response.clone());
				}
				return response;
			})()
		);
		return;
	}

	// For app files, use cache-first strategy
	if (APP_FILES.some(file => url.pathname.endsWith(file))) {
		event.respondWith(
			(async () => {
				const cached = await caches.match(event.request);
				return cached || fetch(event.request);
			})()
		);
		return;
	}

	// For other requests (e.g., API calls), use network-first
	event.respondWith(
		(async () => {
			try {
				const response = await fetch(event.request);
				return response;
			} catch {
				const cached = await caches.match(event.request);
				if (cached) return cached;
				throw new Error('No network and no cache');
			}
		})()
	);
});

// Listen for messages from the main thread
sw.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') {
		sw.skipWaiting();
	}
});
