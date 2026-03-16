import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, type Plugin, type UserConfig } from 'vite';

const COOP_COEP_HEADERS = {
	'Cross-Origin-Opener-Policy': 'same-origin',
	'Cross-Origin-Embedder-Policy': 'require-corp',
} as const;

export interface ViteConfigOptions {
	/**
	 * Add COOP/COEP headers required for SharedArrayBuffer (WebCodecs, WASM threads).
	 * Use for apps that need cross-origin isolation: smash, squash, swirl.
	 */
	crossOriginIsolation?: boolean;
	/**
	 * Packages to exclude from Vite's dependency pre-bundling (e.g. WASM packages).
	 */
	optimizeDepsExclude?: string[];
	/**
	 * Enable the extended worker config with tailwindcss plugin and proper WASM chunking.
	 * Use for apps that process files in workers with dynamic imports: squish, heic.
	 */
	wasmWorkers?: boolean;
	/**
	 * Additional Vite plugins to merge in.
	 */
	plugins?: Plugin[];
}

/**
 * Create a standard Vite config for Neutron SvelteKit apps.
 */
export function createViteConfig(opts: ViteConfigOptions = {}) {
	const {
		crossOriginIsolation = false,
		optimizeDepsExclude = [],
		wasmWorkers = false,
		plugins = [],
	} = opts;

	const config: UserConfig = {
		plugins: [
			tailwindcss(),
			sveltekit(),
			...(process.env.ANALYZE === 'true'
				? [visualizer({ open: false, filename: 'stats.html' })]
				: []),
			...plugins,
		],
		build: {
			target: 'esnext',
		},
		worker: wasmWorkers
			? {
					format: 'es' as const,
					plugins: () => [tailwindcss()],
					rollupOptions: {
						output: {
							format: 'es' as const,
							inlineDynamicImports: false,
						},
					},
				}
			: {
					format: 'es' as const,
				},
	};

	if (optimizeDepsExclude.length > 0) {
		config.optimizeDeps = { exclude: optimizeDepsExclude };
	}

	if (crossOriginIsolation) {
		config.server = { headers: COOP_COEP_HEADERS };
		config.preview = { headers: COOP_COEP_HEADERS };
	}

	return defineConfig(config);
}
