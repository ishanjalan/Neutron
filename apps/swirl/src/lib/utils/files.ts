import { toast } from '@neutron/ui';

const GIF_MAGIC = 'GIF8';

/** True when the first bytes spell a GIF header, whatever the extension or MIME type says. */
export async function isGifFile(file: File): Promise<boolean> {
	if (file.size < 14) return false;
	const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
	return String.fromCharCode(...head) === GIF_MAGIC;
}

/**
 * Keep only real GIFs from a drop/selection and tell the user about the rest, so nothing is
 * silently skipped (empty files, renamed PNGs, videos dropped on a GIF tool, ...).
 */
export async function acceptGifFiles(files: File[]): Promise<File[]> {
	const accepted: File[] = [];
	const rejected: string[] = [];
	for (const file of files) {
		if (await isGifFile(file)) accepted.push(file);
		else rejected.push(file.size === 0 ? `${file.name} (empty file)` : file.name);
	}
	if (rejected.length > 0) {
		const names =
			rejected.length > 2
				? `${rejected.slice(0, 2).join(', ')} +${rejected.length - 2}`
				: rejected.join(', ');
		toast.error(
			accepted.length > 0
				? `Skipped ${rejected.length} file(s) that aren't valid GIFs: ${names}`
				: `Not a valid GIF: ${names}. Please choose .gif files.`
		);
	}
	return accepted;
}
