const tracked = new Set<string>();

export function createTrackedUrl(blob: Blob): string {
	const url = URL.createObjectURL(blob);
	tracked.add(url);
	return url;
}

export function revokeTrackedUrl(url: string | null | undefined): void {
	if (!url) return;
	URL.revokeObjectURL(url);
	tracked.delete(url);
}

export function revokeAll(): void {
	for (const url of tracked) URL.revokeObjectURL(url);
	tracked.clear();
}

export function getTrackedUrlCount(): number {
	return tracked.size;
}
