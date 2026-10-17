import { describe, it, expect } from 'vitest';
import { isSupportedVideo, rejectionMessage } from './file-rejection';

describe('rejectionMessage', () => {
	it('explains a single AVI file', () => {
		const msg = rejectionMessage([{ name: 'holiday.AVI' }]);
		expect(msg).toContain('holiday.AVI');
		expect(msg).toMatch(/AVI/);
		expect(msg).toMatch(/Convert it to MP4/);
	});

	it('names a single unsupported file and what is supported', () => {
		const msg = rejectionMessage([{ name: 'notes.txt' }]);
		expect(msg).toContain('notes.txt');
		expect(msg).toContain('MP4');
	});

	it('summarises several AVI files', () => {
		expect(rejectionMessage([{ name: 'a.avi' }, { name: 'b.avi' }])).toMatch(/2 AVI files/);
	});

	it('summarises a mixed batch', () => {
		expect(rejectionMessage([{ name: 'a.avi' }, { name: 'b.txt' }])).toMatch(/2 files/);
	});
});

describe('isSupportedVideo', () => {
	it('accepts MP4, WebM, MOV and MKV by type or extension', () => {
		expect(isSupportedVideo({ name: 'a.mp4', type: 'video/mp4' })).toBe(true);
		expect(isSupportedVideo({ name: 'a.webm', type: 'video/webm' })).toBe(true);
		expect(isSupportedVideo({ name: 'a.mov', type: 'video/quicktime' })).toBe(true);
		// MKV is often reported with an empty or generic type
		expect(isSupportedVideo({ name: 'a.mkv', type: '' })).toBe(true);
		expect(isSupportedVideo({ name: 'a.m4v', type: '' })).toBe(true);
	});

	it('rejects AVI even though its MIME type starts with video/', () => {
		expect(isSupportedVideo({ name: 'a.avi', type: 'video/x-msvideo' })).toBe(false);
		expect(isSupportedVideo({ name: 'a.avi', type: '' })).toBe(false);
	});

	it('rejects non-video files', () => {
		expect(isSupportedVideo({ name: 'notes.txt', type: 'text/plain' })).toBe(false);
	});
});
