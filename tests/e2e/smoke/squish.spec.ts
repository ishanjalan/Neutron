import { test, expect } from '@playwright/test';
import { fixture } from './fixtures';

test('adding an image compresses it and offers a download', async ({ page }) => {
	await page.goto('./');
	await page.waitForLoadState('networkidle'); // let the app hydrate before handing it files
	await page.locator('input[type="file"]').first().setInputFiles(fixture('sample.jpg'));
	await expect(page.getByText('sample.jpg').first()).toBeVisible();
	await expect(page.getByRole('heading', { name: /image optimized/ })).toBeVisible();
	await expect(page.getByRole('button', { name: /Download ZIP/ })).toBeVisible();
});
