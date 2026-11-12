# Architecture: current state

A factual snapshot, not a design. Written 2026-11-12 at commit `c083ad8`. Reasons for decisions live
in [decisions/](decisions/README.md). If this file disagrees with the code, the code is right: fix
this file.

## The parts

| Part              | What it is                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `apps/squish`     | Image compression and conversion (also HEIC). Worker: `compress.worker.ts`.                   |
| `apps/smash`      | PDF tools, 16 tool routes plus a workspace. Worker: Ghostscript (WASM). Has a service worker. |
| `apps/squash`     | Video compression and audio extraction via mediabunny and WebCodecs. Has a service worker.    |
| `apps/swirl`      | GIF tools (gifsicle, gifski WASM; video to GIF).                                              |
| `packages/config` | `createViteConfig()` (Vite + SvelteKit + Tailwind + COOP/COEP) and the shared Tailwind base.  |
| `packages/ui`     | Shared Svelte components (Toast, DropZone, Footer, AppHeader, …) shipped as source.           |
| `packages/utils`  | Shared helpers: format, download (fflate ZIP), worker pool, SEO, analytics, app registry.     |
| `tests/`          | Vitest unit tests; Playwright smoke and e2e (including axe accessibility).                    |

Every app is a standalone SvelteKit static site. All processing happens in the browser; there is no
backend. Page views are counted with GoatCounter only (ADR-0003).

## How they connect

- **Build:** pnpm workspace. Turborepo runs `build`, `check`, `lint` and tests across apps in
  dependency order. One `pnpm-lock.yaml`. Packages are consumed as source, not pre-built.
- **Config:** each app's `vite.config.ts` calls `createViteConfig({ basePath, … })`. There is no
  `svelte.config.js` (SvelteKit 3). Imports use `#lib/...`.
- **Cross-origin isolation:** smash, squash and swirl set `crossOriginIsolation: true` (COOP/COEP on
  dev server and preview) for SharedArrayBuffer and WASM threads. GitHub Pages cannot set headers,
  so how production gets these headers has not been re-verified for this document; check before
  relying on threaded WASM in production.
- **Heavy work:** runs in Web Workers through Comlink; WASM packages are listed in
  `optimizeDepsExclude` so Vite does not pre-bundle them.
- **Deploy:** push to `main` runs tests and e2e, detects changed paths, then builds and deploys each
  changed app to its own GitHub repo's `gh-pages` branch. Pull requests run `ci.yml` (tests and e2e).
  Node comes from `.nvmrc`; pnpm from `packageManager`.
- **Cross-app links:** the list of apps and URLs lives in `packages/utils/src/apps.ts`; do not
  hard-code another app's URL.

## What is duplicated

- **Smash single-PDF card:** now `SelectedPdfSummary.svelte`, used by 7 tool pages. `split` and
  `unlock` still have their own variants (extra lines in the card).
- **DropZone:** `packages/ui` has one, and each app also has its own `DropZone.svelte`. Behaviour was
  fixed in the shared and Squish copies for accessibility; the others may have drifted. Not checked.
- **Stale-deploy script (ADR-0008):** inline in all four `app.html` files.
- **`BatchSummary`, `Header`, `KeyboardShortcuts`:** several apps each carry their own version.
- **SEO titles and descriptions:** per-route, per app, kept by hand; locale strings live in
  `packages/utils/src/seo.ts`.

## What is fragile

- **Stale HTML after a deploy.** Mitigated by the reload script, which only fires on script-load
  failures (ADR-0008).
- **Service workers** (smash, squash) live in `src/service-worker/index.ts` with their own tsconfig
  and were broken by the Kit 3 migration (precache and registration, `b2d4cdd`). Re-test them on
  framework upgrades.
- **WASM dependencies:** `ghostscript-wasm-esm`, `gifsicle-wasm-browser`, `gifski-wasm`, `icodec`,
  `heic-to`, `@neslinesli93/qpdf-wasm`, `tesseract.js`. Each loads in a worker through `new URL(...)`
  and can break on bundler upgrades without a type error. Smoke tests are the safety net.
- **Browser codec support** differs by browser: Squash H.264 needs a real Chrome, headless Chromium
  lacks it. Features must be feature-detected (ADR-0006).
- **Supply chain:** pnpm rejects packages under 24 hours old and unreviewed install scripts
  (ADR-0005). A fresh release in the lockfile fails installs until it ages.
- **Version pins:** TypeScript is held at 6.x because Kit 3, svelte-check and typescript-eslint do
  not yet allow 7. Check before bumping.
- **Dead code:** `pnpm knip` (files, dependencies, unlisted) runs in CI and is currently clean. Unused
  exports are not gated.
- **Accessibility:** structural axe violations must be 0 (gated). Colour contrast is clean on every
  home page in both themes and ratcheted to 0 on Squish. Remaining failures are on tool pages, all one
  pattern: white text on a bright accent fill (`bg-accent-start text-white`, e.g. Smash compress,
  Swirl video-to-gif) and `opacity-70` captions. The fix used so far is black text on the accent
  fill and `.text-accent-readable` for accent-coloured text on the light theme.
- **Landing pages:** Squish `/heic` is config-driven (`lib/landing-pages.ts`) on top of the shared
  `SquishApp` component (ADR-0002). Squash does the same with `size-targets.ts`.

## Checks that already guard this

Type check (`pnpm check`), ESLint and Prettier, Vitest unit tests, Playwright smoke tests (hydration,
drop zones, stale reload, `lang`), and an axe gate. Also `pnpm knip` for unused files and dependencies. Not guarded: bundle size, circular imports.
