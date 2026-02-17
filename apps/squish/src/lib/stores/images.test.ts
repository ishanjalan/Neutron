import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { images, type OutputFormat } from './images.svelte';

describe('images store', () => {
	// Store initial state
	let initialSettings: any;

	beforeEach(() => {
		// Save initial settings
		initialSettings = { ...images.settings };
		// Clear all items and reset
		images.clearAll();
		localStorage.clear();
	});

	afterEach(() => {
		// Restore initial settings
		images.updateSettings(initialSettings);
	});

	describe('initial state', () => {
		it('should initialize with empty items after clear', () => {
			expect(images.items).toEqual([]);
		});

		it('should have default settings', () => {
			expect(images.settings.quality).toBe(80);
			expect(images.settings.outputFormat).toBe('webp');
			expect(images.settings.stripMetadata).toBe(true);
			expect(images.settings.lossless).toBe(false);
		});

		it('should initialize with empty selection', () => {
			expect(images.selectedIds.size).toBe(0);
		});
	});

	describe('updateSettings', () => {
		it('should update quality setting', () => {
			images.updateSettings({ quality: 90 });
			expect(images.settings.quality).toBe(90);
		});

		it('should update output format', () => {
			images.updateSettings({ outputFormat: 'avif' as OutputFormat });
			expect(images.settings.outputFormat).toBe('avif');
		});

		it('should update multiple settings at once', () => {
			images.updateSettings({
				quality: 95,
				stripMetadata: false,
				lossless: true,
			});
			expect(images.settings.quality).toBe(95);
			expect(images.settings.stripMetadata).toBe(false);
			expect(images.settings.lossless).toBe(true);
		});

		it('should not affect unspecified settings', () => {
			const originalFormat = images.settings.outputFormat;
			images.updateSettings({ quality: 70 });
			expect(images.settings.outputFormat).toBe(originalFormat);
		});
	});

	describe('filename template', () => {
		it('should have default filename template', () => {
			expect(images.settings.filenameTemplate).toBe('{name}-optimized.{ext}');
		});

		it('should update filename template', () => {
			images.updateSettings({ filenameTemplate: '{name}-squished.{ext}' });
			expect(images.settings.filenameTemplate).toBe('{name}-squished.{ext}');
		});
	});

	describe('resize settings', () => {
		it('should default resize to disabled', () => {
			expect(images.settings.resizeEnabled).toBe(false);
		});

		it('should have default resize mode', () => {
			expect(images.settings.resizeMode).toBe('percentage');
		});

		it('should update resize settings', () => {
			images.updateSettings({
				resizeEnabled: true,
				resizeMode: 'fit',
				resizeMaxWidth: 1024,
				resizeMaxHeight: 768,
			});

			expect(images.settings.resizeEnabled).toBe(true);
			expect(images.settings.resizeMode).toBe('fit');
			expect(images.settings.resizeMaxWidth).toBe(1024);
			expect(images.settings.resizeMaxHeight).toBe(768);
		});
	});

	describe('target size mode', () => {
		it('should default target size mode to false', () => {
			expect(images.settings.targetSizeMode).toBe(false);
		});

		it('should have default target size', () => {
			expect(images.settings.targetSizeKB).toBe(500);
		});

		it('should update target size settings', () => {
			images.updateSettings({
				targetSizeMode: true,
				targetSizeKB: 250,
			});

			expect(images.settings.targetSizeMode).toBe(true);
			expect(images.settings.targetSizeKB).toBe(250);
		});
	});

	describe('clearAll', () => {
		it('should clear all items', () => {
			expect(() => images.clearAll()).not.toThrow();
			expect(images.items).toEqual([]);
		});
	});
});
