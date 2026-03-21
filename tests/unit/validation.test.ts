/**
 * Unit tests for Valibot validation utilities
 * Run with: pnpm test:unit
 */

import { describe, it, expect } from 'vitest';
import {
	validate,
	validateOrThrow,
	getValidationErrors,
	PDFSettingsSchema,
	CompressionSettingsSchema,
	ImageSettingsSchema,
	GIFSettingsSchema,
	EmailSchema,
	NonEmptyString,
	FileSize,
	Percentage,
	PositiveInt,
	CompressionPresetSchema,
	ImageFormatSchema,
	PDFToolSchema,
	v,
} from '@neutron/utils/validation';

describe('Common Validators', () => {
	describe('EmailSchema', () => {
		it('should accept valid emails', () => {
			const result = v.safeParse(EmailSchema, 'test@example.com');
			expect(result.success).toBe(true);
		});

		it('should reject invalid emails', () => {
			const result = v.safeParse(EmailSchema, 'not-an-email');
			expect(result.success).toBe(false);
		});

		it('should trim whitespace', () => {
			const result = v.safeParse(EmailSchema, '  test@example.com  ');
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.output).toBe('test@example.com');
			}
		});
	});

	describe('Percentage', () => {
		it('should accept values 0-100', () => {
			expect(v.safeParse(Percentage, 0).success).toBe(true);
			expect(v.safeParse(Percentage, 50).success).toBe(true);
			expect(v.safeParse(Percentage, 100).success).toBe(true);
		});

		it('should reject values outside 0-100', () => {
			expect(v.safeParse(Percentage, -1).success).toBe(false);
			expect(v.safeParse(Percentage, 101).success).toBe(false);
		});
	});

	describe('PositiveInt', () => {
		it('should accept positive integers', () => {
			expect(v.safeParse(PositiveInt, 1).success).toBe(true);
			expect(v.safeParse(PositiveInt, 100).success).toBe(true);
		});

		it('should reject zero, negative, and decimals', () => {
			expect(v.safeParse(PositiveInt, 0).success).toBe(false);
			expect(v.safeParse(PositiveInt, -1).success).toBe(false);
			expect(v.safeParse(PositiveInt, 1.5).success).toBe(false);
		});
	});
});

describe('PDFSettingsSchema', () => {
	const validSettings = {
		tool: 'compress',
		compressionPreset: 'ebook',
		imageFormat: 'png',
		imageQuality: 85,
		imageDPI: 150,
		splitMode: 'range',
		splitEveryN: 1,
		splitRange: '1-5',
		rotationAngle: 90,
		userPassword: '',
		ownerPassword: '',
		watermarkText: '',
		watermarkOpacity: 30,
		watermarkFontSize: 48,
		pageNumberPosition: 'bottom-center',
		pageNumberStartAt: 1,
		pageNumberFontSize: 12,
		metadataTitle: '',
		metadataAuthor: '',
		metadataSubject: '',
		metadataKeywords: '',
		blankPageThreshold: 0,
	};

	it('should accept valid PDF settings', () => {
		const result = validate(PDFSettingsSchema, validSettings);
		expect(result.success).toBe(true);
	});

	it('should reject invalid tool', () => {
		const result = validate(PDFSettingsSchema, {
			...validSettings,
			tool: 'invalid-tool',
		});
		expect(result.success).toBe(false);
	});

	it('should reject invalid compression preset', () => {
		const result = validate(PDFSettingsSchema, {
			...validSettings,
			compressionPreset: 'ultra',
		});
		expect(result.success).toBe(false);
	});

	it('should reject quality outside 0-100', () => {
		const result = validate(PDFSettingsSchema, {
			...validSettings,
			imageQuality: 150,
		});
		expect(result.success).toBe(false);
	});
});

describe('CompressionSettingsSchema', () => {
	const validSettings = {
		quality: 'web',
		outputFormat: 'mp4',
		resolution: '1080p',
		audioBitrate: '128k',
		audioCodec: 'aac',
		stripMetadata: false,
		twoPass: false,
		preset: 'medium',
	};

	it('should accept valid compression settings', () => {
		const result = validate(CompressionSettingsSchema, validSettings);
		expect(result.success).toBe(true);
	});

	it('should accept optional targetSizeMB', () => {
		const result = validate(CompressionSettingsSchema, {
			...validSettings,
			targetSizeMB: 50,
		});
		expect(result.success).toBe(true);
	});

	it('should reject targetSizeMB less than 1', () => {
		const result = validate(CompressionSettingsSchema, {
			...validSettings,
			targetSizeMB: 0.5,
		});
		expect(result.success).toBe(false);
	});
});

describe('NonEmptyString', () => {
	it('accepts non-empty string', () => {
		expect(v.safeParse(NonEmptyString, 'hello').success).toBe(true);
	});

	it('rejects empty string', () => {
		expect(v.safeParse(NonEmptyString, '').success).toBe(false);
	});

	it('rejects whitespace-only string', () => {
		expect(v.safeParse(NonEmptyString, '   ').success).toBe(false);
	});
});

