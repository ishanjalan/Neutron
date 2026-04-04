# Neutron — Privacy-First File Tools

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Built with Svelte](https://img.shields.io/badge/built%20with-Svelte%205-orange.svg)](https://svelte.dev/)

Free, open-source file processing tools that run entirely in your browser. No uploads, no tracking, 100% private.

---

## 🛠️ Tools

| App                       | Description                                                        | Live URL                                                                          |
| ------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| **[Squish](apps/squish)** | Compress JPEG, PNG, WebP, AVIF, JXL, SVG, GIF, HEIC images         | [ishanjalan.github.io/Squish](https://ishanjalan.github.io/Squish/)               |
| **[Smash](apps/smash)**   | Full PDF toolkit — compress, merge, split, OCR, protect, and more  | [ishanjalan.github.io/Smash](https://ishanjalan.github.io/Smash/)                 |
| **[Squash](apps/squash)** | Compress MP4, WebM, MOV videos using WebCodecs in the browser      | [ishanjalan.github.io/Squash](https://ishanjalan.github.io/Squash/)               |
| **[Swirl](apps/swirl)**   | GIF tools — convert, optimize, resize, reverse, add text, and more | [ishanjalan.github.io/Swirl](https://ishanjalan.github.io/Swirl/)                 |

> **HEIC Converter** (`apps/heic`) is deprecated — it now redirects to [Squish's /heic route](https://ishanjalan.github.io/Squish/heic) and is no longer deployed separately.

---

## ✨ What Makes Each Tool Unique

**Squish** — Supports 8+ formats including JPEG XL and HEIC input, per-file quality sliders, before/after preview, lossless toggle, and a batch stats bar. The most full-featured browser image optimizer available.

**Smash** — 17 independent PDF tools in one app, each prerendered to its own URL. Uses Ghostscript WASM for best-in-class compression and qpdf for structural operations. Visual page picker for split/delete/reorder.

**Squash** — Uses the browser's native WebCodecs API and Mediabunny (not FFmpeg) for fast, low-overhead video compression. No WASM binary to download — hardware-accelerated where available.

**Swirl** — 8 GIF tools powered by gifsicle-wasm and gifski-wasm. Includes one-click size targets for Discord, Twitter, Slack, and WhatsApp. Boomerang loop, frame extraction, caption overlays.

---

## ✨ Features

- **100% Private** — All processing happens locally in your browser. Your files never leave your device.
- **No Account Required** — Just open and use. No sign-ups, no tracking.
- **Works Offline** — Install as a PWA and use without internet.
- **Free Forever** — Open source under MIT license.

---

## 🏗️ Tech Stack

### Core Framework

- **[Svelte 5](https://svelte.dev/)** — Latest with Runes reactivity
- **[SvelteKit](https://kit.svelte.dev/)** — Full-stack framework with static adapter
- **[TypeScript](https://www.typescriptlang.org/)** — Type-safe development

### Styling & UI

- **[Tailwind CSS v4](https://tailwindcss.com/)** — Utility-first CSS framework
- **[Motion](https://motion.dev/)** — Smooth animations and micro-interactions

### Build & Tooling

- **[Vite 7](https://vitejs.dev/)** — Next-generation frontend tooling
- **[Turborepo](https://turbo.build/)** — High-performance monorepo build system
- **[pnpm](https://pnpm.io/)** — Fast, disk space efficient package manager

### Testing & Quality

- **[Vitest](https://vitest.dev/)** — Blazing fast unit testing
- **[Playwright](https://playwright.dev/)** — E2E testing across browsers
- **[Valibot](https://valibot.dev/)** — Lightweight runtime validation

### Processing Libraries

- **[Comlink](https://github.com/GoogleChromeLabs/comlink)** — Type-safe Web Worker communication
- **WebAssembly** — Near-native performance for heavy processing

| App    | Processing Libraries                                               |
| ------ | ------------------------------------------------------------------ |
| Squish | icodec (MozJPEG, WebP, AVIF, JXL), heic2any, svgo                  |
| Smash  | Ghostscript WASM (compression), qpdf WASM (structural operations)  |
| Squash | WebCodecs API, Mediabunny                                          |
| Swirl  | gifsicle-wasm (optimize/resize), gifski-wasm (high-quality encode) |

---

## 📦 Project Structure

```
neutron/
├── apps/
│   ├── heic/            # HEIC Converter (deprecated — redirects to squish /heic)
│   ├── squish/          # Image compressor (8+ formats)
│   ├── smash/           # PDF toolkit (17 tools)
│   ├── squash/          # Video compressor
│   └── swirl/           # GIF tools (8 tools)
├── packages/
│   ├── ui/              # Shared UI components (Toast, Modal, Animations)
│   ├── utils/           # Shared utilities (validation, formatting, Comlink)
│   └── config/          # Shared configs (Tailwind, TypeScript)
├── tests/
│   ├── e2e/             # Playwright E2E tests
│   └── unit/            # Vitest unit tests
└── turbo.json           # Turborepo configuration
```

---

## 🛠️ Development

### Prerequisites

- Node.js 20+
- pnpm 9+

### Setup

```bash
# Clone the repository
git clone https://github.com/ishanjalan/Neutron.git
cd Neutron

# Install dependencies
pnpm install

# Start all apps in development mode
pnpm dev

# Or start a specific app
pnpm dev:squish   # http://localhost:5176
pnpm dev:smash    # http://localhost:5174
pnpm dev:squash   # http://localhost:5175
pnpm dev:swirl    # http://localhost:5177
```

### Testing

```bash
# Run unit tests
pnpm test:unit

# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui
```

### Build

```bash
# Build all apps
pnpm build

# Build a specific app
pnpm --filter smash build
pnpm --filter squash build
pnpm --filter squish build
pnpm --filter swirl build
```

---

## 🚀 Deployment

The apps are automatically deployed to GitHub Pages when changes are pushed to the `main` branch.

| App    | Source                        | Live URL                                                            |
| ------ | ----------------------------- | ------------------------------------------------------------------- |
| Squish | [`apps/squish/`](apps/squish) | [ishanjalan.github.io/Squish](https://ishanjalan.github.io/Squish/) |
| Smash  | [`apps/smash/`](apps/smash)   | [ishanjalan.github.io/Smash](https://ishanjalan.github.io/Smash/)   |
| Squash | [`apps/squash/`](apps/squash) | [ishanjalan.github.io/Squash](https://ishanjalan.github.io/Squash/) |
| Swirl  | [`apps/swirl/`](apps/swirl)   | [ishanjalan.github.io/Swirl](https://ishanjalan.github.io/Swirl/)   |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Built with amazing open-source tools:

- **Image Processing**: [icodec](https://github.com/nicholashollandmoore/icodec) (MozJPEG, WebP, AVIF, JXL encoders), [heic2any](https://github.com/alexcorvi/heic2any) (libheif WASM for HEIC input)
- **PDF Processing**: [Ghostscript WASM](https://github.com/nickaknudson/ghostscript-wasm), [qpdf](https://qpdf.sourceforge.io/)
- **GIF Processing**: [gifsicle](https://www.lcdf.org/gifsicle/), [gifski](https://gif.ski/)
- **Icons**: [Lucide](https://lucide.dev/)
- **Animations**: [Motion](https://motion.dev/)

---

Made with ❤️ by [Ishan Jalan](https://github.com/ishanjalan)
