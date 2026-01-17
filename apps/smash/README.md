# Smash - PDF Toolkit

A comprehensive PDF toolkit that runs entirely in your browser. Compress, merge, split, protect, unlock, rotate, and convert PDFs with professional-grade tools.

🔗 **Live Demo**: [ishanjalan.github.io/Smash](https://ishanjalan.github.io/Smash/)

## ✨ Features

| Tool | Description |
|------|-------------|
| **Compress** | Reduce file size 50-90% with Ghostscript WASM |
| **Merge** | Combine multiple PDFs into one |
| **Split** | Extract pages or split into multiple files |
| **Protect** | Add AES-256 password encryption |
| **Unlock** | Remove password protection |
| **Rotate** | Rotate pages 90°, 180°, or 270° |
| **Delete** | Remove unwanted pages |
| **Reorder** | Drag and drop to rearrange |
| **PDF → Images** | Convert to PNG, JPG, or WebP |
| **Images → PDF** | Create PDF from images |
| **Page Numbers** | Add numbering to documents |
| **Watermark** | Add text watermarks |
| **OCR** | Extract searchable text from scanned PDFs |

## 🏗️ Tech Stack

### Core
- **Svelte 5** — Runes reactivity system
- **SvelteKit** — Static adapter for PWA
- **TypeScript** — Type-safe development
- **Tailwind CSS v4** — Utility-first styling

### PDF Processing
- **[Ghostscript WASM](https://github.com/nicholashollandmoore/ghostscript-wasm)** — Professional PDF compression (50-90% reduction)
- **[qpdf WASM](https://github.com/nicholashollandmoore/qpdf-wasm)** — AES-256 encryption/decryption
- **[pdf-lib](https://pdf-lib.js.org/)** — PDF manipulation (merge, split, rotate, etc.)
- **[pdfjs-dist](https://mozilla.github.io/pdf.js/)** — PDF rendering for previews
- **[Tesseract.js](https://tesseract.projectnaptha.com/)** — OCR text extraction

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

Output is generated in the `build/` directory, ready for static hosting.

## 🔒 Privacy

All processing happens **100% locally** in your browser:
- Files never leave your device
- No server uploads
- Works offline as a PWA
- Zero data collection

## 📄 License

MIT License — see [LICENSE](../../LICENSE) for details.
