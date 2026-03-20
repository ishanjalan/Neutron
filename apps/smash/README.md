# Smash — Free Browser-Based PDF Tools

A complete PDF toolkit with 13 independent tools — compress, merge, split, rotate, OCR, protect, and more. Powered by Ghostscript WASM and qpdf. All processing runs locally in your browser — no uploads, no limits, 100% private.

🔗 **Live**: [ishanjalan.github.io/Smash](https://ishanjalan.github.io/Smash/)

## ✨ Tools

| Tool | URL | Description |
|------|-----|-------------|
| **Compress PDF** | [/compress](https://ishanjalan.github.io/Smash/compress) | Reduce file size 50–90% with Ghostscript WASM |
| **Merge PDFs** | [/merge](https://ishanjalan.github.io/Smash/merge) | Combine multiple PDFs, drag to reorder |
| **Split PDF** | [/split](https://ishanjalan.github.io/Smash/split) | Extract pages with a visual page picker |
| **Rotate PDF** | [/rotate](https://ishanjalan.github.io/Smash/rotate) | Rotate pages 90°, 180°, or 270° |
| **Delete Pages** | [/delete](https://ishanjalan.github.io/Smash/delete) | Remove unwanted pages |
| **Reorder Pages** | [/reorder](https://ishanjalan.github.io/Smash/reorder) | Drag and drop to rearrange pages |
| **PDF to Images** | [/to-images](https://ishanjalan.github.io/Smash/to-images) | Export pages as PNG, JPG, or WebP (up to 300 DPI) |
| **Images to PDF** | [/from-images](https://ishanjalan.github.io/Smash/from-images) | Create a PDF from JPG, PNG, or WebP images |
| **Add Page Numbers** | [/page-numbers](https://ishanjalan.github.io/Smash/page-numbers) | Add page numbers with position and format control |
| **Watermark PDF** | [/watermark](https://ishanjalan.github.io/Smash/watermark) | Add a custom text watermark to every page |
| **Protect PDF** | [/protect](https://ishanjalan.github.io/Smash/protect) | Encrypt with AES-256 password protection |
| **Unlock PDF** | [/unlock](https://ishanjalan.github.io/Smash/unlock) | Remove password protection |
| **OCR PDF** | [/ocr](https://ishanjalan.github.io/Smash/ocr) | Extract searchable text from scanned PDFs (100+ languages) |

## 🏗️ Tech Stack

### Core

- **Svelte 5** — Runes reactivity system
- **SvelteKit** — Static adapter with full prerendering, deployed to GitHub Pages
- **TypeScript** — Type-safe development
- **Tailwind CSS v4** — Utility-first styling

### PDF Processing

- **[Ghostscript WASM](https://github.com/nicholasgasior/ghostscript-wasm)** — Professional PDF compression (50–90% size reduction)
- **[qpdf WASM](https://github.com/nicholasgasior/qpdf-wasm)** — AES-256 encryption and decryption
- **[pdf-lib](https://pdf-lib.js.org/)** — PDF manipulation (merge, split, rotate, reorder, watermark, page numbers)
- **[pdfjs-dist](https://mozilla.github.io/pdf.js/)** — PDF rendering for visual page previews
- **[Tesseract.js](https://tesseract.projectnaptha.com/)** — OCR text extraction (100+ language support)

### Utilities

- **[Comlink](https://github.com/GoogleChromeLabs/comlink)** — Type-safe Web Worker communication
- **[JSZip](https://stuk.github.io/jszip/)** — Batch download as ZIP

## 🛠️ Development

```bash
# From the monorepo root
pnpm dev:smash

# Or from this directory
pnpm dev
```

The app will be available at `http://localhost:5174`

## 📦 Build

```bash
pnpm build
```

Each of the 13 tool routes is prerendered to its own `index.html` at build time, enabling direct indexing by search engines.

## 🔒 Privacy

All processing happens **100% locally** in your browser:

- Files never leave your device
- No server uploads
- Works offline as a PWA
- Zero data collection

## 📄 License

MIT License — see [LICENSE](../../LICENSE) for details.
