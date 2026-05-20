/**
 * @aitools/cluster - Browser Pool Manager
 *
 * Manages a pool of 50-100 concurrent browser instances with LRU eviction,
 * auto-respawn on crash, and connection state tracking.
 */

import * as puppeteer from 'puppeteer';
import { BrowserConfig, RenderResult, ScreenshotOptions, PDFOptions, HTMLOptions } from './types';

interface BrowserInstance {
  id: string;
  browser: puppeteer.Browser;
  pages: Map<string, puppeteer.Page>;
  inUse: boolean;
  lastUsed: number;
  createdAt: number;
  crashCount: number;
}

export class BrowserPool {
  private pool: Map<string, BrowserInstance> = new Map();
  private poolSize: number;
  private timeout: number;
  private launchArgs: string[];
  private executablePath?: string;
  private browserCounter = 0;
  private debug: boolean;
  private readonly minPoolSize = 10;
  private readonly maxPoolSize = 100;

  constructor(config: BrowserConfig) {
    if (config.poolSize < this.minPoolSize || config.poolSize > this.maxPoolSize) {
      throw new Error(`Pool size must be between ${this.minPoolSize} and ${this.maxPoolSize}`);
    }

    this.poolSize = config.poolSize;
    this.timeout = config.timeout || 30000;
    this.executablePath = config.executablePath;
    this.launchArgs = config.launchArgs || [];
    this.debug = config.debug || false;

    if (this.debug) {
      console.log(`[BrowserPool] Initializing with ${this.poolSize} workers`);
    }
  }

  /**
   * Initialize the browser pool by spawning initial browsers
   */
  async initialize(): Promise<void> {
    // Start with half the pool size initially for faster startup
    const initialSize = Math.ceil(this.poolSize / 2);

    const promises: Promise<void>[] = [];
    for (let i = 0; i < initialSize; i++) {
      promises.push(this.spawnBrowser());
    }

    await Promise.all(promises);

    if (this.debug) {
      console.log(`[BrowserPool] Initialized with ${this.pool.size} browsers`);
    }
  }

  /**
   * Spawn a new browser instance
   */
  private async spawnBrowser(): Promise<void> {
    try {
      const browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process=false',
          '--disable-web-resources',
          '--disable-sync',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-first-run',
          '--no-default-browser-check',
          ...this.launchArgs,
        ],
        executablePath: this.executablePath,
      });

      const id = `browser_${++this.browserCounter}`;
      const instance: BrowserInstance = {
        id,
        browser,
        pages: new Map(),
        inUse: false,
        lastUsed: Date.now(),
        createdAt: Date.now(),
        crashCount: 0,
      };

      this.pool.set(id, instance);

      // Monitor for unexpected disconnection
      browser.once('disconnected', async () => {
        this.pool.delete(id);
        if (this.debug) {
          console.log(`[BrowserPool] Browser ${id} disconnected`);
        }

        // Auto-respawn if pool is below target size
        if (this.pool.size < this.poolSize) {
          await this.spawnBrowser();
        }
      });

      if (this.debug) {
        console.log(`[BrowserPool] Spawned browser ${id}`);
      }
    } catch (error) {
      console.error('[BrowserPool] Failed to spawn browser:', error);
      throw error;
    }
  }

  /**
   * Acquire a browser instance from pool
   */
  async acquire(): Promise<puppeteer.Browser> {
    // Find an available browser
    let instance = Array.from(this.pool.values()).find((b) => !b.inUse);

    // If no available browsers, spawn a new one (up to pool size)
    if (!instance) {
      if (this.pool.size < this.poolSize) {
        await this.spawnBrowser();
        instance = Array.from(this.pool.values()).find((b) => !b.inUse);
      }
    }

    // If still no browser, evict least recently used (LRU)
    if (!instance) {
      const lruInstance = Array.from(this.pool.values()).sort(
        (a, b) => a.lastUsed - b.lastUsed
      )[0];

      if (lruInstance) {
        await this.evict(lruInstance.id);
        await this.spawnBrowser();
        instance = Array.from(this.pool.values()).find((b) => !b.inUse);
      }
    }

    if (!instance) {
      throw new Error('Failed to acquire browser instance');
    }

    instance.inUse = true;
    instance.lastUsed = Date.now();

    return instance.browser;
  }

  /**
   * Release a browser instance back to pool
   */
  async release(browser: puppeteer.Browser): Promise<void> {
    const instance = Array.from(this.pool.values()).find((b) => b.browser === browser);

    if (instance) {
      instance.inUse = false;
      instance.lastUsed = Date.now();

      // Clean up any leftover pages
      const pages = await browser.pages();
      for (const page of pages) {
        if (!page.isClosed()) {
          try {
            await page.close();
          } catch (error) {
            // Page may already be closed
          }
        }
      }
    }
  }

  /**
   * Evict (close) a browser instance
   */
  private async evict(browserId: string): Promise<void> {
    const instance = this.pool.get(browserId);

    if (instance) {
      try {
        // Close all pages
        const pages = await instance.browser.pages();
        for (const page of pages) {
          try {
            await page.close();
          } catch (error) {
            // Ignore
          }
        }

        // Close browser
        await instance.browser.close();
      } catch (error) {
        // Already closed
      }

      this.pool.delete(browserId);

      if (this.debug) {
        console.log(`[BrowserPool] Evicted browser ${browserId}`);
      }
    }
  }

  /**
   * Record browser crash
   */
  recordCrash(browser: puppeteer.Browser): void {
    const instance = Array.from(this.pool.values()).find((b) => b.browser === browser);

    if (instance) {
      instance.crashCount++;

      // If browser crashes 3+ times, evict it
      if (instance.crashCount >= 3) {
        this.evict(instance.id).catch(console.error);
      }
    }
  }

  /**
   * Shutdown pool cleanly
   */
  async shutdown(): Promise<void> {
    const promises = Array.from(this.pool.keys()).map((id) => this.evict(id));
    await Promise.all(promises);

    if (this.debug) {
      console.log('[BrowserPool] Shutdown complete');
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    const instances = Array.from(this.pool.values());
    const busyBrowsers = instances.filter((b) => b.inUse).length;
    const availableBrowsers = instances.filter((b) => !b.inUse).length;

    return {
      totalBrowsers: this.pool.size,
      availableBrowsers,
      busyBrowsers,
      poolSize: this.poolSize,
      utilizationRate: ((busyBrowsers / this.pool.size) * 100).toFixed(2) + '%',
    };
  }
}
