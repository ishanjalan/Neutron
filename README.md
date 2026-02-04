# Neutron - Privacy-First File Tools

Free, open-source file processing tools that run entirely in your browser. No uploads, no tracking, 100% private.

## 🌟 Featured Tool

### HEIC Converter - Unlimited iPhone Photo Conversion

Convert unlimited HEIC photos to JPG, PNG, WebP, or AVIF. 100% browser-based, no file limits.

**[Try HEIC Converter →](https://ishanjalan.github.io/HEICConverter/)**

- ✓ Unlimited files (no 20/month limit like other tools)
- ✓ Batch processing (thousands at once)
- ✓ 100% private (files never uploaded)
- ✓ Modern formats (WebP, AVIF)
- ✓ Works offline as PWA

---

## 🛠️ Other Tools

| App        | Description                           | Status   | Link                                                        |
| ---------- | ------------------------------------- | -------- | ----------------------------------------------------------- |
| **Squish** | Image compression with modern formats | Active   | [Use Squish →](https://ishanjalan.github.io/ImageOptimser/) |
| Smash      | PDF toolkit                           | Archived | See `archive` branch                                        |
| Squash     | Video compression                     | Archived | See `archive` branch                                        |
| Swirl      | GIF tools                             | Archived | See `archive` branch                                        |

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

| App            | Processing Libraries                                    |
| -------------- | ------------------------------------------------------- |
| HEIC Converter | heic2any (libheif WASM), icodec (JPEG, PNG, WebP, AVIF) |
| Squish         | icodec (MozJPEG, WebP, AVIF, JXL), heic2any, svgo       |

## 📦 Project Structure

```
neutron/
├── apps/
│   ├── heic/            # HEIC Converter (featured)
│   └── squish/          # Image compressor
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
pnpm dev:heic     # http://localhost:5178
pnpm dev:squish   # http://localhost:5176
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
pnpm --filter heic build
```

## 🚀 Deployment

The apps are automatically deployed to GitHub Pages when changes are pushed to the `main` branch.

| App            | Source                        | Live URL                                                                          |
| -------------- | ----------------------------- | --------------------------------------------------------------------------------- |
| HEIC Converter | [`apps/heic/`](apps/heic)     | [ishanjalan.github.io/HEICConverter](https://ishanjalan.github.io/HEICConverter/) |
| Squish         | [`apps/squish/`](apps/squish) | [ishanjalan.github.io/ImageOptimser](https://ishanjalan.github.io/ImageOptimser/) |

## 📝 Archived Apps

The following apps have been archived to focus development efforts on the HEIC converter. They remain available in the `archive` branch for reference:

- **Smash** - PDF toolkit (compress, merge, split, OCR)
- **Squash** - Video compression
- **Swirl** - GIF tools

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Built with amazing open-source tools:

- **Image Processing**: [icodec](https://github.com/nicholashollandmoore/icodec) (MozJPEG, WebP, AVIF, JXL encoders)
- **HEIC Conversion**: [heic2any](https://github.com/alexcorvi/heic2any) (libheif WASM wrapper)
- **Icons**: [Lucide](https://lucide.dev/)
- **Animations**: [Motion](https://motion.dev/)

---

Made with ❤️ by [Ishan Jalan](https://github.com/ishanjalan)
