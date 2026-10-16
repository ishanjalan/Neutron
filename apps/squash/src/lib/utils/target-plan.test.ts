import { describe, it, expect } from 'vitest';
import {
	planForTarget,
	fitDimensions,
	nextBudget,
	nextBudgetUp,
	shortSideFromResolution,
	MIN_VIDEO_BITRATE,
	type PlanInput,
} from './target-plan';

const MB = 1024 * 1024;

function input(overrides: Partial<PlanInput> = {}): PlanInput {
	return {
		width: 1920,
		height: 1080,
		duration: 60,
		targetBytes: 20 * MB,
		codec: 'avc',
		audio: 'encode',
		audioBitrate: 128_000,
		...overrides,
	};
}

describe('fitDimensions', () => {
	it('scales landscape by the short side and keeps aspect', () => {
		expect(fitDimensions(1920, 1080, 720)).toEqual({ width: 1280, height: 720 });
	});

	it('does not letterbox a vertical phone video', () => {
		// 9:16 at "720p" must stay portrait: short side (width) becomes 720
		expect(fitDimensions(1080, 1920, 720)).toEqual({ width: 720, height: 1280 });
	});

	it('never upscales', () => {
		expect(fitDimensions(640, 360, 1080)).toEqual({ width: 640, height: 360 });
	});

	it('always returns even dimensions', () => {
		const { width, height } = fitDimensions(1918, 1078, 541);
		expect(width % 2).toBe(0);
		expect(height % 2).toBe(0);
	});
});

describe('planForTarget', () => {
	it('keeps full resolution when the budget is generous', () => {
		const plan = planForTarget(input({ duration: 30 }));
		expect(plan.height).toBe(1080);
		expect(plan.scaledDown).toBe(false);
		expect(plan.feasibility).toBe('ok');
	});

	it('steps resolution down when the bitrate cannot support it', () => {
		const plan = planForTarget(input({ duration: 600, targetBytes: 20 * MB }));
		expect(plan.height).toBeLessThan(1080);
		expect(plan.scaledDown).toBe(true);
	});

	it('plans a bitrate that fits the size budget', () => {
		const plan = planForTarget(input());
		const bits = (plan.videoBitrate + plan.audioBitrate) * 60;
		expect(bits / 8).toBeLessThanOrEqual(20 * MB);
	});

	it('gives all bits to video when audio is removed', () => {
		const withAudio = planForTarget(input());
		const muted = planForTarget(input({ audio: 'none' }));
		expect(muted.audioBitrate).toBe(0);
		expect(muted.videoBitrate).toBeGreaterThan(withAudio.videoBitrate);
	});

	it('never exceeds the source bitrate', () => {
		const plan = planForTarget(input({ duration: 10, sourceBitrate: 1_000_000 }));
		expect(plan.videoBitrate).toBeLessThanOrEqual(950_000);
	});

	it('honours an explicitly requested resolution', () => {
		const plan = planForTarget(input({ requestedShortSide: 480 }));
		expect(plan.height).toBe(480);
	});

	it('flags an impossible fit as poor and floors the bitrate', () => {
		const plan = planForTarget(input({ duration: 7200, targetBytes: 5 * MB }));
		expect(plan.videoBitrate).toBe(MIN_VIDEO_BITRATE);
		expect(plan.feasibility).toBe('poor');
	});

	it('caps frame rate only for sources faster than 30 fps', () => {
		expect(planForTarget(input({ sourceFps: 60 })).frameRate).toBe(30);
		expect(planForTarget(input({ sourceFps: 30 })).frameRate).toBeUndefined();
		expect(planForTarget(input({ sourceFps: 24 })).frameRate).toBeUndefined();
	});

	it('only drops below the 360p floor when asked to', () => {
		const tight = { width: 640, height: 360, duration: 60, targetBytes: 1 * MB };
		expect(planForTarget(input(tight)).height).toBe(360);
		expect(planForTarget(input({ ...tight, minShortSide: 240 })).height).toBeLessThan(360);
	});

	it('needs fewer bits per pixel with more efficient codecs', () => {
		const avc = planForTarget(input({ duration: 300, codec: 'avc' }));
		const av1 = planForTarget(input({ duration: 300, codec: 'av1' }));
		expect(av1.height).toBeGreaterThanOrEqual(avc.height);
	});
});

describe('nextBudget', () => {
	it('shrinks the budget in proportion to the overshoot, with a cushion', () => {
		const next = nextBudget(20 * MB, 20 * MB, 25 * MB);
		expect(next).toBeLessThan(20 * MB * (20 / 25));
		expect(next).toBeGreaterThan(0);
	});
});

describe('nextBudgetUp', () => {
	it('asks for proportionally more after an undershoot, with a cushion', () => {
		const next = nextBudgetUp(20 * MB, 20 * MB, 5 * MB);
		expect(next).toBeGreaterThan(20 * MB);
		expect(next).toBeLessThan(20 * MB * 4);
	});

	it('caps how aggressively it scales up', () => {
		expect(nextBudgetUp(20 * MB, 20 * MB, 1)).toBe(Math.round(20 * MB * 4 * 0.9));
	});
});

describe('shortSideFromResolution', () => {
	it('parses preset labels', () => {
		expect(shortSideFromResolution('720p')).toBe(720);
		expect(shortSideFromResolution('2160p')).toBe(2160);
		expect(shortSideFromResolution('original')).toBeNull();
	});
});
