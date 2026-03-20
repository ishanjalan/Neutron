# HEIC Converter

Convert unlimited HEIC/HEIF photos to JPG, PNG, WebP, or AVIF — instantly in your browser.

**[Try it live →](https://ishanjalan.github.io/HEICConverter/)**

## Features

- **Unlimited files** — No 20/month cap like other online tools
- **Batch processing** — Convert thousands of photos at once
- **4 output formats** — JPG, PNG, WebP, AVIF
- **100% private** — Files never leave your device
- **Works offline** — Installable as a PWA
- **No account required** — Open and use instantly

## Tech Stack

- **[Svelte 5](https://svelte.dev/)** with SvelteKit and TypeScript
- **[heic2any](https://github.com/alexcorvi/heic2any)** — libheif WASM wrapper for HEIC decoding
- **[icodec](https://github.com/nicholashollandmoore/icodec)** — MozJPEG, WebP, AVIF encoders
- **[Tailwind CSS v4](https://tailwindcss.com/)** for styling
- Deployed to GitHub Pages via static adapter

## Privacy

All conversion happens in your browser using WebAssembly. No files are uploaded to any server. No analytics or tracking.

## Development

```bash
# From the repo root
pnpm dev:heic   # http://localhost:5178

# Build
pnpm --filter heic build
```
