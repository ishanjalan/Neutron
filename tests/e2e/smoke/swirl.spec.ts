import { test, expect } from '@playwright/test';
import { fixture, serveStaleHtml, expectHydrated } from './fixtures';

test('optimize a GIF end to end', async ({ page }) => {
	await page.goto('optimize');
	await page.waitForLoadState('networkidle'); // let the app hydrate before handing it files
	await page.locator('input[type="file"]').first().setInputFiles(fixture('sample.gif'));
	await page.getByRole('button', { name: /^Optimize 1 GIF/ }).click();
	await expect(page.getByRole('button', { name: /^Optimize 1 GIF/ })).toBeEnabled();
	await expect(page.getByTitle('Download').first()).toBeVisible();
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
