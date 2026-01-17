/**
 * Shared formatting utilities
 */

export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatETA(seconds: number): string {
	if (seconds < 60) return `${seconds}s`;
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}m ${secs}s`;
}

export function formatTimeInput(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function parseTimeInput(timeStr: string): number | null {
	// Handle MM:SS format
	const parts = timeStr.split(':');
	if (parts.length === 2) {
		const mins = parseInt(parts[0], 10);
		const secs = parseInt(parts[1], 10);
		if (!isNaN(mins) && !isNaN(secs)) {
			return mins * 60 + secs;
		}
	}
	// Handle raw seconds
	const secs = parseFloat(timeStr);
	if (!isNaN(secs)) return secs;
	return null;
}
