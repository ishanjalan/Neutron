import { test, expect } from '@playwright/test';
import { fixture, serveStaleHtml, expectHydrated } from './fixtures';

test('PDF to images: load, convert, results offered', async ({ page }) => {
	await page.goto('to-images');
	await page.waitForLoadState('networkidle'); // let the app hydrate before handing it files
	await page.locator('input[type="file"]').first().setInputFiles(fixture('sample.pdf'));
	await expect(page.getByText('sample.pdf').first()).toBeVisible();
	await page.getByRole('button', { name: /Convert to Images/ }).click();
	await expect(page.getByText(/1 images? created/)).toBeVisible();
	await expect(page.getByRole('button', { name: /Download All/ })).toBeVisible();
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
