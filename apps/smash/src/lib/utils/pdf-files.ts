import { toast } from '@neutron/ui';

/** True when the file starts like a PDF ("%PDF-" within the first 1 KB), whatever its name or type. */
export async function isPdfFile(file: File): Promise<boolean> {
	if (file.size < 8) return false;
	const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
	const marker = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
	for (let i = 0; i + marker.length <= head.length; i++) {
		if (marker.every((byte, j) => head[i + j] === byte)) return true;
	}
	return false;
}

/**
 * Keep only real PDFs and tell the user about the rest, so nothing is silently skipped or
 * left to fail later with a parser error (empty files, renamed documents, ...).
 */
export async function acceptPdfFiles(files: File[]): Promise<File[]> {
	const accepted: File[] = [];
	const rejected: string[] = [];
	for (const file of files) {
		if (await isPdfFile(file)) accepted.push(file);
		else rejected.push(file.size === 0 ? `${file.name} (empty file)` : file.name);
	}
	if (rejected.length > 0) {
		const names =
			rejected.length > 2
				? `${rejected.slice(0, 2).join(', ')} +${rejected.length - 2}`
				: rejected.join(', ');
		toast.error(
			accepted.length > 0
				? `Skipped ${rejected.length} file(s) that aren't valid PDFs: ${names}`
				: `Not a valid PDF: ${names}. Please choose a .pdf file.`
		);
	}
	return accepted;
}
