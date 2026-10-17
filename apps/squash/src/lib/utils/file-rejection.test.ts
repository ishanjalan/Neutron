import { describe, it, expect } from 'vitest';
import { rejectionMessage } from './file-rejection';

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
