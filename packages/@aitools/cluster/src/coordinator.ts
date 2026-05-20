/// <reference types="node" />

/**
 * @aitools/cluster - Coordinator
 *
 * Async task coordinator managing render jobs, load balancing across browser pool,
 * resource allocation, and metrics collection.
 */

import { EventEmitter } from 'events';
import { BrowserPool } from './pool';
import { TaskQueue } from './queue';
import { PuppeteerRenderer } from './puppeteer';
import { MetricsCollector } from './metrics';
import { RetryStrategy, ErrorClassifier, CircuitBreaker } from './recovery';
import {
  BrowserConfig,
  ScreenshotOptions,
  PDFOptions,
  HTMLOptions,
  RenderResult,
  BrowserPoolStats,
  TaskQueueJob,
} from './types';

export class Coordinator extends EventEmitter {
  private pool: BrowserPool;
  private queue: TaskQueue;
  private renderer: PuppeteerRenderer;
  private metrics: MetricsCollector;
  private retryStrategy: RetryStrategy;
  private circuitBreaker: CircuitBreaker;
  private processingJobs: Set<string> = new Set();
  private initialized = false;
  private config: BrowserConfig;
  private debug: boolean;

  constructor(config: BrowserConfig) {
    super();
    this.config = config;
    this.debug = config.debug || false;
    this.pool = new BrowserPool(config);
    this.queue = new TaskQueue();
    this.renderer = new PuppeteerRenderer(config.timeout, this.debug);
    this.metrics = new MetricsCollector();
    this.retryStrategy = new RetryStrategy(3, 100, 30000);
    this.circuitBreaker = new CircuitBreaker(80, 10000, 30000);
  }

  /**
   * Initialize coordinator
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.pool.initialize();
    this.initialized = true;

    if (this.debug) {
      console.log('[Coordinator] Initialized');
    }
  }

  /**
   * Render screenshot(s)
   */
  async screenshot(
    options: ScreenshotOptions | ScreenshotOptions[]
  ): Promise<RenderResult<Buffer>[]> {
    const optionsArray = Array.isArray(options) ? options : [options];
    const results: RenderResult<Buffer>[] = [];

    const promises = optionsArray.map(async (opt) => {
      const result = await this.render('screenshot', opt);
      results.push(result);
      return result;
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Render PDF(s)
   */
  async pdf(
    options: PDFOptions | PDFOptions[]
  ): Promise<RenderResult<Buffer>[]> {
    const optionsArray = Array.isArray(options) ? options : [options];
    const results: RenderResult<Buffer>[] = [];

    const promises = optionsArray.map(async (opt) => {
      const result = await this.render('pdf', opt);
      results.push(result);
      return result;
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Render HTML
   */
  async html(
    options: HTMLOptions | HTMLOptions[]
  ): Promise<RenderResult<string>[]> {
    const optionsArray = Array.isArray(options) ? options : [options];
    const results: RenderResult<string>[] = [];

    const promises = optionsArray.map(async (opt) => {
      const result = await this.render('html', opt);
      results.push(result);
      return result;
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Internal render implementation with retries
   */
  private async render(
    type: 'screenshot' | 'pdf' | 'html',
    options: ScreenshotOptions | PDFOptions | HTMLOptions,
    attemptNumber = 0
  ): Promise<RenderResult> {
    const startTime = Date.now();
    const jobId = `render_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Check circuit breaker
      if (this.circuitBreaker.isOpen()) {
        this.metrics.recordError();
        return {
          status: 'circuit_open',
          url: options.url,
          latency: Date.now() - startTime,
          retries: attemptNumber,
          timestamp: Date.now(),
          error: 'Circuit breaker is open - service temporarily unavailable',
        };
      }

      // Acquire browser
      const browser = await this.pool.acquire();
      this.processingJobs.add(jobId);

      let content: Buffer | string | undefined;

      try {
        // Render based on type
        if (type === 'screenshot') {
          content = await this.renderer.screenshot(
            browser,
            options as ScreenshotOptions
          );
        } else if (type === 'pdf') {
          content = await this.renderer.pdf(browser, options as PDFOptions);
        } else {
          content = await this.renderer.html(browser, options as HTMLOptions);
        }

        // Record success
        const latency = Date.now() - startTime;
        this.metrics.recordSuccess(latency);
        this.circuitBreaker.recordSuccess();

        return {
          status: 'success',
          content,
          url: options.url,
          latency,
          retries: attemptNumber,
          timestamp: Date.now(),
        };
      } catch (error) {
        this.pool.recordCrash(browser);
        throw error;
      } finally {
        await this.pool.release(browser);
        this.processingJobs.delete(jobId);
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      const classification = ErrorClassifier.classify(errorMsg);

      this.metrics.recordError();
      this.circuitBreaker.recordFailure();

      // Check if should retry
      if (this.retryStrategy.shouldRetry(errorMsg, attemptNumber)) {
        this.metrics.recordRetry();
        await this.retryStrategy.wait(attemptNumber);

        if (this.debug) {
          console.log(`[Coordinator] Retrying ${options.url} (attempt ${attemptNumber + 1})`);
        }

        return this.render(type, options, attemptNumber + 1);
      }

      return {
        status: attemptNumber > 0 ? 'error' : 'error',
        url: options.url,
        latency,
        error: errorMsg,
        retries: attemptNumber,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get coordinator statistics
   */
  getStats(): BrowserPoolStats {
    const poolStats = this.pool.getStats();
    const metricsSnapshot = this.metrics.getSnapshot();
    const circuitState = this.metrics.getCircuitState();

    return {
      totalBrowsers: poolStats.totalBrowsers,
      availableBrowsers: poolStats.availableBrowsers,
      busyBrowsers: poolStats.busyBrowsers,
      totalPages: metricsSnapshot.successCount,
      failedPages: metricsSnapshot.errorCount,
      totalRetries: metricsSnapshot.retryCount,
      avgLatency: this.metrics.getAverageLatency(),
      p50Latency: this.metrics.getPercentileLatency(50),
      p99Latency: this.metrics.getPercentileLatency(99),
      circuitStatus: circuitState.state,
      memoryUsage: process.memoryUsage().heapUsed,
    };
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return this.queue.getStats();
  }

  /**
   * Shutdown coordinator
   */
  async shutdown(): Promise<void> {
    // Wait for processing jobs to complete
    const timeout = setTimeout(() => {
      console.warn('[Coordinator] Shutdown timeout - forcing close');
    }, 10000);

    while (this.processingJobs.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    clearTimeout(timeout);

    await this.pool.shutdown();
    this.initialized = false;

    if (this.debug) {
      console.log('[Coordinator] Shutdown complete');
    }
  }
}
