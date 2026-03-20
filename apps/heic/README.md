# HEIC Converter — Free Unlimited iPhone Photo Converter

Convert HEIC and HEIF photos to JPG, PNG, WebP, or AVIF instantly in your browser. No file limits, no uploads, no account required — 100% private.

🔗 **Live**: [ishanjalan.github.io/HEICConverter](https://ishanjalan.github.io/HEICConverter/)

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
# From the monorepo root
pnpm dev:heic

# Or from this directory
pnpm dev
```

The app will be available at `http://localhost:5178`

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
