# Testing Guide

Comprehensive testing strategy for Squish image compressor.

## Test Coverage

### Unit Tests (Vitest)

- **24 tests** covering core utilities and state management
- Test files: `src/**/*.test.ts`
- Coverage: compress utils, images store, download utils

```bash
# Run unit tests
pnpm test

# Watch mode
pnpm test --watch

# Coverage report
pnpm test:coverage

# UI mode
pnpm test:ui
```

### E2E Tests (Playwright)

- **8 test scenarios** across 5 browsers (Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari)
- Test files: `e2e/**/*.spec.ts`
- Coverage: basic flows, accessibility, responsiveness

```bash
# Run E2E tests
pnpm test:e2e

# Interactive UI mode
pnpm test:e2e:ui

# Debug mode (step through tests)
pnpm test:e2e:debug

# Run specific browser only
pnpm test:e2e --project=chromium
```

## Test Scenarios

### Unit Tests

1. **Filename Generation**

   - Template token replacement
   - Custom filename patterns
   - Extension mapping

2. **Settings Management**

   - Quality presets
   - Format selection
   - Resize configuration
   - Target size mode

3. **Download Utils**
   - File System Access API detection
   - Browser capability checking

### E2E Tests

1. **Homepage Load**

   - Hero section visibility
   - Drop zone rendering
   - Format badges display

2. **Settings Panel**

   - Quality preset interaction
   - Advanced options toggle
   - Format selection

3. **Sample Images**

   - Demo image cards
   - Interactive sample loading

4. **Keyboard Shortcuts**

   - Shortcut popover
   - Keyboard navigation

5. **Accessibility**

   - ARIA labels
   - Keyboard navigation
   - Focus management

6. **Mobile Responsiveness**
   - Touch-friendly UI
   - Proper viewport sizing
   - Mobile-optimized layout

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run unit tests
        run: pnpm test --run

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

## Writing New Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { yourFunction } from './your-module';

describe('your module', () => {
	it('should do something', () => {
		const result = yourFunction('input');
		expect(result).toBe('expected');
	});
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should perform user action', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: /action/i }).click();
	await expect(page.getByText(/success/i)).toBeVisible();
});
```

## Mocking

### Unit Tests

- `localStorage` - Mocked in `src/tests/setup.ts`
- Web APIs - `matchMedia`, `vibrate`, `showDirectoryPicker`, `Worker`
- Environment: `happy-dom` (lightweight DOM implementation)

### E2E Tests

- Tests run against real dev server (port 5176)
- No mocking - tests real browser behavior
- File upload requires special handling (see Playwright docs)

## Best Practices

1. **Unit Tests**

   - Test pure functions and business logic
   - Mock external dependencies
   - Keep tests fast (<100ms each)

2. **E2E Tests**

   - Test critical user flows
   - Verify real browser behavior
   - Test across multiple browsers
   - Keep tests independent and idempotent

3. **Test Organization**

   - Group related tests with `describe`
   - Use descriptive test names
   - Setup/teardown in `beforeEach`/`afterEach`

4. **Assertions**
   - One logical assertion per test
   - Use specific matchers (`toBe`, `toEqual`, `toContain`)
   - Test both success and error paths

## Troubleshooting

### Unit Tests Failing

- Check mock setup in `src/tests/setup.ts`
- Verify imports are correct
- Clear Vitest cache: `pnpm vitest --clearCache`

### E2E Tests Failing

- Ensure dev server is running on port 5176
- Check browser compatibility
- Update Playwright browsers: `pnpm exec playwright install`
- View test report: `pnpm exec playwright show-report`

### Slow Tests

- Unit tests: Check for unnecessary async operations
- E2E tests: Reduce wait times, use `waitForSelector` strategically

## Performance Benchmarks

- Unit tests: All tests complete in <1s
- E2E tests (single browser): <30s
- E2E tests (all browsers): <2min

## Future Improvements

- [ ] Add visual regression testing (Playwright screenshots)
- [ ] Increase coverage to 80%+
- [ ] Add performance benchmarks (Lighthouse CI)
- [ ] Test file upload with actual images
- [ ] Add load testing for batch processing
- [ ] Test offline PWA functionality
