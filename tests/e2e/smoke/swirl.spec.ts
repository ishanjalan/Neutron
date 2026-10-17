import { test, expect } from '@playwright/test';
import { fixture } from './fixtures';

test('optimize a GIF end to end', async ({ page }) => {
	await page.goto('optimize');
	await page.waitForLoadState('networkidle'); // let the app hydrate before handing it files
	await page.locator('input[type="file"]').first().setInputFiles(fixture('sample.gif'));
	await page.getByRole('button', { name: /^Optimize 1 GIF/ }).click();
	await expect(page.getByRole('button', { name: /^Optimize 1 GIF/ })).toBeEnabled();
	await expect(page.getByTitle('Download').first()).toBeVisible();
});
