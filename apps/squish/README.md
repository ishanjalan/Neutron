# Squish — Free Browser-Based Image Optimizer

Compress JPEG, PNG, WebP, AVIF, JPEG XL, SVG, GIF, and HEIC images using best-in-class WASM codecs. All processing runs locally in your browser — no uploads, no limits, 100% private.

🔗 **Live**: [ishanjalan.github.io/Squish](https://ishanjalan.github.io/Squish/)

## ✨ Features

- **8+ formats** — JPEG, PNG, WebP, AVIF, JPEG XL, SVG, GIF, HEIC input/output
- **Best-in-class codecs** — MozJPEG, libwebp, libaom (AV1), libjxl
- **Before/after preview** — Visual comparison slider for every image
- **Per-file quality control** — Fine-tune compression settings individually
- **Resize** — Scale by percentage or exact dimensions
- **Lossless mode** — Reduce file size without quality loss
- **Batch processing** — Optimize hundreds of images at once
- **Format conversion** — Convert between any supported format
- **SVG optimization** — SVGO-powered minification

## 🏗️ Tech Stack

### Core

- **Svelte 5** — Runes reactivity system
- **SvelteKit** — Static adapter, deployed to GitHub Pages
- **TypeScript** — Type-safe development
- **Tailwind CSS v4** — Utility-first styling

### Image Processing

- **[icodec](https://github.com/nicholasgasior/icodec)** — Unified WASM codec interface
  - MozJPEG — Best-in-class JPEG compression
  - libwebp — WebP encoding
  - libaom (AV1) — AVIF encoding
  - libjxl — JPEG XL encoding
- **[heic2any](https://github.com/alexcorvi/heic2any)** — HEIC/HEIF input support
- **[SVGO](https://github.com/svg/svgo)** — SVG optimization and minification

### Utilities

- **[Comlink](https://github.com/GoogleChromeLabs/comlink)** — Type-safe Web Worker communication
- **[JSZip](https://stuk.github.io/jszip/)** — Batch download as ZIP

## 🛠️ Development

```bash
# From the monorepo root
pnpm dev:squish

# Or from this directory
pnpm dev
```

The app will be available at `http://localhost:5176`

## 📦 Build

```bash
pnpm build
```

Output is generated in the `build/` directory, ready for static hosting.

## 🔒 Privacy

All processing happens **100% locally** in your browser:

- Images never leave your device
- No server uploads
- Works offline as a PWA
- Zero data collection

## 📄 License

MIT License — see [LICENSE](../../LICENSE) for details.
