# Swirl - GIF Toolkit

Create, convert, and optimize GIFs with professional tools. Video to GIF, frame editing, optimization for Discord/Slack/Twitter — all running locally in your browser.

🔗 **Live Demo**: [ishanjalan.github.io/Swirl](https://ishanjalan.github.io/Swirl/)

## ✨ Features

| Tool | Description |
|------|-------------|
| **Video to GIF** | Convert any video to animated GIF |
| **GIF Maker** | Create GIFs from image sequences |
| **Optimize** | Shrink GIFs for Discord, Slack, Twitter |
| **Add Text** | Meme-style captions and overlays |
| **Combine** | Merge multiple GIFs into one |
| **Resize** | Perfect for emojis and stickers |
| **Crop** | Visual cropping with drag handles |
| **Reverse** | Play backwards or create boomerang loops |
| **Speed** | Speed up or slow down playback |
| **Split Frames** | Export every frame as PNG |

### Platform Presets
One-click optimization for:
- 💬 **Discord** — 10MB limit
- 𝕏 **Twitter** — 15MB limit
- 💼 **Slack** — 1MB limit
- 📱 **WhatsApp** — 16MB limit

## 🏗️ Tech Stack

### Core
- **Svelte 5** — Runes reactivity system
- **SvelteKit** — Static adapter for PWA
- **TypeScript** — Type-safe development
- **Tailwind CSS v4** — Utility-first styling

### GIF Processing
- **[gifsicle-wasm-browser](https://github.com/nicholashollandmoore/gifsicle-wasm)** — GIF optimization and manipulation
- **[gifski-wasm](https://github.com/nicholashollandmoore/gifski-wasm)** — High-quality GIF encoding
- **[Mediabunny](https://mediabunny.dev)** — Video frame extraction via WebCodecs

### Utilities
- **[Comlink](https://github.com/GoogleChromeLabs/comlink)** — Type-safe Web Worker communication
- **[idb](https://github.com/nicholashollandmoore/idb)** — IndexedDB for large file handling
- **[JSZip](https://stuk.github.io/jszip/)** — Batch download as ZIP

## 🛠️ Development

```bash
# From the monorepo root
pnpm dev:swirl

# Or from this directory
pnpm dev
```

The app will be available at `http://localhost:5177`

## 📦 Build

```bash
pnpm build
```

Output is generated in the `build/` directory, ready for static hosting.

## 🔒 Privacy

All processing happens **100% locally** in your browser:
- Files never leave your device
- No server uploads
- Works offline as a PWA
- Zero data collection

## 📄 License

MIT License — see [LICENSE](../../LICENSE) for details.
