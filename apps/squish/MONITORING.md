# Monitoring & Error Tracking

Enterprise-grade monitoring infrastructure for Squish.

## 🎯 Features

### 1. **Error Monitoring (Sentry)**

- Automatic error capture and stack traces
- Privacy-safe (strips auth headers, cookies)
- Session replay for debugging
- Breadcrumb tracking for context

### 2. **Performance Monitoring**

- Operation timing and metrics
- Slow operation detection (>1s warning)
- Performance transaction tracking
- Custom measurement API

### 3. **Memory Leak Detection**

- Automatic heap monitoring
- Blob URL leak detection
- Memory growth warnings
- High memory usage alerts

## 🚀 Setup

### 1. Configure Sentry (Optional)

Create a `.env` file:

```bash
# Get your DSN from https://sentry.io
PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
PUBLIC_ENVIRONMENT=production
```

### 2. Environment Variables

- `PUBLIC_SENTRY_DSN`: Sentry project DSN (required for error tracking)
- `PUBLIC_ENVIRONMENT`: `development` or `production`

**Without Sentry DSN:** App works normally, monitoring logs to console only.

## 📊 Usage

### Error Capture

```typescript
import { captureError, captureMessage } from '$lib/utils/monitoring';

try {
	await riskyOperation();
} catch (error) {
	captureError(error as Error, {
		context: 'image-processing',
		imageId: '123',
	});
}

// Or capture a message
captureMessage('User reached batch limit', 'warning');
```

### Performance Monitoring

```typescript
import { perfMonitor } from '$lib/utils/monitoring';

// Manual timing
perfMonitor.start('image-compression');
await compressImage(file);
perfMonitor.end('image-compression', { fileSize: file.size });

// Or wrap async operations
const result = await perfMonitor.measure('batch-processing', () => processBatch(files), {
	count: files.length,
});
```

### Memory Monitoring

```typescript
import { memoryMonitor } from '$lib/utils/memory-monitor';

// Take snapshots
memoryMonitor.takeSnapshot(imageStore.items.length);

// Track blob URLs
const url = URL.createObjectURL(blob);
memoryMonitor.registerBlobUrl(url);

// Clean up
memoryMonitor.revokeBlobUrl(url);

// Get stats
const stats = memoryMonitor.getStats();
console.log('Memory usage:', stats.current.usagePercent);
```

## 🔍 Automatic Monitoring

### Error Tracking

- **Client errors**: Caught via Sentry hooks
- **Unhandled promises**: Automatically captured
- **Network failures**: Filtered (user offline scenarios)

### Performance

- Slow operations (>1s) automatically flagged
- Breadcrumbs added for all measurements
- Production: 10% sampling rate

### Memory

- Auto-starts in production
- Checks every 30 seconds
- Warnings triggered for:
  - 50MB+ growth in 5 checks
  - > 80% heap usage
  - > 100 unreleased blob URLs

## 📈 Metrics Tracked

### Errors

- Error rate by type
- Stack traces and context
- User actions leading to error
- Browser and device info

### Performance

- Image compression time
- Batch processing duration
- Worker pool efficiency
- ZIP generation time
- WASM codec load time

### Memory

- Heap size usage
- Blob URL count
- Image item count
- Memory growth rate

## 🛠️ Development vs Production

### Development

- All errors logged to console
- 100% transaction sampling
- Detailed performance logs
- Memory snapshots logged

### Production

- Errors sent to Sentry
- 10% transaction sampling
- Silent operation (no console spam)
- Automatic memory monitoring

## 🚨 Alerts

Configure Sentry alerts for:

1. **High Error Rate**

   - > 10 errors per minute
   - Email/Slack notification

2. **Memory Warnings**

   - > 80% heap usage
   - > 100 unreleased blobs

3. **Performance Degradation**

   - > 1000ms average compression time
   - > 5s batch processing

4. **Availability**
   - > 5% error rate
   - Multiple users affected

## 📊 Dashboard Metrics

Key metrics to track in Sentry:

1. **Error Volume**

   - Total errors
   - Errors by type
   - Affected users

2. **Performance**

   - P50, P75, P95, P99 latency
   - Apdex score
   - Throughput (ops/sec)

3. **Memory**

   - Average heap usage
   - Leak frequency
   - Blob URL count

4. **Browser Coverage**
   - Chrome/Firefox/Safari breakdown
   - Mobile vs desktop
   - Version distribution

## 🔧 Troubleshooting

### "Monitoring not initialized"

- Check `PUBLIC_SENTRY_DSN` is set
- Verify hooks are loaded (`hooks.client.ts`, `hooks.server.ts`)
- Check browser console for init errors

### Memory API Not Available

- Memory monitoring only works in Chrome/Edge
- Safari/Firefox: falls back to manual tracking
- No impact on app functionality

### High Memory Usage

1. Check blob URL count: `memoryMonitor.getStats()`
2. Revoke old URLs: `memoryMonitor.revokeAllBlobUrls()`
3. Clear image store: `images.clearAll()`
4. Verify workers are terminated properly

### Sentry Not Receiving Events

1. Verify DSN is correct
2. Check network tab for blocked requests
3. Ensure app is deployed (not localhost)
4. Check Sentry project settings

## 💰 Cost Optimization

### Sentry Quotas

- **Errors**: 5K/month (free tier)
- **Transactions**: 10K/month (free tier)
- **Replays**: 50/month (free tier)

### Tips

1. Lower sampling rates in production:

   ```typescript
   tracesSampleRate: 0.05, // 5% instead of 10%
   ```

2. Filter noisy errors:

   ```typescript
   ignoreErrors: ['ResizeObserver', 'Non-Error promise rejection'];
   ```

3. Use breadcrumbs instead of transactions for internal metrics

## 🔐 Privacy

### Data Collected

- Error messages and stack traces
- Performance metrics (timing only)
- Memory usage statistics
- User actions (clicks, navigations)

### Data NOT Collected

- Image file contents
- Personal user data
- Authentication tokens
- Cookie values

### GDPR Compliance

- No PII collected by default
- Session replay can be disabled
- User IP anonymization enabled
- Data retention: 90 days

## 🎓 Best Practices

1. **Use Context**: Always provide context when capturing errors
2. **Set User ID**: Set user ID after authentication for better tracking
3. **Revoke Blobs**: Always revoke blob URLs when done
4. **Measure Critical Paths**: Focus on user-facing operations
5. **Review Weekly**: Check Sentry dashboard weekly for trends

## 📚 Further Reading

- [Sentry Docs](https://docs.sentry.io/)
- [Chrome Memory Profiling](https://developer.chrome.com/docs/devtools/memory-problems/)
- [Web Performance APIs](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
