# Squash — Free Browser-Based Video Compressor

Compress MP4, WebM, MOV, and MKV videos using the browser's native WebCodecs API. Hardware-accelerated where available, no FFmpeg, no uploads — 100% private.

🔗 **Live**: [ishanjalan.github.io/Squash](https://ishanjalan.github.io/Squash/)

## ✨ Features

- **WebCodecs-powered** — Uses native browser video encoding, not FFmpeg WASM
- **Hardware acceleration** — GPU encoding where the browser supports it
- **Pro codecs** — H.264, H.265/HEVC, VP9, AV1 for video; AAC, Opus for audio
- **Quality presets** — Tiny, Web, Social, High, Lossless
- **Resolution control** — Downscale to 360p, 480p, 720p, 1080p, or 4K
- **Audio options** — Adjust bitrate, codec, or strip audio entirely
- **Batch processing** — Compress multiple videos at once
- **Trim support** — Set start/end times before compressing; optional **Fast cut** copies most of the video untouched (near-instant, no quality loss) and re-encodes only the first few seconds so the cut stays exact
- **Target size** — Compress to "under X MB": Squash plans a bitrate and resolution, measures the result, and re-encodes up or down (up to 3 passes), keeping the largest file that fits. Each result says whether it fit
- **Frame-rate cap** — 30 / 24 / 15 fps (only ever lowers the source rate)
- **Rotate** — Per-video 90° steps, baked into the frames so every player agrees
- **Cancel** — Stop a compression mid-encode; the video returns to pending

## 🧭 Routes

| Route                         | What it is                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/`                           | The video compressor                                                                                       |
| `/compress-video-for-discord` | Compressor preselecting Discord's free upload limit (20 MB)                                                |
| `/compress-video-for-email`   | Compressor preselecting a safe size for Gmail's 25 MB attachment limit                                     |
| `/video-to-mp3`               | Extract audio as MP3, M4A (AAC), Opus (Ogg) or WAV. FLAC/Vorbis aren't offered: browsers can't encode them |

The two size-target pages share the compressor; their limits come from `src/lib/size-targets.ts`. Platform limits change, so re-check them against the platform's own help page before editing.

## 📥 Input formats

MP4, WebM, MOV and MKV. **AVI is not supported** — neither Mediabunny nor browsers can decode it.

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
- **[fflate](https://101arrowz.github.io/fflate/)** — Batch download as ZIP

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
