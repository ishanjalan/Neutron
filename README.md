# Neutron

A monorepo containing four free, privacy-focused file processing tools that run entirely in your browser.

## 🚀 Apps

| App                       | Description                                        | Live Demo                                                 |
| ------------------------- | -------------------------------------------------- | --------------------------------------------------------- |
| **[Squish](apps/squish)** | Image compressor with MozJPEG, WebP, AVIF, JPEG XL | [squish.app](https://ishanjalan.github.io/ImageOptimser/) |
| **[Squash](apps/squash)** | Video compressor using WebCodecs API               | [squash.app](https://ishanjalan.github.io/Squash/)        |
| **[Smash](apps/smash)**   | PDF toolkit — compress, merge, split, protect, OCR | [smash.app](https://ishanjalan.github.io/Smash/)          |
| **[Swirl](apps/swirl)**   | GIF toolkit — create, optimize, resize, crop       | [swirl.app](https://ishanjalan.github.io/Swirl/)          |

## ✨ Features

- **100% Private** — All processing happens locally in your browser. Your files never leave your device.
- **No Account Required** — Just open and use. No sign-ups, no tracking.
- **Works Offline** — Install as a PWA and use without internet.
- **Free Forever** — Open source under MIT license.

## 🏗️ Tech Stack

### Core Framework

- **[Svelte 5](https://svelte.dev/)** — Latest with Runes reactivity
- **[SvelteKit](https://kit.svelte.dev/)** — Full-stack framework with static adapter
- **[TypeScript](https://www.typescriptlang.org/)** — Type-safe development

### Styling & UI

- **[Tailwind CSS v4](https://tailwindcss.com/)** — Utility-first CSS framework
- **[Motion](https://motion.dev/)** — Smooth animations and micro-interactions
- **[Lucide Icons](https://lucide.dev/)** — Beautiful open-source icons

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

| App    | Processing Libraries                                           |
| ------ | -------------------------------------------------------------- |
| Squish | icodec (MozJPEG, WebP, AVIF, JXL), heic2any, svgo              |
| Squash | Mediabunny (WebCodecs), Hardware-accelerated encoding          |
| Smash  | Ghostscript WASM, qpdf WASM, pdf-lib, pdfjs-dist, Tesseract.js |
| Swirl  | gifsicle-wasm-browser, gifski-wasm, Mediabunny                 |

## 📦 Project Structure

```
neutron/
├── apps/
│   ├── squish/          # Image compressor
│   ├── squash/          # Video compressor
│   ├── smash/           # PDF toolkit
│   └── swirl/           # GIF toolkit
├── packages/
│   ├── ui/              # Shared UI components (Toast, Modal, Animations)
│   ├── utils/           # Shared utilities (validation, formatting, Comlink)
│   └── config/          # Shared configs (Tailwind, TypeScript)
├── tests/
│   ├── e2e/             # Playwright E2E tests
│   └── unit/            # Vitest unit tests
└── turbo.json           # Turborepo configuration
```

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
pnpm dev:squash   # http://localhost:5175
pnpm dev:smash    # http://localhost:5174
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
pnpm --filter squish build
```

## 🚀 Deployment

The apps are automatically deployed to GitHub Pages when changes are pushed to the `main` branch.

| App    | Source                        | Live URL                                                                          |
| ------ | ----------------------------- | --------------------------------------------------------------------------------- |
| Squish | [`apps/squish/`](apps/squish) | [ishanjalan.github.io/ImageOptimser](https://ishanjalan.github.io/ImageOptimser/) |
| Squash | [`apps/squash/`](apps/squash) | [ishanjalan.github.io/Squash](https://ishanjalan.github.io/Squash/)               |
| Smash  | [`apps/smash/`](apps/smash)   | [ishanjalan.github.io/Smash](https://ishanjalan.github.io/Smash/)                 |
| Swirl  | [`apps/swirl/`](apps/swirl)   | [ishanjalan.github.io/Swirl](https://ishanjalan.github.io/Swirl/)                 |

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Built with amazing open-source tools:

- **Image Processing**: [icodec](https://github.com/nicholashollandmoore/icodec) (MozJPEG, WebP, AVIF, JXL encoders)
- **Video Processing**: [Mediabunny](https://mediabunny.dev) (WebCodecs wrapper)
- **PDF Processing**: [Ghostscript WASM](https://github.com/nicholashollandmoore/ghostscript-wasm), [qpdf WASM](https://github.com/nicholashollandmoore/qpdf-wasm), [pdf-lib](https://pdf-lib.js.org/)
- **GIF Processing**: [gifsicle](https://github.com/nicholashollandmoore/gifsicle-wasm), [gifski](https://github.com/nicholashollandmoore/gifski-wasm)
- **OCR**: [Tesseract.js](https://tesseract.projectnaptha.com/)
- **Icons**: [Lucide](https://lucide.dev/)
- **Animations**: [Motion](https://motion.dev/)

---

Made with ❤️ by [Ishan Jalan](https://github.com/ishanjalan)
