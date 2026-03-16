import { describe, it, expect, beforeEach } from 'vitest';
import { pdfs, parsePageRange, COMPRESSION_PRESETS, TOOLS } from './pdfs.svelte';

describe('pdfs store', () => {
	beforeEach(() => {
		pdfs.clearAll();
		localStorage.clear();
	});

	describe('initial state', () => {
		it('starts with empty items after clear', () => {
			expect(pdfs.items).toEqual([]);
		});

		it('has default settings', () => {
			expect(pdfs.settings.tool).toBe('compress');
			expect(pdfs.settings.compressionPreset).toBe('ebook');
			expect(pdfs.settings.imageFormat).toBe('png');
			expect(pdfs.settings.imageDPI).toBe(150);
		});
	});

	describe('updateSettings', () => {
		it('updates a single field', () => {
			pdfs.updateSettings({ compressionPreset: 'screen' });
			expect(pdfs.settings.compressionPreset).toBe('screen');
		});

		it('merges partial updates without losing other fields', () => {
			const originalTool = pdfs.settings.tool;
			pdfs.updateSettings({ imageFormat: 'jpg' });
			expect(pdfs.settings.tool).toBe(originalTool);
			expect(pdfs.settings.imageFormat).toBe('jpg');
		});

		it('persists settings to localStorage', () => {
			pdfs.updateSettings({ watermarkText: 'DRAFT' });
			const saved = JSON.parse(localStorage.getItem('smash-settings') ?? '{}');
			expect(saved.watermarkText).toBe('DRAFT');
		});
	});

	describe('setTool', () => {
		it('changes the active tool', () => {
			pdfs.setTool('merge');
			expect(pdfs.settings.tool).toBe('merge');
		});

		it('clears items when switching between incompatible file types', async () => {
			// Add a fake PDF item first
			await pdfs.addFiles([new File(['%PDF'], 'test.pdf', { type: 'application/pdf' })]);
			expect(pdfs.items.length).toBe(1);

			// Switch to images-to-pdf (accepts images, not PDFs)
			pdfs.setTool('images-to-pdf');
			expect(pdfs.items).toEqual([]);
		});

		it('does NOT clear items when switching between tools that accept the same type', async () => {
			// Both compress and merge accept .pdf
			pdfs.setTool('compress');
			await pdfs.addFiles([new File(['%PDF'], 'test.pdf', { type: 'application/pdf' })]);
			const countBefore = pdfs.items.length;

			pdfs.setTool('merge');
			// Items are only cleared when accepts string differs
			expect(pdfs.items.length).toBe(countBefore);
		});
	});

	describe('addFiles', () => {
		it('accepts PDF files for non-images-to-pdf tools', async () => {
			pdfs.setTool('compress');
			await pdfs.addFiles([new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' })]);
			expect(pdfs.items.length).toBe(1);
			expect(pdfs.items[0].name).toBe('doc.pdf');
		});

		it('rejects non-PDF files for PDF tools', async () => {
			pdfs.setTool('compress');
			await pdfs.addFiles([new File(['hello'], 'image.png', { type: 'image/png' })]);
			expect(pdfs.items.length).toBe(0);
		});

		it('accepts images for images-to-pdf tool', async () => {
			pdfs.setTool('images-to-pdf');
			await pdfs.addFiles([new File(['data'], 'photo.png', { type: 'image/png' })]);
			expect(pdfs.items.length).toBe(1);
			expect(pdfs.items[0].isImage).toBe(true);
		});

		it('assigns unique IDs', async () => {
			pdfs.setTool('compress');
			await pdfs.addFiles([
				new File(['%PDF'], 'a.pdf', { type: 'application/pdf' }),
				new File(['%PDF'], 'b.pdf', { type: 'application/pdf' }),
			]);
			const ids = pdfs.items.map((i) => i.id);
			expect(new Set(ids).size).toBe(2);
		});
	});

	describe('updateItem', () => {
		it('updates item fields', async () => {
			pdfs.setTool('compress');
			await pdfs.addFiles([new File(['%PDF'], 'x.pdf', { type: 'application/pdf' })]);
			const id = pdfs.items[0].id;

			pdfs.updateItem(id, { status: 'completed', progress: 100 });
			expect(pdfs.items[0].status).toBe('completed');
			expect(pdfs.items[0].progress).toBe(100);
		});
	});

	describe('removeItem', () => {
		it('removes item by id', async () => {
			pdfs.setTool('compress');
			await pdfs.addFiles([new File(['%PDF'], 'x.pdf', { type: 'application/pdf' })]);
			const id = pdfs.items[0].id;

			pdfs.removeItem(id);
			expect(pdfs.items).toEqual([]);
		});
	});

	describe('reorderItems', () => {
		it('moves item from one index to another and updates order', async () => {
			pdfs.setTool('merge');
			await pdfs.addFiles([
				new File(['%PDF'], 'first.pdf', { type: 'application/pdf' }),
				new File(['%PDF'], 'second.pdf', { type: 'application/pdf' }),
				new File(['%PDF'], 'third.pdf', { type: 'application/pdf' }),
			]);

			pdfs.reorderItems(0, 2);
			expect(pdfs.items[0].name).toBe('second.pdf');
			expect(pdfs.items[2].name).toBe('first.pdf');
			expect(pdfs.items.map((i) => i.order)).toEqual([0, 1, 2]);
		});
	});

	describe('clearAll', () => {
		it('clears all items', async () => {
			pdfs.setTool('compress');
			await pdfs.addFiles([new File(['%PDF'], 'x.pdf', { type: 'application/pdf' })]);
			expect(pdfs.items.length).toBe(1);

			pdfs.clearAll();
			expect(pdfs.items).toEqual([]);
		});
	});

	describe('getItemById', () => {
		it('returns the matching item', async () => {
			pdfs.setTool('compress');
			await pdfs.addFiles([new File(['%PDF'], 'find-me.pdf', { type: 'application/pdf' })]);
			const id = pdfs.items[0].id;

			expect(pdfs.getItemById(id)?.name).toBe('find-me.pdf');
		});

		it('returns undefined for unknown id', () => {
			expect(pdfs.getItemById('nonexistent')).toBeUndefined();
		});
	});
});

describe('COMPRESSION_PRESETS', () => {
	it('has all 4 expected presets', () => {
		expect(Object.keys(COMPRESSION_PRESETS)).toEqual(['screen', 'ebook', 'printer', 'prepress']);
	});

	it('marks ebook as recommended', () => {
		expect(COMPRESSION_PRESETS.ebook.recommended).toBe(true);
	});
});

describe('TOOLS', () => {
	it('includes compress, merge, split, ocr', () => {
		const values = TOOLS.map((t) => t.value);
		expect(values).toContain('compress');
		expect(values).toContain('merge');
		expect(values).toContain('split');
		expect(values).toContain('ocr');
	});
});

describe('parsePageRange', () => {
	it('parses a single page number', () => {
		expect(parsePageRange('3', 10)).toEqual([3]);
	});

	it('parses a range', () => {
		expect(parsePageRange('2-5', 10)).toEqual([2, 3, 4, 5]);
	});

	it('parses a comma-separated mix', () => {
		expect(parsePageRange('1-3, 7, 9-10', 10)).toEqual([1, 2, 3, 7, 9, 10]);
	});

	it('clamps to maxPages', () => {
		expect(parsePageRange('8-15', 10)).toEqual([8, 9, 10]);
	});

	it('ignores pages below 1', () => {
		expect(parsePageRange('0-3', 10)).toEqual([1, 2, 3]);
	});

	it('returns empty array for blank input', () => {
		expect(parsePageRange('', 10)).toEqual([]);
	});

	it('returns deduplicated sorted pages', () => {
		expect(parsePageRange('3,1,2,1-3', 10)).toEqual([1, 2, 3]);
	});
});
