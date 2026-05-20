# @aitools/cluster

**High-performance concurrent rendering engine for agent orchestration**

A headless browser pool (50–100 concurrent instances) for rendering web pages to screenshots, PDFs, and HTML with realistic performance targets, graceful failure recovery, and production-grade reliability.

## Features

✅ **Browser Pool** — 50–100 concurrent Chromium/Chrome instances with LRU eviction  
✅ **Async Coordinator** — Task queue, load balancing, resource tracking  
✅ **Failure Recovery** — Circuit breaker, exponential backoff with jitter, automatic retry  
✅ **Multiple Formats** — Screenshots (PNG/JPEG/WebP), PDFs, HTML extraction  
✅ **Realistic Metrics** — p50 latency 300–400ms, p99 <1s, 50K+ pages/hour  
✅ **CLI + Node API** — Both command-line and programmatic interfaces  
✅ **Production-Ready** — Comprehensive logging, error handling, timeout management  

## Installation

```bash
npm install @aitools/cluster
# or
yarn add @aitools/cluster
# or
pnpm add @aitools/cluster
```

**Requires Node.js 18+** and Chromium/Chrome installed (or specify with `executablePath`).

## Quick Start

### CLI Usage

```bash
# Render screenshots from URLs
npx @aitools/cluster screenshot \
  --input urls.txt \
  --output screenshots/ \
  --workers 50 \
  --timeout 30000

# Generate PDFs
npx @aitools/cluster pdf \
  --input urls.txt \
  --output pdfs/ \
  --workers 100

# Extract HTML
npx @aitools/cluster html \
  --input urls.txt \
  --output html/
```

**Input file format** (`urls.txt`):
```
https://example.com
https://example.org
https://example.net
# Comments are ignored
```

**Output**:
- Rendered files in `--output` directory
- `results.json` with metadata and statistics

### Node.js API

```typescript
import { Cluster } from '@aitools/cluster';

const cluster = new Cluster({
  poolSize: 50,        // 10–100 concurrent browsers
  timeout: 30000,      // Page timeout in ms
  debug: false,        // Enable debug logging
});

// Render screenshots
const screenshots = await cluster.screenshot([
  {
    url: 'https://example.com',
    viewport: { width: 1280, height: 720 },
    format: 'png',
    quality: 80,
  },
  {
    url: 'https://example.org',
    waitUntil: 'networkidle2',
  },
]);

// Handle results
for (const result of screenshots) {
  if (result.status === 'success') {
    console.log(`✓ ${result.url} (${result.latency}ms)`);
    // result.content is a Buffer with PNG data
  } else {
    console.error(`✗ ${result.url}: ${result.error}`);
  }
}

// Generate PDFs
const pdfs = await cluster.pdf({
  url: 'https://example.com',
  format: 'A4',
  margin: { top: 20, right: 20, bottom: 20, left: 20 },
});

// Extract HTML
const html = await cluster.html({
  url: 'https://example.com',
  removeScripts: true,
});

// Get statistics
const stats = cluster.getStats();
console.log(`p50 latency: ${stats.p50Latency}ms`);
console.log(`p99 latency: ${stats.p99Latency}ms`);
console.log(`Circuit status: ${stats.circuitStatus}`);

// Shutdown when done
await cluster.shutdown();
```

## API Reference

### Cluster Configuration

```typescript
interface BrowserConfig {
  poolSize: number;           // 10–100 (default: 50)
  timeout: number;            // ms per page (default: 30000)
  executablePath?: string;    // Chrome/Chromium path (auto-detect)
  debug?: boolean;            // Enable logging (default: false)
  launchArgs?: string[];      // Extra Chrome flags
}
```

### Screenshot Options

```typescript
interface ScreenshotOptions {
  url: string;
  viewport?: { width: number; height: number };
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;           // 0–100 (for jpeg/webp)
  fullPage?: boolean;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
  headers?: Record<string, string>;
  userAgent?: string;
}
```

### PDF Options

```typescript
interface PDFOptions {
  url: string;
  format?: string;            // 'letter', 'a4', etc.
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  printBackground?: boolean;
  scale?: number;             // 0.1–2.0
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
}
```

### HTML Options

```typescript
interface HTMLOptions {
  url: string;
  removeScripts?: boolean;
  keepStyles?: boolean;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
}
```

### Result Type

