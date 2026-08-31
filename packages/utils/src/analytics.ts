/**
 * GoatCounter pageview counting.
 *
 * `count.js` is loaded with `{"no_onload": true}` (see each app's `app.html`) so
 * pageviews are sent from here instead of on `DOMContentLoaded`. Two reasons:
 *
 * - Anything served through the `404.html` SPA fallback ships without a
 *   `<title>` (titles live in `<svelte:head>`), so `document.title` is still
 *   empty when `count.js` fires on its own and GoatCounter stores the pageview
 *   as "(no title)".
 * - Client-side navigations never fire `DOMContentLoaded`, so tool pages reached
 *   without a full reload were never counted at all.
 *
 * Call `countPageview` once per navigation, after the new route's
 * `<svelte:head>` has been applied.
 */

export interface CountVars {
	/** Path to record. Defaults to count.js's own `location`/canonical logic. */
	path?: string;
	/** Defaults to `document.title`. */
	title?: string;
	/** Defaults to `document.referrer`. */
	referrer?: string;
	event?: boolean;
}

interface GoatCounter {
	count?: (vars?: CountVars) => void;
}

declare global {
	interface Window {
		goatcounter?: GoatCounter;
	}
}

/** Pageviews requested before the async `count.js` finished loading. */
let pending: CountVars[] = [];
let listening = false;

function flush(): void {
	const count = window.goatcounter?.count;
	if (!count) return;
	const queued = pending;
	pending = [];
	for (const vars of queued) count(vars);
}

function drop(): void {
	pending = [];
}

/**
 * `count.js` is loaded `async`, so the first navigation can beat it. Wait on the
 * script element's `load` event rather than polling for `window.goatcounter`.
 */
function waitForScript(): void {
	if (listening) return;
	const script = document.querySelector<HTMLScriptElement>('script[data-goatcounter]');
	if (!script) {
		// No analytics on this page (or it was blocked) — don't accumulate.
		drop();
		return;
	}
	listening = true;
	script.addEventListener('load', flush, { once: true });
	script.addEventListener('error', drop, { once: true });
}

/**
 * Send a single pageview to GoatCounter, queueing it if `count.js` has not
 * loaded yet.
 *
 * Empty `path`/`title` values are dropped rather than passed through:
 * `count.js` only falls back to `location`/`document.title` for `null` and
 * `undefined`, so an empty string would be recorded verbatim — which is exactly
 * how the "(no title)" rows got there.
 */
export function countPageview(vars: CountVars = {}): void {
	if (typeof window === 'undefined') return;

	const resolved: CountVars = { ...vars };
	if (!resolved.path) delete resolved.path;
	if (!resolved.title) delete resolved.title;
	if (!resolved.referrer) delete resolved.referrer;

	if (window.goatcounter?.count) {
		window.goatcounter.count(resolved);
		return;
	}

	pending.push(resolved);
	waitForScript();
}
