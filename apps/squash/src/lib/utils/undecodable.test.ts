import { describe, it, expect } from 'vitest';
import { UndecodableSourceError, isUnsupportedInputError } from './webcodecs';

describe('UndecodableSourceError', () => {
	it('names the codec and tells ProRes users what to do', () => {
		const error = new UndecodableSourceError('video', 'prores');
		expect(error.message).toMatch(/ProRes/);
		expect(error.message).toMatch(/H\.264 or HEVC/);
		expect(error.message).not.toMatch(/discarded|isValid/);
	});

	it('falls back to generic advice for other or unknown codecs', () => {
		expect(new UndecodableSourceError('video', 'xyz').message).toMatch(/XYZ.*MP4 \(H\.264\)/);
		expect(new UndecodableSourceError('audio', null).message).toMatch(/^This audio uses a codec/);
	});

	it('counts as unsupported input, even when wrapped', () => {
		const wrapped = new Error('outer', { cause: new UndecodableSourceError('video', 'prores') });
		expect(isUnsupportedInputError(wrapped)).toBe(true);
	});
});
