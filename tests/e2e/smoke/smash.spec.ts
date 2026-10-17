import { test, expect } from '@playwright/test';
import { fixture } from './fixtures';

test('PDF to images: load, convert, results offered', async ({ page }) => {
	await page.goto('to-images');
	await page.waitForLoadState('networkidle'); // let the app hydrate before handing it files
	await page.locator('input[type="file"]').first().setInputFiles(fixture('sample.pdf'));
	await expect(page.getByText('sample.pdf').first()).toBeVisible();
	await page.getByRole('button', { name: /Convert to Images/ }).click();
	await expect(page.getByText(/1 images? created/)).toBeVisible();
	await expect(page.getByRole('button', { name: /Download All/ })).toBeVisible();
});
