import { fileURLToPath } from 'node:url';
import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const fixture = (name: string) =>
	fileURLToPath(new URL(`../../fixtures/${name}`, import.meta.url));

/**
 * Simulates a visitor whose browser cached the page from *before* a deploy: the first
 * `times` document responses have their entry-script hash swapped for one that no longer
 * exists (so the page can't boot), the way stale HTML does after assets are replaced.
 * Reloads get the real HTML, like a revalidated request would after a deploy.
 */
export async function serveStaleHtml(page: Page, times: number) {
	let served = 0;
	let navigations = 0;
	await page.route('**/*', async (route) => {
		if (route.request().resourceType() !== 'document' || served >= times) return route.continue();
		served++;
		const response = await route.fetch();
		const html = (await response.text()).replace(/(entry\/start\.)[\w-]+(\.js)/g, '$1deadbeef$2');
		return route.fulfill({
			response,
			body: html,
			headers: { ...response.headers(), 'content-length': String(Buffer.byteLength(html)) },
		});
	});
	page.on('framenavigated', (frame) => {
		if (frame === page.mainFrame()) navigations++;
	});
	return { navigations: () => navigations };
}

/** The app actually booted (not just prerendered HTML): the theme toggle works. */
export async function expectHydrated(page: Page) {
	await page.waitForLoadState('networkidle');
	const html = page.locator('html');
	const before = await html.getAttribute('data-theme');
	await page.getByRole('button', { name: /Switch to (light|dark) mode/ }).click();
	await expect(html).not.toHaveAttribute('data-theme', before ?? '');
}

/**
 * Accessibility gate (axe, WCAG 2 A/AA + best practice). Anything structural — nested
 * interactive controls, missing names/labels, heading order, link-only-by-colour — must be
 * zero. Colour contrast is tracked separately: the remaining failures are brand accent
 * colours (white on orange/green/blue, accent text on white), a design decision, so we
 * ratchet the count (`maxContrastNodes`) to stop it growing rather than failing on it.
 */
export async function expectAccessible(page: Page, maxContrastNodes: number) {
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(1500); // let entry transitions finish so colours are settled
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
		.analyze();

	const structural = results.violations
		.filter((v) => v.id !== 'color-contrast')
		.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
	expect(structural, 'structural accessibility violations').toEqual([]);

	const contrast = results.violations.find((v) => v.id === 'color-contrast')?.nodes.length ?? 0;
	expect(contrast, 'colour-contrast failures must not grow').toBeLessThanOrEqual(maxContrastNodes);
}

/** The drop zone is a real button: click, Enter and Space each open the file picker. */
export async function expectDropZoneOpensPicker(page: Page) {
	await page.waitForLoadState('networkidle');
	const zone = page.getByRole('button', { name: /click to browse/i }).first();
	const [byClick] = await Promise.all([page.waitForEvent('filechooser'), zone.click()]);
	expect(byClick).toBeTruthy();
	await zone.focus();
	const [byEnter] = await Promise.all([
		page.waitForEvent('filechooser'),
		page.keyboard.press('Enter'),
	]);
	expect(byEnter).toBeTruthy();
	await zone.focus();
	const [bySpace] = await Promise.all([
		page.waitForEvent('filechooser'),
		page.keyboard.press('Space'),
	]);
	expect(bySpace).toBeTruthy();
}
