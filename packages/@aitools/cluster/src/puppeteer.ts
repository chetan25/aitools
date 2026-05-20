/**
 * @aitools/cluster - Puppeteer Integration
 *
 * Wraps Puppeteer for rendering with timeout handling, screenshot capture,
 * PDF generation, and HTML extraction.
 */

import * as puppeteer from 'puppeteer';
import { ScreenshotOptions, PDFOptions, HTMLOptions, RenderResult } from './types';

export class PuppeteerRenderer {
  private timeout: number;
  private debug: boolean;

  constructor(timeout = 30000, debug = false) {
    this.timeout = timeout;
    this.debug = debug;
  }

  /**
   * Navigate to a URL with timeout
   */
  private async navigateWithTimeout(
    page: puppeteer.Page,
    url: string,
    waitUntil: puppeteer.PuppeteerLaunchAndBrowserOptions['waitUntil'] = 'load'
  ): Promise<void> {
    const navigationPromise = page.goto(url, { waitUntil, timeout: this.timeout });
    const timeoutPromise = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('Navigation timeout')), this.timeout)
    );

    await Promise.race([navigationPromise, timeoutPromise]);
  }

  /**
   * Render screenshot
   */
  async screenshot(
    browser: puppeteer.Browser,
    options: ScreenshotOptions
  ): Promise<Buffer> {
    let page: puppeteer.Page | null = null;

    try {
      // Create page
      page = await browser.newPage();

      // Set viewport
      if (options.viewport) {
        await page.setViewport({
          width: options.viewport.width,
          height: options.viewport.height,
          deviceScaleFactor: 1,
        });
      } else {
        await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
      }

      // Set headers if provided
      if (options.headers) {
        await page.setExtraHTTPHeaders(options.headers);
      }

      // Set user agent if provided
      if (options.userAgent) {
        await page.setUserAgent(options.userAgent);
      }

      // Navigate to URL
      await this.navigateWithTimeout(
        page,
        options.url,
        (options.waitUntil as any) || 'load'
      );

      // Capture screenshot
      const screenshot = await page.screenshot({
        type: (options.format as any) || 'png',
        quality: options.quality || 80,
        fullPage: options.fullPage || false,
      });

      return screenshot as Buffer;
    } finally {
      if (page && !page.isClosed()) {
        await page.close();
      }
    }
  }

  /**
   * Render PDF
   */
  async pdf(
    browser: puppeteer.Browser,
    options: PDFOptions
  ): Promise<Buffer> {
    let page: puppeteer.Page | null = null;

    try {
      page = await browser.newPage();

      // Set viewport
      if (options.viewport) {
        await page.setViewport({
          width: options.viewport.width,
          height: options.viewport.height,
          deviceScaleFactor: 1,
        });
      }

      // Navigate to URL
      await this.navigateWithTimeout(
        page,
        options.url,
        (options.waitUntil as any) || 'load'
      );

      // Generate PDF
      const pdf = await page.pdf({
        format: options.format || 'A4',
        margin: options.margin,
        printBackground: options.printBackground || true,
        scale: options.scale || 1,
      });

      return pdf as Buffer;
    } finally {
      if (page && !page.isClosed()) {
        await page.close();
      }
    }
  }

  /**
   * Render to HTML
   */
  async html(
    browser: puppeteer.Browser,
    options: HTMLOptions
  ): Promise<string> {
    let page: puppeteer.Page | null = null;

    try {
      page = await browser.newPage();

      // Navigate to URL
      await this.navigateWithTimeout(
        page,
        options.url,
        (options.waitUntil as any) || 'load'
      );

      // Get page content
      let html = await page.content();

      // Remove scripts if requested
      if (options.removeScripts) {
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      }

      return html;
    } finally {
      if (page && !page.isClosed()) {
        await page.close();
      }
    }
  }
}
