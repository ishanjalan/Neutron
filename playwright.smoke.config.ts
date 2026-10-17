import { defineConfig, devices } from '@playwright/test';

/**
 * Golden-path smoke tests, one spec per app. Chromium only (Squash needs WebCodecs).
 * Run: `pnpm test:smoke`. Fixtures live in tests/fixtures (committed; CI needs no ffmpeg).
 */
const allPorts = { squish: 5176, smash: 5174, squash: 5175, swirl: 5177 } as const;
// SMOKE_APPS=squash,swirl limits which apps are built/served/tested.
const only = process.env.SMOKE_APPS?.split(',');
const ports = Object.fromEntries(
	Object.entries(allPorts).filter(([app]) => !only || only.includes(app))
) as Record<string, number>;

// Trailing slash matters: specs navigate with relative paths (page.goto('to-images')).
const baseURL = (app: string, port: number) =>
	`http://localhost:${port}/${app[0].toUpperCase()}${app.slice(1)}/`;

export default defineConfig({
	testDir: './tests/e2e/smoke',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 2 : undefined,
	timeout: 90_000,
	expect: { timeout: 30_000 },
	reporter: process.env.CI ? [['list'], ['github']] : [['list']],
	use: { trace: 'on-first-retry', screenshot: 'only-on-failure' },
	projects: Object.entries(ports).map(([app, port]) => ({
		name: app,
		testMatch: `${app}.spec.ts`,
		use: { ...devices['Desktop Chrome'], baseURL: baseURL(app, port) },
	})),
	webServer: Object.entries(ports).map(([app, port]) => ({
		// Test the production build under its real base path (what GitHub Pages serves).
		// `vite dev` is not used: its SSR can't resolve the workspace packages' extensionless TS imports.
		command: `pnpm --filter ${app} exec sh -c "vite build && vite preview --port ${port} --strictPort"`,
		url: baseURL(app, port),
		reuseExistingServer: !process.env.CI,
		timeout: 300_000,
	})),
});
