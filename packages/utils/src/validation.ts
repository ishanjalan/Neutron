/**
 * Valibot-based validation utilities for Neutron
 * ~92% smaller than Zod, perfect for client-side validation
 *
 * @example
 * ```ts
 * import { validateSettings, PDFSettingsSchema } from '@neutron/utils/validation';
 *
 * const result = validateSettings(userInput);
 * if (result.success) {
 *   console.log(result.data); // Type-safe validated data
 * } else {
 *   console.error(result.issues); // Validation errors
 * }
 * ```
 */

import * as v from 'valibot';

// ============================================
// Common Validators
// ============================================

/** Email validation */
export const EmailSchema = v.pipe(
	v.string(),
	v.trim(),
	v.email('Invalid email format'),
	v.maxLength(254, 'Email too long')
);

/** Non-empty string */
export const NonEmptyString = v.pipe(v.string(), v.trim(), v.minLength(1, 'Cannot be empty'));

/** Positive integer */
export const PositiveInt = v.pipe(
	v.number(),
	v.integer('Must be a whole number'),
	v.minValue(1, 'Must be positive')
);

/** Percentage (0-100) */
export const Percentage = v.pipe(
	v.number(),
	v.minValue(0, 'Cannot be negative'),
	v.maxValue(100, 'Cannot exceed 100')
);

/** File size in bytes (max 2GB) */
export const FileSize = v.pipe(
	v.number(),
	v.integer(),
	v.minValue(0),
	v.maxValue(2 * 1024 * 1024 * 1024, 'File too large')
);

// ============================================
// PDF Tool Schemas (Smash)
// ============================================

export const PDFToolSchema = v.picklist([
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
]);

export const CompressionPresetSchema = v.picklist(['screen', 'ebook', 'printer', 'prepress']);

export const ImageFormatSchema = v.picklist(['png', 'jpg', 'webp']);

export const DPISchema = v.picklist([72, 150, 300]);

export const RotationAngleSchema = v.picklist([90, 180, 270]);

export const PageNumberPositionSchema = v.picklist([
	'bottom-center',
	'bottom-right',
	'top-center',
	'top-right',
]);

export const SplitModeSchema = v.picklist(['range', 'extract', 'every-n']);

export const PDFSettingsSchema = v.object({
	tool: PDFToolSchema,
	compressionPreset: CompressionPresetSchema,
	imageFormat: ImageFormatSchema,
	imageQuality: Percentage,
	imageDPI: DPISchema,
	splitMode: SplitModeSchema,
	splitEveryN: PositiveInt,
	splitRange: v.string(),
	rotationAngle: RotationAngleSchema,
	userPassword: v.string(),
	ownerPassword: v.string(),
	watermarkText: v.string(),
	watermarkOpacity: Percentage,
	pageNumberPosition: PageNumberPositionSchema,
});

export type PDFSettings = v.InferOutput<typeof PDFSettingsSchema>;

// ============================================
// Video Tool Schemas (Squash)
// ============================================

export const VideoQualitySchema = v.picklist(['tiny', 'web', 'social', 'high', 'lossless']);

export const OutputFormatSchema = v.picklist(['mp4', 'webm', 'av1', 'hevc']);

export const ResolutionSchema = v.picklist([
	'original',
	'2160p',
	'1440p',
	'1080p',
	'720p',
	'480p',
	'360p',
]);

export const AudioBitrateSchema = v.picklist(['64k', '128k', '192k', '256k', '320k']);

export const AudioCodecSchema = v.picklist(['aac', 'opus', 'mp3', 'copy', 'none']);

export const PresetSchema = v.picklist([
	'ultrafast',
	'veryfast',
	'fast',
	'medium',
	'slow',
	'veryslow',
]);

export const CompressionSettingsSchema = v.object({
	quality: VideoQualitySchema,
	outputFormat: OutputFormatSchema,
	resolution: ResolutionSchema,
	audioBitrate: AudioBitrateSchema,
	audioCodec: AudioCodecSchema,
	stripMetadata: v.boolean(),
	twoPass: v.boolean(),
	preset: PresetSchema,
	targetSizeMB: v.optional(v.pipe(v.number(), v.minValue(1))),
});

export type CompressionSettings = v.InferOutput<typeof CompressionSettingsSchema>;

// ============================================
// Image Tool Schemas (Squish)
// ============================================

export const ImageOutputFormatSchema = v.picklist(['jpeg', 'png', 'webp', 'avif']);

export const ImageSettingsSchema = v.object({
	format: ImageOutputFormatSchema,
	quality: Percentage,
	maxWidth: v.optional(PositiveInt),
	maxHeight: v.optional(PositiveInt),
	preserveAspectRatio: v.boolean(),
});

export type ImageSettings = v.InferOutput<typeof ImageSettingsSchema>;

// ============================================
// GIF Tool Schemas (Swirl)
// ============================================

export const GIFSettingsSchema = v.object({
	fps: v.pipe(v.number(), v.minValue(1), v.maxValue(60)),
	width: v.optional(PositiveInt),
	quality: v.pipe(v.number(), v.minValue(1), v.maxValue(100)),
	loop: v.pipe(v.number(), v.minValue(0)), // 0 = infinite
});

export type GIFSettings = v.InferOutput<typeof GIFSettingsSchema>;

// ============================================
// Validation Helpers
// ============================================

/**
 * Validate data against a schema with full type inference
 * @returns Object with success flag, data (if valid), or issues (if invalid)
 */
export function validate<T extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
	schema: T,
	data: unknown
): v.SafeParseResult<T> {
	return v.safeParse(schema, data);
}

/**
 * Validate and return data or throw error
 * @throws Error with validation message if invalid
 */
export function validateOrThrow<T extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
	schema: T,
	data: unknown
): v.InferOutput<T> {
	return v.parse(schema, data);
}

/**
 * Validate PDF settings from localStorage
 */
export function validatePDFSettings(data: unknown): v.SafeParseResult<typeof PDFSettingsSchema> {
	return v.safeParse(PDFSettingsSchema, data);
}

/**
 * Validate video compression settings
 */
export function validateCompressionSettings(
	data: unknown
): v.SafeParseResult<typeof CompressionSettingsSchema> {
	return v.safeParse(CompressionSettingsSchema, data);
}

/**
 * Get human-readable error messages from validation result
 */
export function getValidationErrors(
	result: v.SafeParseResult<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>
): string[] {
	if (result.success) return [];
	return result.issues.map((issue) => {
		const path = issue.path?.map((p) => p.key).join('.') || 'value';
		return `${path}: ${issue.message}`;
	});
}

// Re-export valibot for advanced usage
export * as v from 'valibot';
