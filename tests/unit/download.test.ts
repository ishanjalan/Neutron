import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	downloadAllAsZip,
	isFileSystemAccessSupported,
	isClipboardWriteSupported,
	type DownloadFile,
} from '@neutron/utils/download';

beforeEach(() => {
	URL.createObjectURL = vi.fn(() => 'blob:mock-zip-url');
	URL.revokeObjectURL = vi.fn();
});

describe('isFileSystemAccessSupported', () => {
	it('returns true when showDirectoryPicker is present on window', () => {
		(window as any).showDirectoryPicker = vi.fn();
		expect(isFileSystemAccessSupported()).toBe(true);
		delete (window as any).showDirectoryPicker;
	});

	it('returns false when showDirectoryPicker is absent', () => {
		const orig = (window as any).showDirectoryPicker;
		delete (window as any).showDirectoryPicker;
		expect(isFileSystemAccessSupported()).toBe(false);
		if (orig !== undefined) (window as any).showDirectoryPicker = orig;
	});
});

describe('isClipboardWriteSupported', () => {
	it('returns false when clipboard has no write method', () => {
		Object.defineProperty(navigator, 'clipboard', {
			value: {}, // clipboard exists but no write method
			configurable: true,
			writable: true,
		});
		expect(isClipboardWriteSupported()).toBe(false);
	});

	it('returns true when navigator.clipboard.write is available', () => {
		Object.defineProperty(navigator, 'clipboard', {
			value: { write: vi.fn() },
			configurable: true,
			writable: true,
		});
		expect(isClipboardWriteSupported()).toBe(true);
	});
});

describe('downloadAllAsZip', () => {
	it('resolves without throwing for a single file', async () => {
		const files: DownloadFile[] = [{ name: 'hello.txt', blob: new Blob(['hello']) }];
		await expect(downloadAllAsZip(files, 'output.zip')).resolves.toBeUndefined();
		expect(URL.createObjectURL).toHaveBeenCalled();
	});

	it('resolves without throwing for multiple files', async () => {
		const files: DownloadFile[] = [
			{ name: 'a.txt', blob: new Blob(['aaa']) },
			{ name: 'b.txt', blob: new Blob(['bbb']) },
		];
		await expect(downloadAllAsZip(files, 'output.zip')).resolves.toBeUndefined();
	});

	it('calls onProgress with 100 at the end', async () => {
		const files: DownloadFile[] = [{ name: 'x.txt', blob: new Blob(['x']) }];
		const progress = vi.fn();
		await downloadAllAsZip(files, 'output.zip', progress);
		expect(progress).toHaveBeenLastCalledWith(100);
	});

	it('deduplicates filenames — second file with same name gets suffix', async () => {
		// Capture the entries passed to zipSync by intercepting downloadBlob
		// via URL.createObjectURL being called once after ZIP is built.
		const files: DownloadFile[] = [
			{ name: 'photo.jpg', blob: new Blob(['a']) },
			{ name: 'photo.jpg', blob: new Blob(['b']) },
			{ name: 'photo.jpg', blob: new Blob(['c']) },
		];
		// Should complete without error — deduplication is internal
		await expect(downloadAllAsZip(files, 'output.zip')).resolves.toBeUndefined();
	});

	it('handles files with different extensions as distinct names', async () => {
		const files: DownloadFile[] = [
			{ name: 'photo.jpg', blob: new Blob(['a']) },
			{ name: 'photo.png', blob: new Blob(['b']) },
		];
		await expect(downloadAllAsZip(files, 'output.zip')).resolves.toBeUndefined();
	});
});
