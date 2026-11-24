import { test, expect, type Page } from '@playwright/test';
import {
	fixture,
	serveStaleHtml,
	expectHydrated,
	expectAccessible,
	expectDropZoneOpensPicker,
} from './fixtures';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('squash-onboarding-seen', 'true'));
});

// Headless Chromium ships no H.264 encoder, so encode to WebM (VP9).
const useWebm = (page: Page) => page.getByRole('button', { name: 'WebM', exact: true }).click();

test('compress with a target size reports it fit', async ({ page }) => {
	await page.goto('compress-video-for-discord');
	await page.waitForLoadState('networkidle'); // let the app hydrate before handing it files
	await page.locator('input[type="file"]').first().setInputFiles(fixture('sample.mp4'));
	await expect(page.getByText('sample.mp4').first()).toBeVisible();
	await useWebm(page);
	await page
		.getByRole('button', { name: /^compress/i })
		.first()
		.click();
	await expect(page.getByText(/✓ Under/)).toBeVisible();
	await expect(page.getByRole('button', { name: /download/i }).first()).toBeVisible();
});

test('cancel mid-encode returns the video to pending', async ({ page }) => {
	await page.goto('./');
	await page.waitForLoadState('networkidle'); // let the app hydrate before handing it files
	await page.locator('input[type="file"]').first().setInputFiles(fixture('long.mp4'));
	await useWebm(page);
	await page
		.getByRole('button', { name: /^compress/i })
		.first()
		.click();
	await page.getByRole('button', { name: /^Cancel compression of/ }).click();
	await expect(page.getByRole('button', { name: /^Cancel compression of/ })).toHaveCount(0);
	await expect(page.getByText(/✓ Under/)).toHaveCount(0);
	await expect(page.getByRole('button', { name: /^compress/i }).first()).toBeVisible();
});

test('dropping an .avi shows the rejection toast and adds no card', async ({ page }) => {
	await page.goto('./');
	await page.waitForLoadState('networkidle'); // let the app hydrate before handing it files
	await page.locator('input[type="file"]').first().setInputFiles(fixture('sample.avi'));
	await expect(page.getByText(/AVI file, which browsers can’t decode/)).toBeVisible();
	// No card was added: the empty-state hero is still showing.
	await expect(page.getByRole('heading', { name: /Compress videos/ })).toBeVisible();
});

test('recovers with one reload when the page was cached from before a deploy', async ({ page }) => {
	const stale = await serveStaleHtml(page, 1);
	await page.goto('./');
	await expect.poll(() => stale.navigations(), { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
	await expectHydrated(page);
	// The recovery came from our reload guard, not from anything incidental
	const guard = await page.evaluate(() => sessionStorage.getItem('neutron-stale-reload'));
	expect(guard).not.toBeNull();
});

test('does not reload in a loop when the page stays stale', async ({ page }) => {
	const stale = await serveStaleHtml(page, Infinity);
	await page.goto('./');
	await page.waitForTimeout(4000); // long enough for a loop to show itself
	expect(stale.navigations()).toBe(2); // the stale load plus exactly one reload
});

test.describe('with a French browser', () => {
	test.use({ locale: 'fr-FR' });

	test('keeps <html lang="en"> because the interface is English', async ({ page }) => {
		await page.goto('./');
		await page.waitForLoadState('networkidle');
		await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	});
});

test('home page is accessible and its drop zone opens the file picker', async ({ page }) => {
	// Skip the first-visit welcome modal, which would sit on top of the drop zone
	await page.addInitScript(() => localStorage.setItem('squash-onboarding-seen', 'true'));
	await page.goto('./');
	await expectDropZoneOpensPicker(page);
	await expectAccessible(page, 3);

	// Once a video is added the drop zone becomes the compact one — it must still work
	await page.locator('input[type="file"]').first().setInputFiles(fixture('sample.mp4'));
	await expect(page.getByText('sample.mp4').first()).toBeVisible();
	await expectDropZoneOpensPicker(page);
});

test('audio and size-target pages are accessible', async ({ page }) => {
	await page.goto('video-to-mp3');
	await expectAccessible(page, 2);
	await page.goto('compress-video-for-discord');
	await expectAccessible(page, 3);
});

test('a ProRes file gets a plain-language error instead of an encoder message', async ({
	page,
}) => {
	// No browser's WebCodecs decodes ProRes, so mediabunny used to refuse with "discarded tracks".
	await page.addInitScript(() => {
		localStorage.setItem('squash-onboarding-seen', 'true');
		// WebM, because Playwright's Chromium has no H.264 encoder and would fail on that first
		localStorage.setItem(
			'squash-settings-v2',
			JSON.stringify({
				quality: 'web',
				outputFormat: 'webm',
				resolution: 'original',
				maxFrameRate: 0,
				audioBitrate: '128k',
				audioCodec: 'aac',
				stripMetadata: false,
			})
		);
	});
	await page.goto('./');
	await page.locator('input[type="file"]').first().setInputFiles(fixture('sample-prores.mov'));
	await expect(page.getByText('sample-prores.mov').first()).toBeVisible();
	await page
		.getByRole('button', { name: /^\s*Compress/ })
		.first()
		.click();
	await expect(page.getByText(/ProRes.*can’t decode/)).toBeVisible({ timeout: 30_000 });
	await expect(page.getByText(/discarded|isValid/)).toHaveCount(0);
	// Retrying a file the browser can't decode would fail the same way
	await expect(page.getByRole('button', { name: /Retry/ })).toHaveCount(0);
});

test('quality is one slider with plain-language levels, and the target size takes over', async ({
	page,
}) => {
	await page.addInitScript(() => localStorage.setItem('squash-onboarding-seen', 'true'));
	await page.goto('./');
	await page.locator('input[type="file"]').first().setInputFiles(fixture('sample.mp4'));
	const slider = page.getByRole('slider', { name: 'Quality' });
	await expect(slider).toBeVisible();

	await slider.fill('2');
	await expect(page.getByText('Balanced', { exact: true }).first()).toBeVisible();
	await slider.fill('0');
	await expect(page.getByText('Smallest file, visible softness')).toBeVisible();

	// Resolution sits next to it, not behind Advanced
	await expect(page.getByLabel('Resolution')).toBeVisible();

	// Choosing a target size hands control to it
	await page
		.getByRole('button', { name: /Select/ })
		.first()
		.click();
	await page.getByRole('button', { name: /Discord/ }).click();
	await expect(slider).toBeDisabled();
	await expect(page.getByText('Using the target size')).toBeVisible();
});
