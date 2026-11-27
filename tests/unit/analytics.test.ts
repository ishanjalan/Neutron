import { describe, it, expect } from 'vitest';
import { classifyFailure, eventRoute, failureCause } from '@neutron/utils/analytics';

describe('classifyFailure', () => {
	it('buckets messages without returning them', () => {
		expect(classifyFailure('Incorrect password. Please try again.')).toBe('password');
		expect(classifyFailure('Image too large for browser memory.')).toBe('memory');
		expect(classifyFailure(new Error('WebCodecs not supported'))).toBe('unsupported');
		expect(classifyFailure('Network error loading image')).toBe('network');
		expect(classifyFailure('Need at least 2 PDFs to merge')).toBe('invalid-input');
		expect(classifyFailure('holiday-photos-private.pdf exploded')).toBe('other');
		expect(classifyFailure(undefined)).toBe('other');
	});
});

describe('eventRoute', () => {
	it('keeps plain paths and drops anything odd', () => {
		expect(eventRoute('/')).toBe('home');
		expect(eventRoute('/Smash/compress/')).toBe('Smash/compress');
		expect(eventRoute('/Smash/some file.pdf')).toBe('other');
		expect(eventRoute('/' + 'a'.repeat(80))).toBe('other');
	});
});

describe('failureCause', () => {
	const undecodable = (codec: string | null) =>
		Object.assign(new Error('This video uses a codec your browser can’t decode.'), {
			name: 'UndecodableSourceError',
			codec,
		});

	it('names the codec that could not be decoded, even when wrapped', () => {
		expect(failureCause(undecodable('prores'))).toBe('decode-prores');
		expect(failureCause(new Error('outer', { cause: undecodable('hevc') }))).toBe('decode-hevc');
		expect(failureCause(undecodable(null))).toBe('decode-unknown');
	});

	it('never passes through a codec string that is not on the list', () => {
		expect(failureCause(undecodable('holiday-video.mov'))).toBe('decode-other');
	});

	it('tells apart the other ways a video can be unsupported', () => {
		expect(failureCause('HEVC codec not supported by your hardware. Try another.')).toBe(
			'encode-hevc'
		);
		expect(failureCause('WebM/VP9 encoding is not supported in this browser.')).toBe('encode-vp9');
		expect(failureCause('WebCodecs not supported')).toBe('no-webcodecs');
		expect(failureCause('WebCodecs encoding failed: unsupported or unrecognizable format')).toBe(
			'unreadable-file'
		);
		expect(failureCause('clip.avi is an AVI file, which browsers can’t decode.')).toBe('avi');
	});

	it('narrows too-large failures', () => {
		expect(failureCause('Coded width exceeds the maximum for this level')).toBe('resolution');
		expect(failureCause('ArrayBuffer is too large: buffer limit')).toBe('buffer');
	});

	it('returns nothing rather than guessing', () => {
		expect(failureCause('my-secret-file.pdf exploded')).toBeUndefined();
		expect(failureCause(undefined)).toBeUndefined();
	});
});
