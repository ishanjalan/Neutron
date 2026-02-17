/**
 * Memory Leak Detection and Monitoring
 *
 * Tracks memory usage and warns about potential leaks in production.
 */

import { captureMessage, addBreadcrumb } from './monitoring';
import { dev } from '$app/environment';

interface MemorySnapshot {
	timestamp: number;
	usedJSHeapSize: number;
	totalJSHeapSize: number;
	jsHeapSizeLimit: number;
	itemCount: number;
	blobCount: number;
}

class MemoryMonitor {
	private snapshots: MemorySnapshot[] = [];
	private maxSnapshots = 50;
	private checkInterval: ReturnType<typeof setInterval> | null = null;
	private blobUrls = new Set<string>();

	/**
	 * Check if memory API is available
	 */
	private isMemoryAPIAvailable(): boolean {
		return (
			typeof performance !== 'undefined' &&
			'memory' in performance &&
			typeof (performance as any).memory === 'object'
		);
	}

	/**
	 * Get current memory usage
	 */
	private getMemoryUsage(): Pick<
		MemorySnapshot,
		'usedJSHeapSize' | 'totalJSHeapSize' | 'jsHeapSizeLimit'
	> | null {
		if (!this.isMemoryAPIAvailable()) {
			return null;
		}

		const memory = (performance as any).memory;
		return {
			usedJSHeapSize: memory.usedJSHeapSize,
			totalJSHeapSize: memory.totalJSHeapSize,
			jsHeapSizeLimit: memory.jsHeapSizeLimit,
		};
	}

	/**
	 * Take a memory snapshot
	 */
	takeSnapshot(itemCount: number = 0) {
		const memory = this.getMemoryUsage();
		if (!memory) return;

		const snapshot: MemorySnapshot = {
			timestamp: Date.now(),
			...memory,
			itemCount,
			blobCount: this.blobUrls.size,
		};

		this.snapshots.push(snapshot);

		// Keep only last N snapshots
		if (this.snapshots.length > this.maxSnapshots) {
			this.snapshots.shift();
		}

		// Log in development
		if (dev) {
			console.log('📊 Memory snapshot:', {
				used: this.formatBytes(snapshot.usedJSHeapSize),
				total: this.formatBytes(snapshot.totalJSHeapSize),
				limit: this.formatBytes(snapshot.jsHeapSizeLimit),
				items: itemCount,
				blobs: this.blobUrls.size,
			});
		}
	}

	/**
	 * Start automatic monitoring
	 */
	startMonitoring(intervalMs: number = 30000) {
		if (this.checkInterval) return;

		this.checkInterval = setInterval(() => {
			this.checkForLeaks();
		}, intervalMs);

		console.log('🔍 Memory monitoring started');
	}

	/**
	 * Stop automatic monitoring
	 */
	stopMonitoring() {
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}
	}

	/**
	 * Check for potential memory leaks
	 */
	checkForLeaks() {
		const memory = this.getMemoryUsage();
		if (!memory) return;

		// Check if memory is growing consistently
		if (this.snapshots.length >= 5) {
			const recent = this.snapshots.slice(-5);
			const isGrowing = recent.every((snap, i) => {
				if (i === 0) return true;
				return snap.usedJSHeapSize > recent[i - 1].usedJSHeapSize;
			});

			if (isGrowing) {
				const growth = recent[recent.length - 1].usedJSHeapSize - recent[0].usedJSHeapSize;
				const growthMB = growth / (1024 * 1024);

				if (growthMB > 50) {
					// More than 50MB growth
					captureMessage(
						`Potential memory leak detected: ${growthMB.toFixed(1)}MB growth`,
						'warning'
					);
				}
			}
		}

		// Warn if approaching heap limit
		const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
		if (usagePercent > 80) {
			captureMessage(`High memory usage: ${usagePercent.toFixed(1)}% of heap limit`, 'warning');
		}

		// Warn about blob URL leaks
		if (this.blobUrls.size > 100) {
			captureMessage(`High blob URL count: ${this.blobUrls.size} URLs not revoked`, 'warning');
		}
	}

	/**
	 * Register a blob URL for tracking
	 */
	registerBlobUrl(url: string) {
		this.blobUrls.add(url);
		addBreadcrumb('Blob URL created', 'memory', {
			url,
			total: this.blobUrls.size,
		});
	}

	/**
	 * Revoke a blob URL and remove from tracking
	 */
	revokeBlobUrl(url: string) {
		URL.revokeObjectURL(url);
		this.blobUrls.delete(url);
		addBreadcrumb('Blob URL revoked', 'memory', {
			url,
			remaining: this.blobUrls.size,
		});
	}

	/**
	 * Revoke all tracked blob URLs
	 */
	revokeAllBlobUrls() {
		for (const url of this.blobUrls) {
			URL.revokeObjectURL(url);
		}
		const count = this.blobUrls.size;
		this.blobUrls.clear();

		if (dev) {
			console.log(`🧹 Revoked ${count} blob URLs`);
		}
	}

	/**
	 * Get memory statistics
	 */
	getStats() {
		const memory = this.getMemoryUsage();
		if (!memory) {
			return {
				available: false,
				message: 'Memory API not available (Chrome/Edge only)',
			};
		}

		return {
			available: true,
			current: {
				used: this.formatBytes(memory.usedJSHeapSize),
				total: this.formatBytes(memory.totalJSHeapSize),
				limit: this.formatBytes(memory.jsHeapSizeLimit),
				usagePercent: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1),
			},
			snapshots: this.snapshots.length,
			blobUrls: this.blobUrls.size,
		};
	}

	/**
	 * Format bytes to human-readable string
	 */
	private formatBytes(bytes: number): string {
		const mb = bytes / (1024 * 1024);
		return `${mb.toFixed(1)} MB`;
	}

	/**
	 * Clear all snapshots
	 */
	clearSnapshots() {
		this.snapshots = [];
	}
}

// Global memory monitor instance
export const memoryMonitor = new MemoryMonitor();

// Auto-start monitoring in production
if (!dev && typeof window !== 'undefined') {
	memoryMonitor.startMonitoring();
}
