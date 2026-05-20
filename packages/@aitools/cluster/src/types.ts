/**
 * @aitools/cluster - Type definitions
 *
 * Core types and interfaces for the headless browser pool cluster.
 */

export interface BrowserConfig {
  /** Pool size: 10-100 concurrent browsers */
  poolSize: number;
  /** Page timeout in milliseconds (default: 30000ms) */
  timeout: number;
  /** Chrome/Chromium executable path (auto-detect if not provided) */
  executablePath?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Launch args for Chrome */
  launchArgs?: string[];
}

export interface RenderOptions {
  /** URL to render */
  url: string;
  /** Viewport dimensions */
  viewport?: {
    width: number;
    height: number;
  };
  /** Wait until condition: 'load', 'domcontentloaded', 'networkidle0', 'networkidle2' */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
  /** Additional headers to send */
  headers?: Record<string, string>;
  /** User agent string */
  userAgent?: string;
  /** Emulate device (mobile, etc) */
  emulateDevice?: string;
  /** CSS media type to emulate */
  mediaType?: 'screen' | 'print';
}

export interface ScreenshotOptions extends RenderOptions {
  /** Image format: jpeg, png, webp */
  format?: 'jpeg' | 'png' | 'webp';
  /** Image quality 0-100 (for jpeg/webp) */
  quality?: number;
  /** Capture full page */
  fullPage?: boolean;
}

export interface PDFOptions extends RenderOptions {
  /** Paper format: letter, a4, etc */
  format?: string;
  /** Page margins */
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  /** Print background graphics */
  printBackground?: boolean;
  /** Scale factor 0.1-2 */
  scale?: number;
}

export interface HTMLOptions extends RenderOptions {
  /** Keep inline styles */
  keepStyles?: boolean;
  /** Remove scripts */
  removeScripts?: boolean;
}

export interface RenderResult<T = Buffer> {
  /** Render status: success, timeout, error, retry */
  status: 'success' | 'timeout' | 'error' | 'retry' | 'circuit_open';
  /** Rendered content (buffer or string) */
  content?: T;
  /** Original URL */
  url: string;
  /** Latency in milliseconds */
  latency: number;
  /** Error message if failed */
  error?: string;
  /** Retry count (0 if first attempt) */
  retries: number;
  /** Timestamp of completion */
  timestamp: number;
}

export interface BrowserPoolStats {
  /** Total browsers in pool */
  totalBrowsers: number;
  /** Available browsers */
  availableBrowsers: number;
  /** Browsers in use */
  busyBrowsers: number;
  /** Total pages rendered */
  totalPages: number;
  /** Total failures */
  failedPages: number;
  /** Total retries */
  totalRetries: number;
  /** Average latency in ms */
  avgLatency: number;
  /** P50 latency (median) */
  p50Latency: number;
  /** P99 latency */
  p99Latency: number;
  /** Circuit breaker status: open, closed */
  circuitStatus: 'open' | 'closed';
  /** Memory usage in bytes */
  memoryUsage: number;
}

export interface TaskQueueJob {
  /** Unique job ID */
  id: string;
  /** Job type: screenshot, pdf, html */
  type: 'screenshot' | 'pdf' | 'html';
  /** URL to process */
  url: string;
  /** Render options */
  options: RenderOptions;
  /** Priority level 0-10 (higher = more priority) */
  priority: number;
  /** Current retry count */
  retryCount: number;
  /** Max retries allowed */
  maxRetries: number;
  /** Job created timestamp */
  createdAt: number;
  /** Job started timestamp */
  startedAt?: number;
  /** Job completed timestamp */
  completedAt?: number;
  /** Job status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
  /** Error details if failed */
  error?: {
    message: string;
    code: string;
    retryable: boolean;
  };
  /** Completion callback */
  resolve?: (result: RenderResult) => void;
  /** Error callback */
  reject?: (error: Error) => void;
}

export interface CircuitBreakerState {
  /** Circuit state: closed (normal), open (failing), half-open (recovering) */
  state: 'closed' | 'open' | 'half-open';
  /** Failure count in current window */
  failureCount: number;
  /** Success count in current window */
  successCount: number;
  /** Timestamp of state change */
  lastStateChange: number;
  /** Failure rate 0.0-1.0 */
  failureRate: number;
}

export interface MetricsSnapshot {
  /** Timestamp of snapshot */
  timestamp: number;
  /** Latencies recorded in this window (ms) */
  latencies: number[];
  /** Error count in window */
  errorCount: number;
  /** Success count in window */
  successCount: number;
  /** Retry count in window */
  retryCount: number;
  /** Circuit state */
  circuitState: 'closed' | 'open' | 'half-open';
}

export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  component: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface ErrorClassification {
  message: string;
  code: string;
  /** Can this error be retried? */
  retryable: boolean;
  /** Error category */
  category: 'network' | 'timeout' | 'browser_crash' | 'invalid_input' | 'permission' | 'unknown';
}
