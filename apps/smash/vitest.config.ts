import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
	// Pass configFile: false so the plugin doesn't try to load svelte.config.js
	// (which imports @sveltejs/adapter-static not installed in the shared config package).
	// All tests here are pure TypeScript — no .svelte components are rendered.
	plugins: [svelte({ configFile: false })],
	test: {
		globals: true,
		environment: 'happy-dom',
		setupFiles: ['./src/tests/setup.ts'],
		include: ['src/**/*.{test,spec}.{js,ts}'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules/', 'src/tests/', '**/*.d.ts', '**/*.config.*', '**/.svelte-kit'],
		},
		slowTestThreshold: 5000,
	},
	resolve: {
		alias: {
			$lib: resolve(__dirname, './src/lib'),
			$app: resolve(__dirname, './node_modules/@sveltejs/kit/src/runtime/app'),
		},
	},
});
