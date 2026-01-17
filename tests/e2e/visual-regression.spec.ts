/**
 * Visual Regression Tests
 * 
 * These tests capture screenshots and compare against baselines
 * to catch unintended visual changes.
 * 
 * First run creates baseline screenshots.
 * Subsequent runs compare against baselines.
 * 
 * Run: npx playwright test visual-regression --update-snapshots  (to update baselines)
 * Run: npx playwright test visual-regression                      (to compare)
 */

import { test, expect } from '@playwright/test';

test.describe('Visual Regression - Smash', () => {
	test.beforeEach(async ({ page }) => {
		// Wait for fonts and animations to settle
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(500);
	});

	test('homepage visual appearance', async ({ page }) => {
		await expect(page).toHaveScreenshot('homepage.png', {
			fullPage: true,
			animations: 'disabled',
			threshold: 0.2, // Allow 20% pixel difference for minor variations
		});
	});

	test('homepage mobile appearance', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(500);
		
		await expect(page).toHaveScreenshot('homepage-mobile.png', {
			fullPage: true,
			animations: 'disabled',
			threshold: 0.2,
		});
	});

	test('compress page visual appearance', async ({ page }) => {
		await page.goto('/compress');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(500);
		
		await expect(page).toHaveScreenshot('compress-page.png', {
			fullPage: true,
			animations: 'disabled',
			threshold: 0.2,
		});
	});

	test('merge page visual appearance', async ({ page }) => {
		await page.goto('/merge');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(500);
		
		await expect(page).toHaveScreenshot('merge-page.png', {
			fullPage: true,
			animations: 'disabled',
			threshold: 0.2,
		});
	});
});

test.describe('Visual Regression - Components', () => {
	test('header component', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		
		const header = page.locator('header');
		await expect(header).toHaveScreenshot('header.png', {
			animations: 'disabled',
			threshold: 0.1,
		});
	});

	test('footer component', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		
		const footer = page.locator('footer');
		await expect(footer).toHaveScreenshot('footer.png', {
			animations: 'disabled',
			threshold: 0.1,
		});
	});

	test('tool cards on homepage', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		
		// Capture the first tool card
		const firstCard = page.locator('a[href*="/compress"]').first();
		await expect(firstCard).toHaveScreenshot('tool-card.png', {
			animations: 'disabled',
			threshold: 0.15,
		});
	});
});
