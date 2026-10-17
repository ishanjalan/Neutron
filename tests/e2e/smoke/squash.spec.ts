import { test, expect, type Page } from '@playwright/test';
import { fixture } from './fixtures';

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
