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
	EmailSchema,
	Percentage,
	PositiveInt,
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
		pageNumberPosition: 'bottom-center',
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
	});
});
