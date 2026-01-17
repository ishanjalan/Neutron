# Squish - Image Compressor

Optimize images with cutting-edge WASM codecs. Compress JPEG, PNG, WebP, AVIF, JPEG XL, and SVG — all running locally in your browser.

🔗 **Live Demo**: [ishanjalan.github.io/ImageOptimser](https://ishanjalan.github.io/ImageOptimser/)

## ✨ Features

- **Multi-Format Support** — JPEG, PNG, WebP, AVIF, JPEG XL, SVG, GIF, HEIC
- **Best-in-Class Codecs** — MozJPEG, libwebp, libaom, libjxl
- **Visual Comparison** — Before/after slider for each image
- **Quality Control** — Fine-tune compression per format
- **Resize Options** — Scale by percentage or dimensions
- **Batch Processing** — Optimize hundreds of images at once
- **Format Conversion** — Convert between any supported format
- **SVG Optimization** — SVGO-powered minification

## 🏗️ Tech Stack

### Core

- **Svelte 5** — Runes reactivity system
- **SvelteKit** — Static adapter for PWA
- **TypeScript** — Type-safe development
- **Tailwind CSS v4** — Utility-first styling

### Image Processing

- **[icodec](https://github.com/nicholashollandmoore/icodec)** — Unified WASM codec interface
  - MozJPEG — Best JPEG compression
  - libwebp — WebP encoding
  - libaom (AV1) — AVIF encoding
  - libjxl — JPEG XL encoding
- **[heic2any](https://github.com/nicholashollandmoore/heic2any)** — HEIC/HEIF conversion
- **[SVGO](https://github.com/nicholashollandmoore/svgo)** — SVG optimization

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
