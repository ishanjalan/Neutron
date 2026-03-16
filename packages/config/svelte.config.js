import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * Create a standard SvelteKit static adapter config for Neutron apps.
 *
 * @param {string} productionBasePath - Base path used in production, e.g. '/Squish'
 * @returns {import('@sveltejs/kit').Config}
 */
export function createSvelteConfig(productionBasePath) {
	return {
		preprocess: vitePreprocess(),
		kit: {
			adapter: adapter({
				pages: 'build',
				assets: 'build',
				fallback: 'index.html',
				precompress: false,
				strict: true,
			}),
			paths: {
				base: process.env.NODE_ENV === 'production' ? productionBasePath : '',
			},
		},
	};
}
