/**
 * Download utilities for Swirl -- thin wrappers over @neutron/utils
 */

export {
	downloadBlob,
	downloadAllAsZip,
	copyBlobToClipboard,
	isClipboardWriteSupported,
	type DownloadFile as DownloadableItem,
} from '@neutron/utils';
import { getOutputFilename as getOutputFilenameShared } from '@neutron/utils';

/**
 * Get output filename for a processed GIF
 */
export function getOutputFilename(originalName: string, suffix?: string): string {
	return getOutputFilenameShared(originalName, { suffix: suffix ?? 'processed', extension: 'gif' });
}
