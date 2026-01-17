/**
 * E2E tests for Smash homepage
 * Run with: pnpm test:e2e
 */

import { test, expect } from '@playwright/test';

test.describe('Smash Homepage', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('should display the main heading', async ({ page }) => {
		const heading = page.locator('h1');
		await expect(heading).toContainText('PDF toolkit');
	});

	test('should display tool cards', async ({ page }) => {
		// Check that main tool cards are present
		await expect(page.locator('a[href*="/compress"]').first()).toBeVisible();
		await expect(page.locator('a[href*="/merge"]').first()).toBeVisible();
		await expect(page.locator('a[href*="/split"]').first()).toBeVisible();
	});

	test('should navigate to compress page', async ({ page }) => {
		await page.click('a[href*="/compress"]');
		await expect(page).toHaveURL(/\/compress/);
	});

	test('should navigate to merge page', async ({ page }) => {
		await page.click('a[href*="/merge"]');
		await expect(page).toHaveURL(/\/merge/);
	});

	test('should display features section', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Lightning Fast' })).toBeVisible();
		await expect(page.getByRole('heading', { name: '100% Private' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'All-in-One' })).toBeVisible();
	});

	test('should have proper page title', async ({ page }) => {
		await expect(page).toHaveTitle(/Smash/);
	});

	test('should display stats bar', async ({ page }) => {
		await expect(page.getByText('Tools', { exact: true })).toBeVisible();
		await expect(page.getByText('Unlimited')).toBeVisible();
	});
});

test.describe('Compress Tool', () => {
	test('should load compress page', async ({ page }) => {
		await page.goto('/compress');
		// Check that the compress page loads correctly
		await expect(page).toHaveURL(/\/compress/);
		// Check that page has content
		await expect(page.locator('body')).toBeVisible();
	});
});

test.describe('Accessibility', () => {
	test('should have no accessibility violations on homepage', async ({ page }) => {
		await page.goto('/');

		// Check for basic accessibility features
		const main = page.locator('main');
		await expect(main).toBeVisible();

		// All images should have alt text or be decorative
		const images = page.locator('img');
		const imageCount = await images.count();
		for (let i = 0; i < imageCount; i++) {
			const img = images.nth(i);
			const alt = await img.getAttribute('alt');
			const role = await img.getAttribute('role');
			expect(alt !== null || role === 'presentation').toBeTruthy();
		}
	});

	test('should be keyboard navigable', async ({ page }) => {
		await page.goto('/');

		// Tab through main navigation
		await page.keyboard.press('Tab');
		const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
		expect(firstFocused).toBeTruthy();
	});
});

test.describe('Responsive Design', () => {
	test('should work on mobile viewport', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');

		const heading = page.locator('h1');
		await expect(heading).toBeVisible();

		// Tool cards should still be visible
		const toolCards = page.locator('a[href*="/compress"]');
		await expect(toolCards.first()).toBeVisible();
	});

	test('should work on tablet viewport', async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.goto('/');

		const heading = page.locator('h1');
		await expect(heading).toBeVisible();
	});
});
