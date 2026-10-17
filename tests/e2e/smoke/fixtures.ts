import { fileURLToPath } from 'node:url';
import { expect, type Page } from '@playwright/test';

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
