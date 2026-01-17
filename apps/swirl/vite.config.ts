import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		headers: {
			// Required for SharedArrayBuffer support (WebCodecs)
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp'
		}
	},
	preview: {
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp'
		}
	},
	worker: {
		format: 'es'
	},
	build: {
		target: 'esnext'
	},
	optimizeDeps: {
		// Required for gifski-wasm to work properly with Vite
		exclude: ['gifski-wasm']
	}
});
