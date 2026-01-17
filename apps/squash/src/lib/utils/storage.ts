/**
 * IndexedDB Storage for Large Video Files
 * Prevents memory issues with large videos by storing them in IndexedDB
 */

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'squash-storage';
const DB_VERSION = 1;

interface SquashDB {
	videos: {
		key: string;
		value: {
			id: string;
			originalBlob: Blob;
			compressedBlob?: Blob;
			metadata: {
				name: string;
				size: number;
				type: string;
				lastModified: number;
			};
			createdAt: number;
		};
	};
	settings: {
		key: string;
		value: unknown;
	};
}

let dbInstance: IDBPDatabase<SquashDB> | null = null;

async function getDB(): Promise<IDBPDatabase<SquashDB>> {
	if (dbInstance) return dbInstance;

	dbInstance = await openDB<SquashDB>(DB_NAME, DB_VERSION, {
		upgrade(db) {
			// Videos store
			if (!db.objectStoreNames.contains('videos')) {
				db.createObjectStore('videos', { keyPath: 'id' });
			}
			// Settings store
			if (!db.objectStoreNames.contains('settings')) {
				db.createObjectStore('settings');
			}
		}
	});

	return dbInstance;
}

// Large file threshold (50MB) - files above this are stored in IndexedDB
const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024;

export function isLargeFile(size: number): boolean {
	return size > LARGE_FILE_THRESHOLD;
}

export async function storeVideo(
	id: string,
	file: File,
	compressedBlob?: Blob
): Promise<void> {
	const db = await getDB();

	await db.put('videos', {
		id,
		originalBlob: file,
		compressedBlob,
		metadata: {
			name: file.name,
			size: file.size,
			type: file.type,
			lastModified: file.lastModified
		},
		createdAt: Date.now()
	});
}

export async function getVideoBlob(id: string): Promise<Blob | null> {
	const db = await getDB();
	const record = await db.get('videos', id);
	return record?.originalBlob ?? null;
}

export async function getCompressedBlob(id: string): Promise<Blob | null> {
	const db = await getDB();
	const record = await db.get('videos', id);
	return record?.compressedBlob ?? null;
}

export async function updateCompressedBlob(id: string, blob: Blob): Promise<void> {
	const db = await getDB();
	const record = await db.get('videos', id);
	if (record) {
		record.compressedBlob = blob;
		await db.put('videos', record);
	}
}

export async function deleteVideo(id: string): Promise<void> {
	const db = await getDB();
	await db.delete('videos', id);
}

export async function clearAllVideos(): Promise<void> {
	const db = await getDB();
	await db.clear('videos');
}

export async function getStorageUsage(): Promise<{
	count: number;
	totalSize: number;
	compressedSize: number;
}> {
	const db = await getDB();
	const all = await db.getAll('videos');

	let totalSize = 0;
	let compressedSize = 0;

	for (const record of all) {
		totalSize += record.originalBlob.size;
		if (record.compressedBlob) {
			compressedSize += record.compressedBlob.size;
		}
	}

	return {
		count: all.length,
		totalSize,
		compressedSize
	};
}

// Cleanup old entries (older than 24 hours)
export async function cleanupOldEntries(): Promise<number> {
	const db = await getDB();
	const all = await db.getAll('videos');
	const cutoff = Date.now() - 24 * 60 * 60 * 1000;

	let deleted = 0;
	for (const record of all) {
		if (record.createdAt < cutoff) {
			await db.delete('videos', record.id);
			deleted++;
		}
	}

	return deleted;
}
