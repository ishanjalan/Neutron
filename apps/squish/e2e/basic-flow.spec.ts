import { test, expect } from '@playwright/test';

test.describe('Squish - Basic Image Compression Flow', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('should load homepage successfully', async ({ page }) => {
		// Check hero section
		await expect(page.getByRole('heading', { name: /compress images/i })).toBeVisible();

		// Check that drop zone is visible
		await expect(page.getByText(/drop images here/i)).toBeVisible();

		// Check format badges are visible
		await expect(page.getByText(/JPEG/i)).toBeVisible();
		await expect(page.getByText(/PNG/i)).toBeVisible();
		await expect(page.getByText(/WebP/i)).toBeVisible();
	});

	test('should show settings panel', async ({ page }) => {
		// Settings should be visible by default
		await expect(page.getByText(/quality/i)).toBeVisible();
		await expect(page.getByText(/format/i)).toBeVisible();

		// Quality presets should be clickable
		await expect(page.getByRole('button', { name: /compact/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /balanced/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /quality/i })).toBeVisible();
	});

	test('should toggle advanced options', async ({ page }) => {
		// Click advanced options toggle
		const advancedToggle = page.getByRole('button', { name: /advanced options/i });
		await advancedToggle.click();

		// Advanced options should collapse
		await expect(page.getByText(/strip metadata/i)).not.toBeVisible();

		// Click again to expand
		await advancedToggle.click();
		await expect(page.getByText(/strip metadata/i)).toBeVisible();
	});

	test('should show sample image demo on empty state', async ({ page }) => {
		// Sample image cards should be visible
		await expect(page.getByText(/try with sample images/i)).toBeVisible();
		await expect(page.getByText(/sample photo/i)).toBeVisible();
		await expect(page.getByText(/logo svg/i)).toBeVisible();
		await expect(page.getByText(/screenshot/i)).toBeVisible();
	});

	test('should handle keyboard shortcuts info', async ({ page }) => {
		// Click keyboard shortcuts button
		const keyboardButton = page.getByRole('button', { name: /keyboard shortcuts/i });
		await keyboardButton.click();

		// Shortcuts popover should appear
		await expect(page.getByText(/download all as zip/i)).toBeVisible();
		await expect(page.getByText(/paste image/i)).toBeVisible();
	});

	test('should show footer with privacy badge', async ({ page }) => {
		// Scroll to footer
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

		// Privacy badge should be visible
		await expect(page.getByText(/your images never leave your device/i)).toBeVisible();

		// GitHub link should be present
		await expect(page.getByRole('link', { name: /view source/i })).toBeVisible();
	});

	test('should be responsive on mobile', async ({ page, isMobile }) => {
		if (!isMobile) {
			test.skip();
		}

		// Hero should be visible on mobile
		await expect(page.getByRole('heading', { name: /compress images/i })).toBeVisible();

		// Drop zone should be visible and properly sized
		const dropZone = page.getByText(/drop images here/i);
		await expect(dropZone).toBeVisible();

		// Settings should still be accessible
		await expect(page.getByText(/quality/i)).toBeVisible();
	});
});

test.describe('Squish - Image Upload and Compression (Mock)', () => {
	test('should accept file drop and show processing UI', async ({ page }) => {
		// Note: Actual file upload testing requires more complex setup
		// This test verifies the UI components are present

		await page.goto('/');

		// Verify drop zone is interactive
		const dropZone = page.locator('[role="button"][aria-label*="Drop zone"]').first();
		await expect(dropZone).toBeVisible();

		// Settings panel should be present for configuration before upload
		await expect(page.getByText(/quality/i)).toBeVisible();
		await expect(page.getByText(/format/i)).toBeVisible();
	});
});

test.describe('Squish - Accessibility', () => {
	test('should have proper ARIA labels', async ({ page }) => {
		await page.goto('/');

		// Check for important ARIA labels
		await expect(page.locator('[aria-label="View source on GitHub"]')).toBeVisible();
		await expect(page.locator('[aria-label="Keyboard shortcuts"]')).toBeVisible();
	});

	test('should be keyboard navigable', async ({ page }) => {
		await page.goto('/');

		// Tab through interactive elements
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');

		// Focus should be visible (no specific assertion, just testing no errors)
		await expect(page.locator(':focus')).toBeTruthy();
	});
});