```typescript
interface RenderResult<T = Buffer> {
  status: 'success' | 'timeout' | 'error' | 'retry' | 'circuit_open';
  content?: T;
  url: string;
  latency: number;            // ms
  error?: string;
  retries: number;            // 0 if first attempt
  timestamp: number;
}
```

### Statistics

```typescript
const stats = cluster.getStats();
// {
//   totalBrowsers: 50,
//   availableBrowsers: 35,
//   busyBrowsers: 15,
//   totalPages: 1000,
//   failedPages: 5,
//   totalRetries: 3,
//   avgLatency: 350,
//   p50Latency: 320,
//   p99Latency: 950,
//   circuitStatus: 'closed',    // 'closed' | 'open' | 'half-open'
//   memoryUsage: 2147483648,
// }
```

## Performance Targets

Realistic benchmarks with single instance:

| Metric | Target |
|--------|--------|
| p50 latency | 300–400ms |
| p99 latency | 1000ms |
| Throughput | 50K+ pages/hour |
| Memory per browser | 50–100MB |
| Failure recovery | <5 seconds |
| Max concurrent browsers | 50–100 |

**Example**: 1000 pages with 50 workers = ~2 minutes

```
1000 pages / (50 workers * 20 pages/min per worker) ≈ 1 minute
```

## Failure Recovery

### Circuit Breaker

Stops accepting new tasks if >80% fail in a 10-second window:

- **Closed** (normal): accepting requests
- **Open** (failing): rejecting requests with 429 status
- **Half-open** (recovering): testing recovery after 30s wait

### Retry Logic

Exponential backoff with jitter:

```
delay = min(100ms * 2^attempt + jitter, 30000ms)
```

**Retryable errors**:
- Network timeouts
- Connection resets
- Browser crashes

**Non-retryable errors**:
- Invalid URLs
- 4xx/5xx HTTP errors (most)
- Permission denied

### Max Retries

3 attempts per task before failure.

## CLI Exit Codes

- `0` — Success (all pages rendered)
- `1` — Failure (most/all pages failed)
- `2` — Partial failure (some pages rendered, some failed)

## Configuration Examples

### Low latency (10 workers, short timeout)

```typescript
const cluster = new Cluster({
  poolSize: 10,
  timeout: 10000,  // 10 seconds
});
```

### High throughput (100 workers, standard timeout)

```typescript
const cluster = new Cluster({
  poolSize: 100,
  timeout: 30000,  // 30 seconds
});
```

### Custom Chrome path

```typescript
const cluster = new Cluster({
  poolSize: 50,
  executablePath: '/usr/bin/chromium-browser',
});
```

### Debug mode

```typescript
const cluster = new Cluster({
  poolSize: 50,
  debug: true,  // Logs all operations
});
```

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

**Test Coverage**:
- Pool scaling (10 → 50 → 100 browsers)
- Browser crash recovery
- Timeout handling
- Retry logic
- Metrics tracking
- Circuit breaker
- 50+ test cases total

## Roadmap (v0.2+)

- [ ] Multi-region orchestration
- [ ] Advanced ML-based scheduling
- [ ] WASM rendering engine
- [ ] GraphQL API
- [ ] Prometheus metrics export
- [ ] VS Code extension integration

## Constraints & Design

**v0.1 MVP scope**:
- Single instance, single region (no multi-region clustering)
- 50–100 concurrent browsers per instance (realistic limits)
- Realistic latency targets (p50 300–400ms, p99 1000ms)
- Graceful failure recovery (circuit breaker + exponential backoff)
- Production-ready error handling and logging

**v0.2+ deferred**:
- Multi-region load balancing
- Advanced scheduling algorithms
- WASM rendering fallback
- Team dashboard & analytics

## Troubleshooting

### "Chrome not found"

Install Chromium:
```bash
# Ubuntu/Debian
sudo apt-get install chromium-browser

# macOS
brew install chromium

# Or specify path
new Cluster({ executablePath: '/path/to/chrome' })
```

### "Circuit breaker open"

Too many failures (>80% in last 10s). Wait 30s for recovery or fix the root cause.

### "Out of memory"

Reduce `poolSize` or increase system memory. Each browser uses 50–100MB.

### Page timeout

Increase `timeout` option or optimize page for faster loading.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md)

## License

MIT — See [LICENSE](../../LICENSE)

## Acknowledgments

Built with [Puppeteer](https://pptr.dev) and inspired by production rendering systems.
