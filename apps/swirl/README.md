# Swirl — Free Browser-Based GIF Tools

Create, convert, and optimize GIFs with 8 independent tools. Video to GIF, frame editing, one-click optimization for Discord/Slack/Twitter — all powered by gifsicle and gifski WASM, running locally in your browser.

🔗 **Live**: [ishanjalan.github.io/Swirl](https://ishanjalan.github.io/Swirl/)

## ✨ Tools

| Tool                | URL                                                              | Description                                                                |
| ------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Video to GIF**    | [/video-to-gif](https://ishanjalan.github.io/Swirl/video-to-gif) | Convert MP4, WebM, or MOV to GIF with FPS and quality control              |
| **GIF Maker**       | [/make](https://ishanjalan.github.io/Swirl/make)                 | Create an animated GIF from a sequence of images                           |
| **Optimize GIF**    | [/optimize](https://ishanjalan.github.io/Swirl/optimize)         | Compress GIFs with one-click presets for Discord, Twitter, Slack, WhatsApp |
| **Add Text**        | [/text](https://ishanjalan.github.io/Swirl/text)                 | Add captions or meme-style text overlays                                   |
| **Resize GIF**      | [/resize](https://ishanjalan.github.io/Swirl/resize)             | Resize to exact dimensions or a percentage                                 |
| **Crop GIF**        | [/crop](https://ishanjalan.github.io/Swirl/crop)                 | Crop with a visual drag handle                                             |
| **Reverse GIF**     | [/reverse](https://ishanjalan.github.io/Swirl/reverse)           | Play backwards or create a boomerang loop                                  |
| **Change Speed**    | [/speed](https://ishanjalan.github.io/Swirl/speed)               | Speed up or slow down any animated GIF                                     |

### Platform Size Presets

One-click optimization targets:

- 💬 **Discord** — 10 MB limit
- 𝕏 **Twitter / X** — 15 MB limit
- 💼 **Slack** — 1 MB limit
- 📱 **WhatsApp** — 16 MB limit

## 🏗️ Tech Stack

### Core

- **Svelte 5** — Runes reactivity system
- **SvelteKit** — Static adapter with full prerendering, deployed to GitHub Pages
- **TypeScript** — Type-safe development
- **Tailwind CSS v4** — Utility-first styling

### GIF Processing

- **[gifsicle-wasm-browser](https://github.com/nicholasgasior/gifsicle-wasm)** — GIF optimization, resize, crop, reverse, speed
- **[gifski-wasm](https://github.com/nicholasgasior/gifski-wasm)** — High-quality GIF encoding for video-to-GIF conversion
- **[Mediabunny](https://mediabunny.dev)** — WebCodecs-based video frame extraction

### Utilities

- **[Comlink](https://github.com/GoogleChromeLabs/comlink)** — Type-safe Web Worker communication
- **[JSZip](https://stuk.github.io/jszip/)** — Batch frame download as ZIP

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

Each of the 8 tool routes is prerendered to its own `index.html` at build time, enabling direct indexing by search engines.

## 🔒 Privacy

All processing happens **100% locally** in your browser:

- Files never leave your device
- No server uploads
- Works offline as a PWA
- Zero data collection

## 📄 License

MIT License — see [LICENSE](../../LICENSE) for details.
