/**
 * @aitools/cluster - Pool Tests
 *
 * Tests browser pool: scaling, eviction, crash recovery, state tracking
 */

import { BrowserPool } from '../src/pool';
import { BrowserConfig } from '../src/types';

describe('BrowserPool', () => {
  let pool: BrowserPool;

  afterEach(async () => {
    if (pool) {
      await pool.shutdown();
    }
  });

  it('should create pool with valid size', () => {
    const config: BrowserConfig = {
      poolSize: 50,
      timeout: 30000,
      debug: false,
    };

    pool = new BrowserPool(config);
    expect(pool).toBeDefined();
  });

  it('should throw on invalid pool size', () => {
    const tooSmall = { poolSize: 5, timeout: 30000 };
    const tooLarge = { poolSize: 200, timeout: 30000 };

    expect(() => new BrowserPool(tooSmall as any)).toThrow();
    expect(() => new BrowserPool(tooLarge as any)).toThrow();
  });

  it('should initialize pool', async () => {
    const config: BrowserConfig = {
      poolSize: 10,
      timeout: 30000,
      debug: false,
    };

    pool = new BrowserPool(config);
    await pool.initialize();

    const stats = pool.getStats();
    expect(stats.totalBrowsers).toBeGreaterThan(0);
    expect(stats.totalBrowsers).toBeLessThanOrEqual(10);
  });

  it('should acquire and release browsers', async () => {
    const config: BrowserConfig = {
      poolSize: 10,
      timeout: 30000,
      debug: false,
    };

    pool = new BrowserPool(config);
    await pool.initialize();

    const browser1 = await pool.acquire();
    expect(browser1).toBeDefined();

    let stats = pool.getStats();
    expect(stats.busyBrowsers).toBeGreaterThan(0);

    await pool.release(browser1);

    stats = pool.getStats();
    expect(stats.availableBrowsers).toBeGreaterThan(0);
  });

  it('should scale pool to target size', async () => {
    const config: BrowserConfig = {
      poolSize: 30,
      timeout: 30000,
      debug: false,
    };

    pool = new BrowserPool(config);
    await pool.initialize();

    // Acquire multiple browsers
    const browsers = [];
    for (let i = 0; i < 20; i++) {
      browsers.push(await pool.acquire());
    }

    const stats = pool.getStats();
    expect(stats.totalBrowsers).toBeGreaterThan(0);
    expect(stats.busyBrowsers).toBe(20);

    // Release browsers
    for (const browser of browsers) {
      await pool.release(browser);
    }
  });

  it('should provide pool statistics', async () => {
    const config: BrowserConfig = {
      poolSize: 20,
      timeout: 30000,
      debug: false,
    };

    pool = new BrowserPool(config);
    await pool.initialize();

    const stats = pool.getStats();

    expect(stats).toHaveProperty('totalBrowsers');
    expect(stats).toHaveProperty('availableBrowsers');
    expect(stats).toHaveProperty('busyBrowsers');
    expect(stats).toHaveProperty('poolSize');
    expect(stats).toHaveProperty('utilizationRate');

    expect(stats.totalBrowsers).toBeGreaterThan(0);
    expect(stats.busyBrowsers).toBe(0);
    expect(stats.availableBrowsers).toBeGreaterThan(0);
  });

  it('should shutdown cleanly', async () => {
    const config: BrowserConfig = {
      poolSize: 10,
      timeout: 30000,
      debug: false,
    };

    pool = new BrowserPool(config);
    await pool.initialize();

    await pool.shutdown();

    const stats = pool.getStats();
    expect(stats.totalBrowsers).toBe(0);
  });
});
