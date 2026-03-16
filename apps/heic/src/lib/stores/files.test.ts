import { describe, it, expect, beforeEach } from 'vitest';
import { filesStore } from './files.svelte';

describe('filesStore', () => {
	beforeEach(() => {
		filesStore.clearAll();
		localStorage.clear();
	});

	describe('initial state', () => {
		it('starts empty', () => {
			expect(filesStore.items).toEqual([]);
		});

		it('has default settings', () => {
			expect(filesStore.settings.outputFormat).toBe('jpeg');
			expect(filesStore.settings.quality).toBe(90);
		});

		it('has zero computed totals', () => {
			expect(filesStore.totalFiles).toBe(0);
			expect(filesStore.completedFiles).toBe(0);
			expect(filesStore.totalOriginalSize).toBe(0);
		});

		it('has null batch stats', () => {
			expect(filesStore.batchStats.startTime).toBeNull();
			expect(filesStore.batchStats.endTime).toBeNull();
			expect(filesStore.batchStats.totalFiles).toBe(0);
		});
	});

	describe('addFiles', () => {
		it('skips non-HEIC files', async () => {
			await filesStore.addFiles([new File(['data'], 'photo.jpg', { type: 'image/jpeg' })]);
			expect(filesStore.items).toEqual([]);
		});

		it('accepts HEIC files', async () => {
			const ids = await filesStore.addFiles([
				new File(['data'], 'photo.heic', { type: 'image/heic' }),
			]);
			expect(ids).toHaveLength(1);
			expect(filesStore.items).toHaveLength(1);
			expect(filesStore.items[0].name).toBe('photo.heic');
		});

		it('accepts HEIF files', async () => {
			const ids = await filesStore.addFiles([
				new File(['data'], 'photo.heif', { type: 'image/heif' }),
			]);
			expect(ids).toHaveLength(1);
		});

		it('each added item starts as pending', async () => {
			await filesStore.addFiles([new File(['data'], 'a.heic', { type: 'image/heic' })]);
			expect(filesStore.items[0].status).toBe('pending');
			expect(filesStore.items[0].progress).toBe(0);
		});

		it('assigns the current outputFormat to each item', async () => {
			filesStore.updateSettings({ outputFormat: 'png' });
			await filesStore.addFiles([new File(['data'], 'b.heic', { type: 'image/heic' })]);
			expect(filesStore.items[0].outputFormat).toBe('png');
		});
	});

	describe('updateSettings', () => {
		it('updates quality', () => {
			filesStore.updateSettings({ quality: 75 });
			expect(filesStore.settings.quality).toBe(75);
		});

		it('updates pending items outputFormat when format changes', async () => {
			await filesStore.addFiles([new File(['data'], 'c.heic', { type: 'image/heic' })]);
			filesStore.updateSettings({ outputFormat: 'webp' });
			expect(filesStore.items[0].outputFormat).toBe('webp');
		});

		it('does NOT update completed items outputFormat', async () => {
			await filesStore.addFiles([new File(['data'], 'd.heic', { type: 'image/heic' })]);
			const id = filesStore.items[0].id;
			filesStore.setFileStatus(id, 'completed');

			filesStore.updateSettings({ outputFormat: 'avif' });
			// completed items are not updated
			expect(filesStore.items[0].outputFormat).not.toBe('avif');
		});
	});

	describe('setFileStatus', () => {
		it('updates status', async () => {
			await filesStore.addFiles([new File(['data'], 'e.heic', { type: 'image/heic' })]);
			const id = filesStore.items[0].id;
			filesStore.setFileStatus(id, 'processing');
			expect(filesStore.items[0].status).toBe('processing');
		});

		it('stores error message', async () => {
			await filesStore.addFiles([new File(['data'], 'f.heic', { type: 'image/heic' })]);
			const id = filesStore.items[0].id;
			filesStore.setFileStatus(id, 'error', 'Conversion failed');
			expect(filesStore.items[0].error).toBe('Conversion failed');
		});
	});

	describe('setFileProgress', () => {
		it('updates progress', async () => {
			await filesStore.addFiles([new File(['data'], 'g.heic', { type: 'image/heic' })]);
			const id = filesStore.items[0].id;
			filesStore.setFileProgress(id, 60);
			expect(filesStore.items[0].progress).toBe(60);
		});
	});

	describe('removeFile', () => {
		it('removes item by id', async () => {
			await filesStore.addFiles([new File(['data'], 'h.heic', { type: 'image/heic' })]);
			const id = filesStore.items[0].id;
			filesStore.removeFile(id);
			expect(filesStore.items).toEqual([]);
		});
	});

	describe('computed properties', () => {
		it('totalFiles reflects current count', async () => {
			await filesStore.addFiles([
				new File(['data'], 'i.heic', { type: 'image/heic' }),
				new File(['data'], 'j.heic', { type: 'image/heic' }),
			]);
			expect(filesStore.totalFiles).toBe(2);
		});

		it('completedFiles counts only completed', async () => {
			await filesStore.addFiles([
				new File(['data'], 'k.heic', { type: 'image/heic' }),
				new File(['data'], 'l.heic', { type: 'image/heic' }),
			]);
			filesStore.setFileStatus(filesStore.items[0].id, 'completed');
			expect(filesStore.completedFiles).toBe(1);
		});

		it('processingFiles counts only processing', async () => {
			await filesStore.addFiles([new File(['data'], 'm.heic', { type: 'image/heic' })]);
			filesStore.setFileStatus(filesStore.items[0].id, 'processing');
			expect(filesStore.processingFiles).toBe(1);
		});

		it('allCompleted is true when all items are completed', async () => {
			await filesStore.addFiles([new File(['data'], 'n.heic', { type: 'image/heic' })]);
			filesStore.setFileStatus(filesStore.items[0].id, 'completed');
			expect(filesStore.allCompleted).toBe(true);
		});

		it('allCompleted is false when some are pending', async () => {
			await filesStore.addFiles([
				new File(['data'], 'o.heic', { type: 'image/heic' }),
				new File(['data'], 'p.heic', { type: 'image/heic' }),
			]);
			filesStore.setFileStatus(filesStore.items[0].id, 'completed');
			expect(filesStore.allCompleted).toBe(false);
		});

		it('hasErrors is true when any item has errored', async () => {
			await filesStore.addFiles([new File(['data'], 'q.heic', { type: 'image/heic' })]);
			filesStore.setFileStatus(filesStore.items[0].id, 'error');
			expect(filesStore.hasErrors).toBe(true);
		});

		it('averageProgress returns correct mean', async () => {
			await filesStore.addFiles([
				new File(['data'], 'r.heic', { type: 'image/heic' }),
				new File(['data'], 's.heic', { type: 'image/heic' }),
			]);
			filesStore.setFileProgress(filesStore.items[0].id, 40);
			filesStore.setFileProgress(filesStore.items[1].id, 60);
			expect(filesStore.averageProgress).toBe(50);
		});
	});

	describe('batch stats', () => {
		it('startBatch records totalFiles and startTime', () => {
			filesStore.startBatch(5);
			expect(filesStore.batchStats.totalFiles).toBe(5);
			expect(filesStore.batchStats.startTime).toBeGreaterThan(0);
			expect(filesStore.batchStats.endTime).toBeNull();
		});

		it('endBatch records endTime', () => {
			filesStore.startBatch(3);
			filesStore.endBatch();
			expect(filesStore.batchStats.endTime).not.toBeNull();
		});

		it('resetBatchStats clears stats', () => {
			filesStore.startBatch(3);
			filesStore.endBatch();
			filesStore.resetBatchStats();
			expect(filesStore.batchStats.startTime).toBeNull();
			expect(filesStore.batchStats.totalFiles).toBe(0);
		});
	});

	describe('clearAll', () => {
		it('removes items and resets batch stats', async () => {
			await filesStore.addFiles([new File(['data'], 't.heic', { type: 'image/heic' })]);
			filesStore.startBatch(1);
			filesStore.clearAll();
			expect(filesStore.items).toEqual([]);
			expect(filesStore.batchStats.startTime).toBeNull();
		});
	});
});
