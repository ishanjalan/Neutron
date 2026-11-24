import { describe, it, expect } from 'vitest';
import { QUALITY_LEVELS, levelFor } from './quality-levels';

describe('quality levels', () => {
	it('runs smallest to best, ending in lossless', () => {
		expect(QUALITY_LEVELS.map((l) => l.label)).toEqual(['Small', 'Balanced', 'High', 'Lossless']);
		expect(QUALITY_LEVELS.map((l) => l.quality).slice(0, 3)).toEqual([60, 80, 95]);
		expect(QUALITY_LEVELS.at(-1)?.lossless).toBe(true);
	});

	it('maps saved settings to a level', () => {
		expect(levelFor({ quality: 80, lossless: false }).key).toBe('balanced');
		expect(levelFor({ quality: 60, lossless: false }).key).toBe('small');
		expect(levelFor({ quality: 95, lossless: true }).key).toBe('lossless');
	});

	it('snaps an unusual saved quality to the nearest level', () => {
		expect(levelFor({ quality: 70, lossless: false }).key).toBe('small');
		expect(levelFor({ quality: 71, lossless: false }).key).toBe('balanced');
		expect(levelFor({ quality: 100, lossless: false }).key).toBe('high');
		expect(levelFor({ quality: 10, lossless: false }).key).toBe('small');
	});
});
