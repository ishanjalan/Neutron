import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		// Use jsdom for DOM testing
		environment: 'jsdom',
		// Include unit test files in both tests/ and app source directories
		include: ['tests/unit/**/*.{test,spec}.{js,ts}', 'apps/*/src/**/*.{test,spec}.{ts}'],
		// Global test utilities
		globals: true,
		// Setup files
		setupFiles: ['./vitest.setup.ts'],
		// Coverage configuration
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules/', '**/build/**', '**/*.config.*', '**/.*', 'tests/e2e/**'],
		},
	},
	resolve: {
		// Use an array so that more-specific subpath aliases are matched before
		// their package-root prefix (e.g. @neutron/ui/motion before @neutron/ui).
		alias: [
			{
				find: '@neutron/utils/validation',
				replacement: resolve(__dirname, 'packages/utils/src/validation.ts'),
			},
			{
				find: '@neutron/utils/comlink',
				replacement: resolve(__dirname, 'packages/utils/src/comlink.ts'),
			},
			{
				find: '@neutron/utils/focus-trap',
				replacement: resolve(__dirname, 'packages/utils/src/focus-trap.ts'),
			},
			{
				find: '@neutron/utils/download',
				replacement: resolve(__dirname, 'packages/utils/src/download.ts'),
			},
			{
				find: '@neutron/utils/worker-pool',
				replacement: resolve(__dirname, 'packages/utils/src/worker-pool.ts'),
			},
			{ find: '@neutron/utils', replacement: resolve(__dirname, 'packages/utils/src') },
			{
				find: '@neutron/ui/motion',
				replacement: resolve(__dirname, 'packages/ui/src/utils/motion.ts'),
			},
			{ find: '@neutron/ui', replacement: resolve(__dirname, 'packages/ui/src') },
		],
	},
});
