// Re-export all utilities
export { formatBytes, formatPercent, formatDuration } from './format';
export {
	downloadBlob,
	isFileSystemAccessSupported,
	isClipboardWriteSupported,
	copyBlobToClipboard,
} from './download';
export { trapFocus, releaseFocus, focusTrap, createFocusTrap } from './focus-trap';

// Validation utilities (Valibot)
export {
	// Common validators
	EmailSchema,
	NonEmptyString,
	PositiveInt,
	Percentage,
	FileSize,
	// PDF schemas
	PDFToolSchema,
	PDFSettingsSchema,
	CompressionPresetSchema,
	ImageFormatSchema,
	// Video schemas
	CompressionSettingsSchema,
	VideoQualitySchema,
	OutputFormatSchema,
	ResolutionSchema,
	// Helpers
	validate,
	validateOrThrow,
	validatePDFSettings,
	validateCompressionSettings,
	getValidationErrors,
	// Valibot namespace for advanced usage
	v,
} from './validation';

export type { PDFSettings, CompressionSettings, ImageSettings, GIFSettings } from './validation';
