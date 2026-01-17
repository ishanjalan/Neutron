import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		// Use jsdom for DOM testing
		environment: 'jsdom',
		// Include only unit test files (exclude e2e)
		include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
		// Global test utilities
		globals: true,
		// Setup files
		setupFiles: ['./vitest.setup.ts'],
		// Coverage configuration
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'**/build/**',
				'**/*.config.*',
				'**/.*',
				'tests/e2e/**'
			]
		}
	},
	resolve: {
		alias: {
			'@neutron/utils': resolve(__dirname, 'packages/utils/src'),
			'@neutron/utils/validation': resolve(__dirname, 'packages/utils/src/validation.ts'),
			'@neutron/utils/comlink': resolve(__dirname, 'packages/utils/src/comlink.ts'),
			'@neutron/ui': resolve(__dirname, 'packages/ui/src'),
			'@neutron/ui/motion': resolve(__dirname, 'packages/ui/src/utils/motion.ts')
		}
	}
});
