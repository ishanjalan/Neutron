/**
 * Error Monitoring and Performance Tracking
 *
 * Enterprise-grade monitoring utilities for production deployments.
 * Configure Sentry DSN via environment variable: PUBLIC_SENTRY_DSN
 */

import * as Sentry from '@sentry/sveltekit';
import { dev } from '$app/environment';

// Initialize flag
let isInitialized = false;

/**
 * Initialize Sentry error monitoring
 * Call this once in your app's entry point
 */
export function initMonitoring() {
	if (isInitialized) return;

	// Only initialize in production or when explicitly enabled
	const sentryDsn = import.meta.env.PUBLIC_SENTRY_DSN;

	if (!sentryDsn) {
		if (!dev) {
			console.warn('Sentry DSN not configured. Error monitoring disabled.');
		}
		return;
	}

	Sentry.init({
		dsn: sentryDsn,
		environment: dev ? 'development' : 'production',

		// Performance monitoring
		tracesSampleRate: dev ? 1.0 : 0.1, // 100% in dev, 10% in prod

		// Session replay (privacy-safe)
		replaysSessionSampleRate: 0.1, // 10% of sessions
		replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

		// Privacy settings
		beforeSend(event) {
			// Strip sensitive data
			if (event.request?.headers) {
				delete event.request.headers['Authorization'];
				delete event.request.headers['Cookie'];
			}
			return event;
		},

		// Ignore common non-critical errors
		ignoreErrors: [
			'ResizeObserver loop limit exceeded',
			'Non-Error promise rejection captured',
			'Network request failed', // User offline
			'Load failed', // User cancelled navigation
		],
	});

	isInitialized = true;
}

/**
 * Manually capture an error with context
 */
export function captureError(error: Error, context?: Record<string, any>) {
	if (!isInitialized) {
		console.error('Monitoring not initialized:', error);
		return;
	}

	Sentry.captureException(error, {
		extra: context,
	});
}

/**
 * Capture a custom message (for non-error events)
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
	if (!isInitialized) {
		console.log(`[${level}] ${message}`);
		return;
	}

	Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUser(userId: string, email?: string) {
	if (!isInitialized) return;

	Sentry.setUser({
		id: userId,
		email,
	});
}

/**
 * Clear user context (on logout)
 */
export function clearUser() {
	if (!isInitialized) return;
	Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging context
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
	if (!isInitialized) return;

	Sentry.addBreadcrumb({
		message,
		category,
		data,
		level: 'info',
	});
}

/**
 * Performance measurement utilities
 */
export class PerformanceMonitor {
	private measurements = new Map<string, number>();

	/**
	 * Start timing an operation
	 */
	start(name: string) {
		this.measurements.set(name, performance.now());
	}

	/**
	 * End timing and log result
	 */
	end(name: string, context?: Record<string, any>) {
		const startTime = this.measurements.get(name);
		if (!startTime) {
			console.warn(`No start time found for measurement: ${name}`);
			return;
		}

		const duration = performance.now() - startTime;
		this.measurements.delete(name);

		// Log to console in dev
		if (dev) {
			console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`, context);
		}

		// Send to Sentry
		addBreadcrumb(`Performance: ${name}`, 'performance', {
			duration_ms: duration,
			...context,
		});

		// Warn if operation is slow
		if (duration > 1000) {
			captureMessage(`Slow operation: ${name} (${duration.toFixed(0)}ms)`, 'warning');
		}

		return duration;
	}

	/**
	 * Measure an async operation
	 */
	async measure<T>(name: string, fn: () => Promise<T>, context?: Record<string, any>): Promise<T> {
		this.start(name);
		try {
			const result = await fn();
			this.end(name, context);
			return result;
		} catch (error) {
			this.end(name, { ...context, error: true });
			throw error;
		}
	}
}

// Global performance monitor instance
export const perfMonitor = new PerformanceMonitor();
