import { test, expect } from '@playwright/test';
import {
	fixture,
	serveStaleHtml,
	expectHydrated,
	expectAccessible,
	expectDropZoneOpensPicker,
} from './fixtures';

test('adding an image compresses it and offers a download', async ({ page }) => {
	await page.goto('./');
	await page.waitForLoadState('networkidle'); // let the app hydrate before handing it files
	await page.locator('input[type="file"]').first().setInputFiles(fixture('sample.jpg'));
	await expect(page.getByText('sample.jpg').first()).toBeVisible();
	await expect(page.getByRole('heading', { name: /image optimized/ })).toBeVisible();
	await expect(page.getByRole('button', { name: /Download ZIP/ })).toBeVisible();
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

test('home page is accessible and its drop zone opens the file picker', async ({ page }) => {
	await page.goto('./');
	await expectDropZoneOpensPicker(page);
	// The folder picker sits inside the drop area but is its own button
	const [folderChooser] = await Promise.all([
		page.waitForEvent('filechooser'),
		page.getByRole('button', { name: /select a folder/i }).click(),
	]);
	expect(folderChooser).toBeTruthy();
	await expectAccessible(page, 4);
});

test('a HEIC photo converts even when the browser cannot decode HEIC natively', async ({
	page,
}) => {
	// Stand in for Windows/Linux and Chromium builds without a system HEIC decoder
	// (Playwright's Chromium on macOS may have one, which would hide the fallback).
	await page.addInitScript(() => {
		const native = window.createImageBitmap.bind(window);
		window.createImageBitmap = ((source: ImageBitmapSource, ...rest: unknown[]) =>
			source instanceof File && /\.hei[cf]$/i.test(source.name)
				? Promise.reject(new DOMException('HEIC is not supported', 'InvalidStateError'))
				: (native as (...args: unknown[]) => Promise<ImageBitmap>)(
						source,
						...rest
					)) as typeof createImageBitmap;
	});
	await page.goto('./');
	await page.waitForLoadState('networkidle');
	await page.locator('input[type="file"]').first().setInputFiles(fixture('sample.heic'));
	await expect(page.getByText('sample.heic').first()).toBeVisible();
	await expect(page.getByRole('heading', { name: /image optimized/ })).toBeVisible({
		timeout: 60_000,
	});
	await expect(page.getByRole('button', { name: /Download ZIP/ })).toBeVisible();
});
