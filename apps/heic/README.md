# HEIC Converter — Deprecated

> **This app is deprecated.** It redirects to [Squish's /heic route](https://ishanjalan.github.io/Squish/heic), which provides the same functionality alongside Squish's full image optimization suite. This app is no longer deployed in CI.

Convert HEIC and HEIF photos to JPG, PNG, WebP, or AVIF instantly in your browser. No file limits, no uploads, no account required — 100% private.

## ✨ Features

- **Unlimited files** — No 20/month cap like other online HEIC converters
- **Batch processing** — Convert thousands of photos at once
- **4 output formats** — JPG, PNG, WebP, AVIF
- **100% private** — Files never leave your device
- **Works offline** — Installable as a PWA
- **No account required** — Open and use instantly

## 🏗️ Tech Stack

### Core

- **Svelte 5** — Runes reactivity system
- **SvelteKit** — Static adapter, deployed to GitHub Pages
- **TypeScript** — Type-safe development
- **Tailwind CSS v4** — Utility-first styling

### Image Processing

- **[heic2any](https://github.com/alexcorvi/heic2any)** — libheif WASM wrapper for HEIC/HEIF decoding
- **[icodec](https://github.com/nicholasgasior/icodec)** — MozJPEG, libwebp, libaom encoders for JPG, WebP, AVIF output

### Utilities

- **[Comlink](https://github.com/GoogleChromeLabs/comlink)** — Type-safe Web Worker communication for non-blocking processing

## 🛠️ Development

```bash
# From this directory only (no monorepo script — app is deprecated)
pnpm dev
```

## 📦 Build

```bash
pnpm build
```

Output is generated in the `build/` directory, ready for static hosting.

## 🔒 Privacy

All conversion happens **100% locally** in your browser using WebAssembly:

- Photos never leave your device
- No server uploads
- Works offline as a PWA
- Zero data collection or analytics

## 📄 License

MIT License — see [LICENSE](../../LICENSE) for details.
