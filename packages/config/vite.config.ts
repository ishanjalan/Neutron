import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, type Plugin, type UserConfig } from 'vite';

const COOP_COEP_HEADERS = {
	'Cross-Origin-Opener-Policy': 'same-origin',
	'Cross-Origin-Embedder-Policy': 'require-corp',
} as const;

function crossOriginIsolationPlugin(): Plugin {
	const middleware = (
		_req: unknown,
		res: { setHeader(name: string, value: string): void },
		next: () => void
	) => {
		for (const [name, value] of Object.entries(COOP_COEP_HEADERS)) res.setHeader(name, value);
		next();
	};
	return {
		name: 'neutron:cross-origin-isolation',
		configureServer: (server) => void server.middlewares.use(middleware),
		configurePreviewServer: (server) => void server.middlewares.use(middleware),
	};
}

export interface ViteConfigOptions {
	/**
	 * Production base path (GitHub Pages repo name), e.g. '/Squish'. Dev uses no base.
	 */
	basePath: `/${string}`;
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
export function createViteConfig(opts: ViteConfigOptions) {
	const {
		basePath,
		crossOriginIsolation = false,
		optimizeDepsExclude = [],
		wasmWorkers = false,
		plugins = [],
	} = opts;

	const config: UserConfig = {
		plugins: [
			tailwindcss(),
			sveltekit({
				preprocess: vitePreprocess(),
				adapter: adapter({
					pages: 'build',
					assets: 'build',
					// Use 404.html (not index.html) so prerendered homepage HTML —
					// including <title>/meta from SSR — is not overwritten by the SPA shell.
					// GitHub Pages serves 404.html for unknown paths, enabling client routing.
					fallback: '404.html',
					precompress: false,
					strict: true,
				}),
				// Apps register their service worker themselves in app.html (to hook update events)
				serviceWorker: { register: false },
				paths: {
					base: process.env.NODE_ENV === 'production' ? basePath : '',
				},
			}),
			...(process.env.ANALYZE === 'true'
				? [visualizer({ open: false, filename: 'stats.html' })]
				: []),
			...plugins,
		],
		// Workspace packages ship TypeScript source; Vite must transform them in SSR
		// instead of externalizing them to Node.
		ssr: {
			noExternal: [/^@neutron\//],
		},
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
		// Vite's `headers` option only covers responses Vite itself serves; SvelteKit's
		// document responses (SSR in dev, prerendered pages in preview) need them too.
		config.plugins!.unshift(crossOriginIsolationPlugin());
	}

	return defineConfig(config);
}
