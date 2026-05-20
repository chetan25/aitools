/**
 * @aitools/cluster - Main API Entry Point
 *
 * Provides the public Node.js API for the browser pool cluster.
 */

import { Coordinator } from './coordinator';
import {
  BrowserConfig,
  ScreenshotOptions,
  PDFOptions,
  HTMLOptions,
  RenderResult,
  BrowserPoolStats,
} from './types';

export class Cluster {
  private coordinator: Coordinator;
  private initialized = false;

  constructor(config: Partial<BrowserConfig> = {}) {
    const fullConfig: BrowserConfig = {
      poolSize: config.poolSize || 50,
      timeout: config.timeout || 30000,
      executablePath: config.executablePath,
      debug: config.debug || false,
      launchArgs: config.launchArgs || [],
    };

    this.coordinator = new Coordinator(fullConfig);
  }

  /**
   * Initialize the cluster
   */
  async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.coordinator.initialize();
      this.initialized = true;
    }
  }

  /**
   * Render screenshot(s)
   */
  async screenshot(
    options: ScreenshotOptions | ScreenshotOptions[]
  ): Promise<RenderResult<Buffer>[]> {
    await this.initialize();
    return this.coordinator.screenshot(options);
  }

  /**
   * Render PDF(s)
   */
  async pdf(
    options: PDFOptions | PDFOptions[]
  ): Promise<RenderResult<Buffer>[]> {
    await this.initialize();
    return this.coordinator.pdf(options);
  }

  /**
   * Render HTML
   */
  async html(
    options: HTMLOptions | HTMLOptions[]
  ): Promise<RenderResult<string>[]> {
    await this.initialize();
    return this.coordinator.html(options);
  }

  /**
   * Get cluster statistics
   */
  getStats(): BrowserPoolStats {
    return this.coordinator.getStats();
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return this.coordinator.getQueueStats();
  }

  /**
   * Shutdown the cluster
   */
  async shutdown(): Promise<void> {
    await this.coordinator.shutdown();
    this.initialized = false;
  }
}

// Export types for public API
export * from './types';
export { Coordinator };
