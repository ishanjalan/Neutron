# Smash — Free Browser-Based PDF Tools

A complete PDF toolkit with 17 independent tools — compress, merge, split, rotate, OCR, protect, watermark, and more. Powered by Ghostscript WASM. All processing runs locally in your browser — no uploads, no limits, 100% private.

🔗 **Live**: [ishanjalan.github.io/Smash](https://ishanjalan.github.io/Smash/)

## ✨ Tools

| Tool              | URL                                                            | Description                                                |
| ----------------- | -------------------------------------------------------------- | ---------------------------------------------------------- |
| **Compress PDF**  | [/compress](https://ishanjalan.github.io/Smash/compress)       | Reduce file size 50–90% with Ghostscript WASM              |
| **Merge PDFs**    | [/merge](https://ishanjalan.github.io/Smash/merge)             | Combine multiple PDFs, drag to reorder                     |
| **Split PDF**     | [/split](https://ishanjalan.github.io/Smash/split)             | Extract pages with a visual page picker                    |
| **Rotate PDF**    | [/rotate](https://ishanjalan.github.io/Smash/rotate)           | Rotate pages 90°, 180°, or 270°                            |
| **Delete Pages**  | [/delete](https://ishanjalan.github.io/Smash/delete)           | Remove unwanted pages                                      |
| **Reorder Pages** | [/reorder](https://ishanjalan.github.io/Smash/reorder)         | Drag and drop to rearrange pages                           |
| **PDF to Images** | [/to-images](https://ishanjalan.github.io/Smash/to-images)     | Export pages as PNG, JPG, or WebP (up to 300 DPI)          |
| **Images to PDF** | [/from-images](https://ishanjalan.github.io/Smash/from-images) | Create a PDF from JPG, PNG, or WebP images                 |
| **Protect PDF**   | [/protect](https://ishanjalan.github.io/Smash/protect)         | Encrypt with AES-128 password protection                   |
| **Unlock PDF**    | [/unlock](https://ishanjalan.github.io/Smash/unlock)           | Remove password protection                                 |
| **OCR PDF**           | [/ocr](https://ishanjalan.github.io/Smash/ocr)                             | Extract searchable text from scanned PDFs (100+ languages) |
| **Watermark**         | [/watermark](https://ishanjalan.github.io/Smash/watermark)                 | Add text watermarks with custom opacity and position       |
| **Add Page Numbers**  | [/add-page-numbers](https://ishanjalan.github.io/Smash/add-page-numbers)   | Stamp page numbers with configurable position and style    |
| **Edit Metadata**     | [/edit-metadata](https://ishanjalan.github.io/Smash/edit-metadata)         | Edit title, author, subject, and other PDF metadata        |
| **Remove Blank Pages**| [/remove-blank-pages](https://ishanjalan.github.io/Smash/remove-blank-pages) | Auto-detect and remove blank pages                       |
| **Reverse Pages**     | [/reverse-pages](https://ishanjalan.github.io/Smash/reverse-pages)         | Reverse the page order of a PDF                            |
| **Workspace**         | [/workspace](https://ishanjalan.github.io/Smash/workspace)                 | Multi-tool workspace for chaining operations               |

## 🏗️ Tech Stack

### Core

- **Svelte 5** — Runes reactivity system
- **SvelteKit** — Static adapter with full prerendering, deployed to GitHub Pages
- **TypeScript** — Type-safe development
- **Tailwind CSS v4** — Utility-first styling

### PDF Processing

- **[Ghostscript WASM](https://github.com/nicholasgasior/ghostscript-wasm)** — Professional PDF compression (50–90% size reduction)
- **[pdf-lib](https://pdf-lib.js.org/)** — PDF manipulation and AES-128 encryption (merge, split, rotate, protect, reorder, watermark, page numbers)
- **[pdfjs-dist](https://mozilla.github.io/pdf.js/)** — PDF rendering for visual page previews
- **[Tesseract.js](https://tesseract.projectnaptha.com/)** — OCR text extraction (100+ language support)

### Utilities

- **[Comlink](https://github.com/GoogleChromeLabs/comlink)** — Type-safe Web Worker communication
- **[fflate](https://101arrowz.github.io/fflate/)** — Batch download as ZIP

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

Each of the 17 tool routes is prerendered to its own `index.html` at build time, enabling direct indexing by search engines.

## 🔒 Privacy

All processing happens **100% locally** in your browser:

- Files never leave your device
- No server uploads
- Works offline as a PWA
- Zero data collection

## 📄 License

MIT License — see [LICENSE](../../LICENSE) for details.
