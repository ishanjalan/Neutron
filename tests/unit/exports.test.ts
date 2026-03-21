/**
 * Package export smoke tests
 * Verifies that package index files load without error and export expected shapes.
 * `pnpm check` catches TypeScript errors; these tests catch runtime export shape issues.
 */

import { describe, it, expect } from 'vitest';
import * as neutronUtils from '@neutron/utils';

describe('@neutron/utils exports', () => {
	it('exports formatBytes', () => expect(neutronUtils.formatBytes).toBeTypeOf('function'));
	it('exports formatPercent', () => expect(neutronUtils.formatPercent).toBeTypeOf('function'));
	it('exports formatDuration', () => expect(neutronUtils.formatDuration).toBeTypeOf('function'));
	it('exports getOutputFilename', () =>
		expect(neutronUtils.getOutputFilename).toBeTypeOf('function'));
	it('exports downloadBlob', () => expect(neutronUtils.downloadBlob).toBeTypeOf('function'));
	it('exports downloadAllAsZip', () =>
		expect(neutronUtils.downloadAllAsZip).toBeTypeOf('function'));
	it('exports isFileSystemAccessSupported', () =>
		expect(neutronUtils.isFileSystemAccessSupported).toBeTypeOf('function'));
	it('exports isClipboardWriteSupported', () =>
		expect(neutronUtils.isClipboardWriteSupported).toBeTypeOf('function'));
	it('exports createTrackedUrl', () =>
		expect(neutronUtils.createTrackedUrl).toBeTypeOf('function'));
	it('exports revokeTrackedUrl', () =>
		expect(neutronUtils.revokeTrackedUrl).toBeTypeOf('function'));
	it('exports revokeAll', () => expect(neutronUtils.revokeAll).toBeTypeOf('function'));
	it('exports validate', () => expect(neutronUtils.validate).toBeTypeOf('function'));
	it('exports validateOrThrow', () => expect(neutronUtils.validateOrThrow).toBeTypeOf('function'));
	it('exports getValidationErrors', () =>
		expect(neutronUtils.getValidationErrors).toBeTypeOf('function'));
	it('exports NEUTRON_APPS', () => expect(neutronUtils.NEUTRON_APPS).toBeTypeOf('object'));
	it('has no undefined exports', () => {
		for (const [key, value] of Object.entries(neutronUtils)) {
			expect(value, `${key} is undefined`).not.toBeUndefined();
		}
	});
});

// @neutron/ui exports Svelte components which require the Svelte compiler to import.
// Those are covered by `pnpm check`. The motion utility (pure TS) is tested here.
describe('@neutron/ui/motion exports', () => {
	it('exports animation functions', async () => {
		const motion = await import('@neutron/ui/motion');
		expect(motion.prefersReducedMotion).toBeTypeOf('function');
		expect(motion.safeAnimate).toBeTypeOf('function');
		expect(motion.fadeIn).toBeTypeOf('function');
		expect(motion.fadeOut).toBeTypeOf('function');
		expect(motion.slideUp).toBeTypeOf('function');
		expect(motion.staggerChildren).toBeTypeOf('function');
		expect(motion.animateProgress).toBeTypeOf('function');
		expect(motion.animateCounter).toBeTypeOf('function');
	});
});
