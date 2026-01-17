# Neutron Testing Guide

This guide explains how to verify that all features across the Neutron apps work as expected.

## 🧪 Test Infrastructure

Neutron uses two testing frameworks:

| Framework | Type | Command | Purpose |
|-----------|------|---------|---------|
| **Vitest** | Unit | `pnpm test:unit` | Test utility functions, validation schemas |
| **Playwright** | E2E | `pnpm test:e2e` | Test UI interactions, full user flows |

## 📋 Quick Test Commands

```bash
# Run all unit tests
pnpm test:unit

# Run all E2E tests (requires running dev server)
pnpm test:e2e

# Run E2E tests with UI mode (interactive)
pnpm test:e2e:ui

# Run specific E2E test file
npx playwright test ux-quality --project=chromium
npx playwright test neutron-features --project=chromium
npx playwright test homepage --project=chromium
```

## 🏠 Testing Each App

### Smash (PDF Toolkit) - Port 5174

**Features to Test (13 tools):**

| Tool | Route | Manual Test Steps |
|------|-------|-------------------|
| Compress PDF | `/compress` | Upload PDF → Select preset → Compress → Download |
| Merge PDFs | `/merge` | Upload 2+ PDFs → Drag to reorder → Merge → Download |
| Split PDF | `/split` | Upload PDF → Choose extract/every-n → Split → Download |
| Rotate Pages | `/rotate` | Upload PDF → Select angle (90°/180°/270°) → Apply |
| Delete Pages | `/delete` | Upload PDF → Select pages → Delete → Download |
| Reorder Pages | `/reorder` | Upload PDF → Drag pages → Save → Download |
| PDF to Images | `/to-images` | Upload PDF → Choose format → Convert → Download |
| Images to PDF | `/from-images` | Upload images → Arrange → Create PDF → Download |
| Page Numbers | `/page-numbers` | Upload PDF → Set position → Apply → Download |
| Watermark | `/watermark` | Upload PDF → Enter text → Set opacity → Apply |
| Protect PDF | `/protect` | Upload PDF → Set password → Encrypt → Download |
| Unlock PDF | `/unlock` | Upload protected PDF → Enter password → Unlock |
| OCR | `/ocr` | Upload scanned PDF → Extract text |

**Start Smash Dev Server:**
```bash
pnpm dev:smash
# Opens at http://localhost:5174
```

### Squash (Video Compressor) - Port 5175

**Features to Test:**

| Feature | Test Steps |
|---------|------------|
| Video Upload | Drop/click to upload MP4, WebM, MOV files |
| Quality Presets | Test: Tiny, Web, Social, High, Lossless |
| Output Formats | Test: MP4, WebM, AV1 |
| Trim Controls | Set start/end time before compression |
| Batch Processing | Upload multiple videos → Compress all |
| Download | Individual download + ZIP download |

**Start Squash Dev Server:**
```bash
pnpm --filter squash dev
# Opens at http://localhost:5175
```

### Squish (Image Compressor) - Port 5176

**Features to Test:**

| Feature | Test Steps |
|---------|------------|
| Image Upload | Drop/click to upload JPEG, PNG, WebP, AVIF |
| Format Conversion | Convert between formats |
| Quality Settings | Adjust quality slider |
| Batch Processing | Upload multiple images → Process all |
| Before/After Compare | Check comparison slider works |
| Download | Individual download + ZIP download |

**Start Squish Dev Server:**
```bash
pnpm --filter squish dev
# Opens at http://localhost:5176
```

### Swirl (GIF Toolkit) - Port 5177

**Features to Test (8 tools):**

| Tool | Route | Manual Test Steps |
|------|-------|-------------------|
| Video to GIF | `/video-to-gif` | Upload video → Set options → Convert |
| GIF Maker | `/make` | Upload images → Set frame rate → Create |
| Optimize | `/optimize` | Upload GIF → Choose preset → Optimize |
| Add Text | `/text` | Upload GIF → Add caption → Apply |
| Combine GIFs | `/combine` | Upload 2+ GIFs → Merge → Download |
| Resize | `/resize` | Upload GIF → Set dimensions → Resize |
| Crop | `/crop` | Upload GIF → Drag crop area → Apply |
| Reverse | `/reverse` | Upload GIF → Reverse → Download |

**Start Swirl Dev Server:**
```bash
pnpm --filter swirl dev
# Opens at http://localhost:5177
```

## ✅ Automated Test Coverage

### Unit Tests (`tests/unit/`)

| File | Tests |
|------|-------|
| `format.test.ts` | `formatBytes`, `formatPercent`, `formatDuration` |
| `validation.test.ts` | Valibot schemas, validation helpers |

### E2E Tests (`tests/e2e/`)

| File | Coverage |
|------|----------|
| `homepage.spec.ts` | Homepage load, navigation, tool cards |
| `ux-quality.spec.ts` | Responsive design, accessibility, dark mode |
| `neutron-features.spec.ts` | Feature verification across all apps |

## 🔍 Manual Testing Checklist

### Core Functionality
- [ ] File upload via drag & drop
- [ ] File upload via click to browse
- [ ] Multiple file selection where applicable
- [ ] Processing progress indicator
- [ ] Download individual files
- [ ] Download as ZIP (batch)
- [ ] Clear/remove files

### Privacy Verification
- [ ] Open Network tab in DevTools
- [ ] Process a file
- [ ] Verify NO external uploads (only localhost requests)
- [ ] All processing happens in browser (check WASM usage)

### PWA Features
- [ ] Install app as PWA (Chrome: three dots → Install)
- [ ] Test offline mode (disconnect network → app still works)
- [ ] Check manifest.json loads correctly

### Responsive Design
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

### Accessibility
- [ ] Tab navigation works
- [ ] Focus indicators visible
- [ ] Screen reader announces content
- [ ] Color contrast sufficient

## 🐛 Known Issues

### Dev Server SSR Errors
During rapid E2E test execution, the SvelteKit dev server may return intermittent 500 errors. This is a development environment issue and does not affect production builds.

**Workaround:** Run tests with retries or test against production builds:
```bash
# Build and preview production
pnpm build
pnpm --filter smash preview

# Then run tests against preview server
```

## 📊 Test Results Summary

Run `pnpm test:e2e` to see current test status:

```
UX Quality Tests: 20 tests
Feature Tests: ~15 tests (some skipped for other apps)
Homepage Tests: 12 tests
```

## 🚀 CI/CD Testing

For CI environments, tests are configured in `playwright.config.ts`:
- Retries: 2 (on CI)
- Workers: 1 (sequential to avoid race conditions)
- Screenshots: On failure
- Video: On failure

```bash
# CI command
CI=true pnpm test:e2e
```
