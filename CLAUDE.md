# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev servers (each app runs on its own port)
pnpm dev              # all apps
pnpm dev:squish       # :5176
pnpm dev:smash        # :5174
pnpm dev:squash       # :5175
pnpm dev:swirl        # :5177
# Note: heic app is deprecated (redirects to squish /heic). No dev:heic script.

# Build
pnpm build                        # all apps via Turborepo
pnpm --filter smash build         # single app

# Type-check
pnpm check                        # all apps

# Lint / format
pnpm lint
pnpm lint:fix
pnpm format

# Unit tests (Vitest, tests/unit/)
pnpm test:unit
pnpm test:unit -- --reporter=verbose
pnpm test:unit -- format.test.ts  # single file

# E2E tests (Playwright, tests/e2e/)
pnpm test:e2e
pnpm test:e2e:ui                                         # interactive mode
npx playwright test homepage --project=chromium          # single spec + browser
```

## Architecture

### Monorepo layout

```
apps/          heic | squish | smash | squash | swirl
packages/      config | ui | utils
tests/         unit/ | e2e/
```

Each app is a standalone SvelteKit static-site (deployed separately to GitHub Pages). Turborepo orchestrates builds; `pnpm-lock.yaml` is the single lockfile.

### Shared config package (`@neutron/config`)

SvelteKit 3 no longer reads `svelte.config.js`; all apps delegate entirely to one factory function — **do not hand-write vite/svelte config**:

```ts
// apps/*/vite.config.ts
export default createViteConfig({
	basePath: '/RepoName', // production base path (GitHub Pages repo name)
	crossOriginIsolation: true, // smash, squash, swirl — needed for SharedArrayBuffer / WASM threads
	wasmWorkers: true, // squish, heic — enables WASM chunking in workers
	optimizeDepsExclude: ['icodec'], // WASM packages that must not be pre-bundled
});
```

`createViteConfig` wires up Tailwind v4, SvelteKit (adapter-static with `fallback: '404.html'`, `paths.base`, preprocess), and optional bundle analysis (`ANALYZE=true pnpm build`). COOP/COEP headers are applied to both dev server and preview (including SvelteKit's HTML responses, via a small plugin) when `crossOriginIsolation: true`.

SvelteKit 3 conventions used here: `$lib` is gone — import with `#lib/...` (package.json `imports`, include file extensions, `.ts` for TypeScript files); use `$app/state` (not `$app/stores`), `resolve()`/`asset()` from `$app/paths` (no leading slash for pathnames), param matchers in a single `src/params.ts`, and service workers live in `src/service-worker/index.ts` with their own tsconfig (`$app/manifest`, `$app/env`). Requires Node ≥ 22.17 and TypeScript 6.

### Shared UI package (`@neutron/ui`)

Exports: `Toast`/`toast`, `ConfirmModal`, `Tooltip`, `DropZone`, `ErrorPage`, `AnimatedNumber`, `CompareSlider`, `Footer`, `AppHeader`, motion animation helpers, and `createFileStore`.

Import from `@neutron/ui` directly — components are not compiled, just re-exported as source (SvelteKit resolves them at build time via the `svelte` export condition).

### Shared utils package (`@neutron/utils`)

Subpath exports — import the narrowest one needed:

| Import                       | Contents                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `@neutron/utils`             | format, download, focus-trap, blob-url, worker-pool, validation, apps              |
| `@neutron/utils/download`    | `downloadBlob`, `downloadAllAsZip`, `downloadMultipleFiles`, `copyBlobToClipboard` |
| `@neutron/utils/comlink`     | Comlink re-export                                                                  |
| `@neutron/utils/worker-pool` | `createWorkerPool`                                                                 |
| `@neutron/utils/validation`  | Valibot schemas for PDF/video/image/GIF settings                                   |

ZIP generation uses `fflate` (not JSZip) via `downloadAllAsZip`.

### Svelte 5 / stores

Apps use Svelte 5 runes. App-level state lives in `src/lib/stores/*.svelte.ts` (note the `.svelte.ts` extension — required for runes outside `.svelte` files). The shared `createFileStore` from `@neutron/ui` provides a generic base; apps extend it with domain types.

### Web Workers / WASM

Heavy processing runs in workers via Comlink. Pattern:

```ts
// worker file (src/lib/workers/foo.worker.ts)
import { expose } from 'comlink';
expose({ processFile });

// consumer
import { wrap } from 'comlink';
const worker = new Worker(new URL('../workers/foo.worker.ts', import.meta.url), { type: 'module' });
const api = wrap<typeof import('../workers/foo.worker.ts')>(worker);
```

WASM packages (`icodec`, `ghostscript-wasm-esm`, `gifsicle-wasm-browser`, `gifski-wasm`) must be listed in `optimizeDepsExclude` to prevent Vite from bundling them before the worker loads them.

### Tailwind / theming

Every app's `src/app.css`:

```css
@import 'tailwindcss';
@import '@neutron/config/tailwind/base.css'; /* shared surface scale, fonts, utilities */
@theme {
	--color-accent-start: #10b981; /* override accent per app */
	--color-accent-end: #06b6d4;
}
```

The base CSS defines a `surface-50`→`surface-950` scale (light↔dark), accent colors, `.gradient-text`, `.gradient-border`, `.glass`, and automatic light-mode inversion via `@media (prefers-color-scheme: light)`.

### CI / Deployment

`.github/workflows/deploy.yml` detects which apps changed (via `dorny/paths-filter`) and only rebuilds those. Each app deploys to its own GitHub repository's `gh-pages` branch using `peaceiris/actions-gh-pages`. `pnpm install` runs with `--frozen-lockfile` by default in CI — **always commit `pnpm-lock.yaml` together with any `package.json` change**.

### App quick-reference

| App    | Key libs                                                                         | `vite.config` flags                                            |
| ------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| heic   | ⚠️ deprecated — redirects to squish `/heic`. Not deployed in CI.                 |                                                                |
| squish | icodec, heic-to, svgo, @sentry/sveltekit                                        | `wasmWorkers`, `optimizeDepsExclude: ['icodec']`               |
| smash  | ghostscript-wasm-esm, @neslinesli93/qpdf-wasm, pdf-lib, pdfjs-dist, tesseract.js | `crossOriginIsolation`                                         |
| squash | mediabunny, WebCodecs API, idb                                                   | `crossOriginIsolation`                                         |
| swirl  | gifsicle-wasm-browser, gifski-wasm, idb                                          | `crossOriginIsolation`, `optimizeDepsExclude: ['gifski-wasm']` |
