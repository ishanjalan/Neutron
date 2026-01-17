# Neutron

A monorepo containing four free, privacy-focused file processing tools that run entirely in your browser.

## 🚀 Apps

| App | Description | Live Demo |
|-----|-------------|-----------|
| **[Squish](apps/squish)** | Image compressor with MozJPEG, WebP, AVIF, JPEG XL | [squish.app](https://ishanjalan.github.io/ImageOptimser/) |
| **[Squash](apps/squash)** | Video compressor using WebCodecs API | [squash.app](https://ishanjalan.github.io/Squash/) |
| **[Smash](apps/smash)** | PDF toolkit — compress, merge, split, protect | [smash.app](https://ishanjalan.github.io/Smash/) |
| **[Swirl](apps/swirl)** | GIF toolkit — create, optimize, resize, crop | [swirl.app](https://ishanjalan.github.io/Swirl/) |

## ✨ Features

- **100% Private** — All processing happens locally in your browser. Your files never leave your device.
- **No Account Required** — Just open and use. No sign-ups, no tracking.
- **Works Offline** — Install as a PWA and use without internet.
- **Free Forever** — Open source under MIT license.

## 🏗️ Tech Stack

- **Framework**: [SvelteKit](https://kit.svelte.dev/) with Svelte 5
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) v4
- **Build**: [Vite](https://vitejs.dev/) v7
- **Monorepo**: [Turborepo](https://turbo.build/) + [pnpm](https://pnpm.io/)
- **Deployment**: GitHub Pages via GitHub Actions

## 📦 Project Structure

```
neutron/
├── apps/
│   ├── squish/          # Image compressor
│   ├── squash/          # Video compressor
│   ├── smash/           # PDF toolkit
│   └── swirl/           # GIF toolkit
├── packages/
│   ├── ui/              # Shared UI components (Toast, Footer, etc.)
│   ├── utils/           # Shared utilities (formatBytes, focusTrap, etc.)
│   └── config/          # Shared configs (Tailwind, TypeScript)
└── turbo.json           # Turborepo configuration
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- pnpm 8+

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
pnpm --filter squish dev
pnpm --filter squash dev
pnpm --filter smash dev
pnpm --filter swirl dev
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

| App | Source | Live URL |
|-----|--------|----------|
| Squish | [`apps/squish/`](apps/squish) | [ishanjalan.github.io/ImageOptimser](https://ishanjalan.github.io/ImageOptimser/) |
| Squash | [`apps/squash/`](apps/squash) | [ishanjalan.github.io/Squash](https://ishanjalan.github.io/Squash/) |
| Smash | [`apps/smash/`](apps/smash) | [ishanjalan.github.io/Smash](https://ishanjalan.github.io/Smash/) |
| Swirl | [`apps/swirl/`](apps/swirl) | [ishanjalan.github.io/Swirl](https://ishanjalan.github.io/Swirl/) |

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Built with amazing open-source tools:

- [MozJPEG](https://github.com/nicholashollandmoore/libimagequant) — JPEG compression
- [libvips](https://github.com/nicholashollandmoore/libimagequant) — Image processing
- [Ghostscript WASM](https://github.com/nicholashollandmoore/libimagequant) — PDF compression
- [qpdf WASM](https://github.com/nicholashollandmoore/libimagequant) — PDF encryption
- [gifsicle WASM](https://github.com/nicholashollandmoore/libimagequant) — GIF optimization
- [Lucide Icons](https://lucide.dev/) — Beautiful icons

---

Made with ❤️ by [Ishan Jalan](https://github.com/ishanjalan)
