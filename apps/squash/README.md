# Squash — Free Browser-Based Video Compressor

Compress MP4, WebM, and MOV videos using the browser's native WebCodecs API. Hardware-accelerated where available, no FFmpeg, no uploads — 100% private.

🔗 **Live**: [ishanjalan.github.io/Squash](https://ishanjalan.github.io/Squash/)

## ✨ Features

- **WebCodecs-powered** — Uses native browser video encoding, not FFmpeg WASM
- **Hardware acceleration** — GPU encoding where the browser supports it
- **Pro codecs** — H.264, H.265/HEVC, VP9, AV1 for video; AAC, Opus for audio
- **Quality presets** — Tiny, Web, Social, High, Lossless
- **Resolution control** — Downscale to 360p, 480p, 720p, 1080p, or 4K
- **Audio options** — Adjust bitrate, codec, or strip audio entirely
- **Batch processing** — Compress multiple videos at once
- **Trim support** — Set start/end times before compressing

## 🖥️ Browser Support

Squash uses the WebCodecs API, which requires a modern browser:

- ✅ Chrome 94+
- ✅ Edge 94+
- ✅ Safari 16.4+
- ❌ Firefox (WebCodecs encoding not yet supported)

## 🏗️ Tech Stack

### Core

- **Svelte 5** — Runes reactivity system
- **SvelteKit** — Static adapter, deployed to GitHub Pages
- **TypeScript** — Type-safe development
- **Tailwind CSS v4** — Utility-first styling

### Video Processing

- **[WebCodecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)** — Native browser video encoding/decoding
- **[Mediabunny](https://mediabunny.dev)** — Lightweight WebCodecs abstraction layer for muxing/demuxing
- **Hardware encoding** — GPU-accelerated where supported by the browser and OS

### Utilities

- **[Comlink](https://github.com/GoogleChromeLabs/comlink)** — Type-safe Web Worker communication
- **[JSZip](https://stuk.github.io/jszip/)** — Batch download as ZIP

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
