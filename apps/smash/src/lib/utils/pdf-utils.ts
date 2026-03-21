/**
 * Pure utility functions for PDF processing — no SvelteKit dependencies,
 * safe to import in unit tests.
 */

/**
 * Parse a page range string into a sorted, deduplicated array of 1-based page numbers.
 * Ranges that exceed maxPages are clamped to maxPages.
 */
export function parsePageRangeHelper(rangeStr: string, maxPages: number): number[] {
	const pages = new Set<number>();
	const parts = rangeStr.split(',').map((s) => s.trim());

	for (const part of parts) {
		if (part.includes('-')) {
			const [start, end] = part.split('-').map((s) => parseInt(s.trim(), 10));
			if (!isNaN(start) && !isNaN(end)) {
				for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
					pages.add(i);
				}
			}
		} else {
			const page = parseInt(part, 10);
			if (!isNaN(page) && page >= 1 && page <= maxPages) {
				pages.add(page);
			}
		}
	}

	return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Convert technical error messages to user-friendly messages.
 */
export function getUserFriendlyError(error: unknown): string {
	let message = '';

	if (error instanceof Error) {
		message = error.message;
	} else if (typeof error === 'string') {
		message = error;
	} else if (error && typeof error === 'object' && 'message' in error) {
		message = String((error as { message: unknown }).message);
	}

	const lowerMessage = message.toLowerCase();

	// Password errors
	if (
		lowerMessage.includes('password') ||
		lowerMessage.includes('decrypt') ||
		lowerMessage.includes('encrypted')
	) {
		if (
			lowerMessage.includes('incorrect') ||
			lowerMessage.includes('wrong') ||
			lowerMessage.includes('invalid')
		) {
			return 'Incorrect password. Please check your password and try again.';
		}
		return 'This PDF is password-protected. Please enter the correct password.';
	}

	// File format errors
	if (
		lowerMessage.includes('invalid pdf') ||
		lowerMessage.includes('not a pdf') ||
		lowerMessage.includes('parse')
	) {
		return 'This file appears to be corrupted or is not a valid PDF. Try re-downloading it.';
	}

	// Page range errors
	if (
		lowerMessage.includes('page') &&
		(lowerMessage.includes('range') || lowerMessage.includes('out of'))
	) {
		return 'Invalid page range. Please check that the page numbers are within the document.';
	}

	// No pages selected
	if (lowerMessage.includes('no pages selected')) {
		return message; // Already user-friendly
	}

	// Memory/size errors
	if (
		lowerMessage.includes('memory') ||
		lowerMessage.includes('too large') ||
		lowerMessage.includes('exceeded')
	) {
		return 'This file is too large to process. Try a smaller file or reduce the quality settings.';
	}

	// Network errors (for WASM loading)
	if (
		lowerMessage.includes('network') ||
		lowerMessage.includes('fetch') ||
		lowerMessage.includes('load')
	) {
		return 'Failed to load processing engine. Please check your internet connection and try again.';
	}

	// Ghostscript errors
	if (lowerMessage.includes('ghostscript') || lowerMessage.includes('gs')) {
		return 'Compression engine error. The file may be corrupted or use unsupported features.';
	}

	// Watermark text empty
	if (lowerMessage.includes('watermark text cannot be empty')) {
		return 'Please enter watermark text before applying.';
	}

	// Generic fallback with original message if short, otherwise generic
	if (message.length > 0 && message.length < 100) {
		return message;
	}

	return 'Something went wrong while processing your file. Please try again.';
}
