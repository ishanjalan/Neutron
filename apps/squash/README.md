# Squash - Video Compressor

GPU-accelerated video compression powered by WebCodecs. Compress videos at warp speed with hardware encoding — all running locally in your browser.

🔗 **Live Demo**: [ishanjalan.github.io/Squash](https://ishanjalan.github.io/Squash/)

## ✨ Features

- **GPU Accelerated** — Up to 100x faster with hardware encoding
- **Pro Codecs** — H.264, H.265/HEVC, VP9, AV1, AAC, Opus
- **Quality Presets** — Tiny, Web, Social, High, Lossless
- **Resolution Control** — Downscale to 360p-4K
- **Audio Options** — Bitrate, codec, or strip audio
- **Two-Pass Encoding** — Better quality at target file sizes
- **Batch Processing** — Compress multiple videos at once
- **Trim Support** — Set start/end times before compression

## 🏗️ Tech Stack

### Core

- **Svelte 5** — Runes reactivity system
- **SvelteKit** — Static adapter for PWA
- **TypeScript** — Type-safe development
- **Tailwind CSS v4** — Utility-first styling

### Video Processing

- **[Mediabunny](https://mediabunny.dev)** — Lightweight WebCodecs wrapper
- **WebCodecs API** — Native browser video encoding/decoding
- **Hardware Acceleration** — GPU-powered encoding when available

### Utilities

- **[Comlink](https://github.com/GoogleChromeLabs/comlink)** — Type-safe Web Worker communication
- **[idb](https://github.com/nicholashollandmoore/idb)** — IndexedDB for large file handling
- **[JSZip](https://stuk.github.io/jszip/)** — Batch download as ZIP

## 🖥️ Browser Support

WebCodecs requires modern browsers with hardware encoding support:

- ✅ Chrome 94+
- ✅ Edge 94+
- ✅ Safari 16.4+
- ❌ Firefox (WebCodecs not supported yet)

## 🛠️ Development

```bash
# From the monorepo root
pnpm dev:squash

# Or from this directory
pnpm dev
```

The app will be available at `http://localhost:5175`

## 📦 Build

```bash
pnpm build
```

Output is generated in the `build/` directory, ready for static hosting.

## 🔒 Privacy

All processing happens **100% locally** in your browser:

- Videos never leave your device
- No server uploads
- Works offline as a PWA
- Zero data collection

## 📄 License

MIT License — see [LICENSE](../../LICENSE) for details.
