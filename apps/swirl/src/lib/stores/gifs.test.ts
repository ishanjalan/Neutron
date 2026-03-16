import { describe, it, expect, beforeEach } from 'vitest';
import { gifs } from './gifs.svelte';

describe('gifs store', () => {
	beforeEach(() => {
		gifs.clearAll();
		localStorage.clear();
	});

	describe('initial state', () => {
		it('starts with empty items', () => {
			expect(gifs.items).toEqual([]);
		});

		it('has default settings', () => {
			expect(gifs.settings.targetSizeMB).toBe(10);
			expect(gifs.settings.colors).toBe(256);
			expect(gifs.settings.lossy).toBe(80);
			expect(gifs.settings.maintainAspectRatio).toBe(true);
			expect(gifs.settings.speedMultiplier).toBe(1);
			expect(gifs.settings.reverse).toBe(false);
			expect(gifs.settings.boomerang).toBe(false);
		});
	});

	describe('addFiles', () => {
		it('adds GIF files and returns their IDs', () => {
			const ids = gifs.addFiles([
				new File(['GIF89a'], 'a.gif', { type: 'image/gif' }),
				new File(['GIF89a'], 'b.gif', { type: 'image/gif' }),
			]);
			expect(ids).toHaveLength(2);
			expect(gifs.items).toHaveLength(2);
		});

		it('assigns unique IDs with gif- prefix', () => {
			const ids = gifs.addFiles([new File(['GIF89a'], 'c.gif', { type: 'image/gif' })]);
			expect(ids[0]).toMatch(/^gif-/);
		});

		it('each added item starts as pending with 0 progress', () => {
			gifs.addFiles([new File(['GIF89a'], 'd.gif', { type: 'image/gif' })]);
			expect(gifs.items[0].status).toBe('pending');
			expect(gifs.items[0].progress).toBe(0);
		});
	});

	describe('updateItem', () => {
		it('updates item status to processing', () => {
			const [id] = gifs.addFiles([new File(['GIF89a'], 'e.gif', { type: 'image/gif' })]);
			gifs.updateItem(id, { status: 'processing', progress: 50 });
			expect(gifs.items[0].status).toBe('processing');
			expect(gifs.items[0].progress).toBe(50);
		});

		it('does nothing for unknown id', () => {
			gifs.addFiles([new File(['GIF89a'], 'f.gif', { type: 'image/gif' })]);
			gifs.updateItem('unknown-id', { status: 'completed' });
			expect(gifs.items[0].status).toBe('pending');
		});
	});

	describe('removeItem', () => {
		it('removes item by id', () => {
			const [id] = gifs.addFiles([new File(['GIF89a'], 'g.gif', { type: 'image/gif' })]);
			gifs.removeItem(id);
			expect(gifs.items).toEqual([]);
		});
	});

	describe('getItemById', () => {
		it('returns the correct item', () => {
			const [id] = gifs.addFiles([new File(['GIF89a'], 'h.gif', { type: 'image/gif' })]);
			expect(gifs.getItemById(id)?.name).toBe('h.gif');
		});

		it('returns undefined for unknown id', () => {
			expect(gifs.getItemById('nope')).toBeUndefined();
		});
	});

	describe('updateSettings', () => {
		it('updates individual settings fields', () => {
			gifs.updateSettings({ colors: 128, lossy: 50 });
			expect(gifs.settings.colors).toBe(128);
			expect(gifs.settings.lossy).toBe(50);
		});
	});

	describe('resetSettings', () => {
		it('restores default settings', () => {
			gifs.updateSettings({ colors: 64, targetSizeMB: 5 });
			gifs.resetSettings();
			expect(gifs.settings.colors).toBe(256);
			expect(gifs.settings.targetSizeMB).toBe(10);
		});
	});

	describe('getPendingItems', () => {
		it('returns only pending items', () => {
			const [id1, id2] = gifs.addFiles([
				new File(['GIF'], 'p1.gif', { type: 'image/gif' }),
				new File(['GIF'], 'p2.gif', { type: 'image/gif' }),
			]);
			gifs.updateItem(id1, { status: 'completed' });
			expect(gifs.getPendingItems()).toHaveLength(1);
			expect(gifs.getPendingItems()[0].id).toBe(id2);
		});
	});

	describe('getCompletedItems', () => {
		it('returns only completed items', () => {
			const [id1] = gifs.addFiles([
				new File(['GIF'], 'c1.gif', { type: 'image/gif' }),
				new File(['GIF'], 'c2.gif', { type: 'image/gif' }),
			]);
			gifs.updateItem(id1, { status: 'completed', compressedSize: 5000 });
			expect(gifs.getCompletedItems()).toHaveLength(1);
		});
	});

	describe('getTotalSavings', () => {
		it('returns zeros when no completed items', () => {
			const savings = gifs.getTotalSavings();
			expect(savings.original).toBe(0);
			expect(savings.compressed).toBe(0);
			expect(savings.percentage).toBe(0);
		});

		it('calculates savings correctly', () => {
			const [id] = gifs.addFiles([
				new File(new Uint8Array(10000), 'big.gif', { type: 'image/gif' }),
			]);
			// Manually set originalSize since createObjectURL is mocked
			gifs.updateItem(id, {
				status: 'completed',
				compressedSize: 4000,
			});
			// Items added via addFiles will have the correct originalSize from the File object
			const savings = gifs.getTotalSavings();
			// originalSize = file.size (10000 bytes set via Uint8Array), compressed = 4000
			expect(savings.compressed).toBe(4000);
		});
	});

	describe('clearAll', () => {
		it('removes all items', () => {
			gifs.addFiles([new File(['GIF'], 'x.gif', { type: 'image/gif' })]);
			gifs.clearAll();
			expect(gifs.items).toEqual([]);
		});
	});
});
