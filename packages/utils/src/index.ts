// Re-export all utilities
export { formatBytes, formatPercent, formatDuration } from './format';
export { getOutputFilename } from './filename';
export {
	downloadBlob,
	downloadAllAsZip,
	downloadMultipleFiles,
	saveFilesToDirectory,
	isFileSystemAccessSupported,
	isClipboardWriteSupported,
	copyBlobToClipboard,
	type DownloadFile,
	type ZipProgressCallback,
} from './download';
export { trapFocus, releaseFocus, focusTrap, createFocusTrap } from './focus-trap';
export { createTrackedUrl, revokeTrackedUrl, revokeAll, getTrackedUrlCount } from './blob-url';
export {
	createWorkerPool,
	type WorkerPoolJob,
	type WorkerPoolConfig,
	type WorkerPoolInstance,
	type PoolStatus,
} from './worker-pool';

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

export {
	NEUTRON_APPS,
	NEUTRON_APPS_LIST,
	type AppId,
	type NeutronApp,
} from './apps';