describe('FileSize', () => {
	it('accepts 0 bytes', () => {
		expect(v.safeParse(FileSize, 0).success).toBe(true);
	});

	it('accepts 2GB', () => {
		expect(v.safeParse(FileSize, 2 * 1024 * 1024 * 1024).success).toBe(true);
	});

	it('rejects negative values', () => {
		expect(v.safeParse(FileSize, -1).success).toBe(false);
	});

	it('rejects fractional values', () => {
		expect(v.safeParse(FileSize, 1.5).success).toBe(false);
	});
});

describe('CompressionPresetSchema', () => {
	it('accepts all valid presets', () => {
		for (const preset of ['screen', 'ebook', 'printer', 'prepress'] as const) {
			expect(v.safeParse(CompressionPresetSchema, preset).success).toBe(true);
		}
	});

	it('rejects unknown preset', () => {
		expect(v.safeParse(CompressionPresetSchema, 'ultra').success).toBe(false);
	});
});

describe('ImageFormatSchema', () => {
	it('accepts png, jpg, webp', () => {
		for (const fmt of ['png', 'jpg', 'webp'] as const) {
			expect(v.safeParse(ImageFormatSchema, fmt).success).toBe(true);
		}
	});

	it('rejects unknown format', () => {
		expect(v.safeParse(ImageFormatSchema, 'gif').success).toBe(false);
	});
});

describe('PDFToolSchema', () => {
	const validTools = [
		'compress',
		'merge',
		'split',
		'rotate',
		'delete-pages',
		'reorder',
		'pdf-to-images',
		'images-to-pdf',
		'add-page-numbers',
		'watermark',
		'protect',
		'unlock',
		'ocr',
		'reverse-pages',
		'remove-blank-pages',
		'edit-metadata',
	] as const;

	it('accepts all 16 current tool names', () => {
		for (const tool of validTools) {
			expect(v.safeParse(PDFToolSchema, tool).success).toBe(true);
		}
	});

	it('rejects unknown tool', () => {
		expect(v.safeParse(PDFToolSchema, 'redact').success).toBe(false);
	});
});

describe('GIFSettingsSchema', () => {
	const valid = { fps: 24, width: 640, quality: 80, loop: 0 };

	it('accepts valid GIF settings', () => {
		expect(validate(GIFSettingsSchema, valid).success).toBe(true);
	});

	it('accepts fps boundary values (1 and 60)', () => {
		expect(validate(GIFSettingsSchema, { ...valid, fps: 1 }).success).toBe(true);
		expect(validate(GIFSettingsSchema, { ...valid, fps: 60 }).success).toBe(true);
	});

	it('rejects fps outside 1-60', () => {
		expect(validate(GIFSettingsSchema, { ...valid, fps: 0 }).success).toBe(false);
		expect(validate(GIFSettingsSchema, { ...valid, fps: 61 }).success).toBe(false);
	});

	it('rejects quality outside 1-100', () => {
		expect(validate(GIFSettingsSchema, { ...valid, quality: 0 }).success).toBe(false);
		expect(validate(GIFSettingsSchema, { ...valid, quality: 101 }).success).toBe(false);
	});

	it('accepts loop = 0 (infinite)', () => {
		expect(validate(GIFSettingsSchema, { ...valid, loop: 0 }).success).toBe(true);
	});

	it('rejects negative loop', () => {
		expect(validate(GIFSettingsSchema, { ...valid, loop: -1 }).success).toBe(false);
	});

	it('accepts undefined width (optional)', () => {
		const { width: _, ...noWidth } = valid;
		expect(validate(GIFSettingsSchema, noWidth).success).toBe(true);
	});
});

describe('ImageSettingsSchema', () => {
	const valid = {
		format: 'webp',
		quality: 85,
		preserveAspectRatio: true,
	};

	it('accepts valid image settings', () => {
		expect(validate(ImageSettingsSchema, valid).success).toBe(true);
	});

	it('accepts optional maxWidth and maxHeight', () => {
		expect(validate(ImageSettingsSchema, { ...valid, maxWidth: 1920, maxHeight: 1080 }).success).toBe(
			true
		);
	});

	it('rejects invalid format', () => {
		expect(validate(ImageSettingsSchema, { ...valid, format: 'gif' }).success).toBe(false);
	});

	it('rejects quality outside 0-100', () => {
		expect(validate(ImageSettingsSchema, { ...valid, quality: 150 }).success).toBe(false);
	});
});

describe('Validation Helpers', () => {
	describe('validateOrThrow', () => {
		it('should return data when valid', () => {
			const data = validateOrThrow(Percentage, 50);
			expect(data).toBe(50);
		});

		it('should throw when invalid', () => {
			expect(() => validateOrThrow(Percentage, 150)).toThrow();
		});
	});

	describe('getValidationErrors', () => {
		it('should return empty array for valid data', () => {
			const result = v.safeParse(Percentage, 50);
			const errors = getValidationErrors(result);
			expect(errors).toEqual([]);
		});

		it('should return error messages for invalid data', () => {
			const result = v.safeParse(Percentage, 150);
			const errors = getValidationErrors(result);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toContain('100');
		});

		it('returns array of strings', () => {
			const result = v.safeParse(PDFToolSchema, 'unknown-tool');
			const errors = getValidationErrors(result);
			expect(Array.isArray(errors)).toBe(true);
			for (const e of errors) {
				expect(e).toBeTypeOf('string');
			}
		});
	});
});
