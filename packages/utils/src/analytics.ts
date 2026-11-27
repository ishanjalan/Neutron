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

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/**
 * What kind of thing went wrong. This is a closed vocabulary on purpose: raw error messages can
 * contain file names, so only the bucket ever leaves the browser (see ADR-0010).
 */
export type FailureKind =
	| 'unsupported'
	| 'too-large'
	| 'memory'
	| 'password'
	| 'network'
	| 'invalid-input'
	| 'crash'
	| 'other';

const FAILURE_PATTERNS: [FailureKind, RegExp][] = [
	['password', /password|encrypt/i],
	['memory', /out of memory|memory|allocation|RangeError/i],
	['too-large', /too (large|big)|exceeds?|size limit|larger than/i],
	['network', /network|fetch|cors|offline|failed to load/i],
	['unsupported', /not supported|unsupported|can.?t (read|decode|encode)|webcodecs|codec/i],
	[
		'invalid-input',
		/invalid|corrupt|malformed|not a (valid )?(pdf|image|gif|video)|need at least|select/i,
	],
	['crash', /crash|unexpected|reload/i],
];

function messageOf(error: unknown): string {
	if (typeof error === 'string') return error;
	return error instanceof Error ? error.message : String(error ?? '');
}

/** Map any error or message onto a {@link FailureKind}. Never returns the message itself. */
export function classifyFailure(error: unknown): FailureKind {
	const message =
		typeof error === 'string'
			? error
			: error instanceof Error
				? error.message
				: String(error ?? '');
	for (const [kind, pattern] of FAILURE_PATTERNS) {
		if (pattern.test(message)) return kind;
	}
	return 'other';
}

/** Codec names we are willing to report. Anything else becomes "other". */
const KNOWN_CODECS = ['prores', 'avc', 'hevc', 'av1', 'vp9', 'vp8', 'aac', 'opus', 'mp3'];

/** The first error in a `cause` chain that says a source codec could not be decoded. */
function findUndecodable(error: unknown): { codec?: unknown } | undefined {
	let current = error;
	for (let depth = 0; depth < 5 && current instanceof Error; depth++) {
		if (current.name === 'UndecodableSourceError') return current as Error & { codec?: unknown };
		current = current.cause;
	}
	return undefined;
}

/**
 * A narrower reason within a {@link FailureKind}, so we can tell what to fix. Like the kind, it is
 * always one of a fixed set of words chosen here — never text taken from the error (ADR-0012).
 */
export function failureCause(error: unknown): string | undefined {
	const undecodable = findUndecodable(error);
	if (undecodable) {
		const { codec } = undecodable;
		if (typeof codec !== 'string') return 'decode-unknown';
		return `decode-${KNOWN_CODECS.includes(codec) ? codec : 'other'}`;
	}

	const message = messageOf(error);
	const kind = classifyFailure(message);

	if (kind === 'unsupported') {
		const encoder = /\b(AVC|HEVC|AV1|VP9) (?:codec not supported|encoding is not supported)/i.exec(
			message
		);
		if (encoder) return `encode-${encoder[1].toLowerCase()}`;
		if (/can.?t encode .*audio/i.test(message)) return 'encode-audio';
		if (/webcodecs (?:is )?not supported/i.test(message)) return 'no-webcodecs';
		if (/unsupported or unrecognizable format|can.?t read this file/i.test(message))
			return 'unreadable-file';
		if (/\bAVI\b/.test(message)) return 'avi';
		if (/\bHEI[CF]\b/i.test(message)) return 'heic';
	}

	if (kind === 'too-large') {
		if (/resolution|dimension|width|height|\blevel\b/i.test(message)) return 'resolution';
		if (/buffer/i.test(message)) return 'buffer';
		if (/quota|storage/i.test(message)) return 'storage';
	}

	return undefined;
}

/** "/Smash/compress/" → "Smash/compress". Only plain path characters survive; capped in length. */
export function eventRoute(pathname: string): string {
	const clean = pathname.replace(/^\/+|\/+$/g, '');
	if (!clean) return 'home';
	return /^[A-Za-z0-9/_-]{1,60}$/.test(clean) ? clean : 'other';
}

/**
 * Count a custom event. `name` must be a fixed string built from routes and buckets, never from
 * user input, file names or error messages.
 */
export function countEvent(name: string): void {
	if (typeof window === 'undefined') return;
	countPageview({ path: name, title: name, event: true });
}

/** Count that something failed on the current page, by bucket and fixed-list cause only. */
export function countFailure(error: unknown): void {
	if (typeof window === 'undefined') return;
	const kind = findUndecodable(error) ? 'unsupported' : classifyFailure(error);
	const cause = failureCause(error);
	countEvent(
		`error: ${eventRoute(window.location.pathname)} (${cause ? `${kind}: ${cause}` : kind})`
	);
}

/** Count that a result was downloaded on the current page. */
export function countDownload(): void {
	if (typeof window === 'undefined') return;
	countEvent(`download: ${eventRoute(window.location.pathname)}`);
}

let crashTracking = false;

/** Count uncaught errors and rejected promises. Call once from the root layout. */
export function installCrashTracking(): void {
	if (typeof window === 'undefined' || crashTracking) return;
	crashTracking = true;
	const report = () => countEvent(`crash: ${eventRoute(window.location.pathname)}`);
	window.addEventListener('error', report);
	window.addEventListener('unhandledrejection', report);
}
