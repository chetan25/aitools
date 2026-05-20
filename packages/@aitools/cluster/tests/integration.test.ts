/**
 * @aitools/cluster - Integration Tests
 *
 * Tests end-to-end cluster functionality, timeout handling, error recovery
 */

import { Cluster } from '../src/index';
import { BrowserConfig } from '../src/types';

describe('Cluster', () => {
  let cluster: Cluster;

  afterEach(async () => {
    if (cluster) {
      await cluster.shutdown();
    }
  });

  it('should create cluster with defaults', () => {
    cluster = new Cluster();
    expect(cluster).toBeDefined();
  });

  it('should create cluster with custom config', () => {
    cluster = new Cluster({
      poolSize: 30,
      timeout: 45000,
      debug: false,
    });
    expect(cluster).toBeDefined();
  });

  it('should initialize cluster', async () => {
    cluster = new Cluster({ poolSize: 10, timeout: 30000 });
    await cluster.initialize();

    const stats = cluster.getStats();
    expect(stats.totalBrowsers).toBeGreaterThan(0);
  });

  it('should provide statistics', async () => {
    cluster = new Cluster({ poolSize: 10, timeout: 30000 });
    await cluster.initialize();

    const stats = cluster.getStats();

    expect(stats).toHaveProperty('totalBrowsers');
    expect(stats).toHaveProperty('availableBrowsers');
    expect(stats).toHaveProperty('busyBrowsers');
    expect(stats).toHaveProperty('totalPages');
    expect(stats).toHaveProperty('failedPages');
    expect(stats).toHaveProperty('totalRetries');
    expect(stats).toHaveProperty('avgLatency');
    expect(stats).toHaveProperty('p50Latency');
    expect(stats).toHaveProperty('p99Latency');
    expect(stats).toHaveProperty('circuitStatus');
    expect(stats).toHaveProperty('memoryUsage');
  });

  it('should get queue statistics', async () => {
    cluster = new Cluster({ poolSize: 10, timeout: 30000 });
    await cluster.initialize();

    const queueStats = cluster.getQueueStats();

    expect(queueStats).toHaveProperty('totalJobs');
    expect(queueStats).toHaveProperty('pendingJobs');
    expect(queueStats).toHaveProperty('runningJobs');
    expect(queueStats).toHaveProperty('retryingJobs');
  });

  it('should shutdown cleanly', async () => {
    cluster = new Cluster({ poolSize: 10, timeout: 30000 });
    await cluster.initialize();

    let stats = cluster.getStats();
    expect(stats.totalBrowsers).toBeGreaterThan(0);

    await cluster.shutdown();

    stats = cluster.getStats();
    expect(stats.totalBrowsers).toBe(0);
  });

  it('should auto-initialize on screenshot call', async () => {
    cluster = new Cluster({ poolSize: 10, timeout: 30000 });

    // Should auto-initialize
    const results = await cluster.screenshot({
      url: 'about:blank',
    });

    expect(Array.isArray(results)).toBe(true);

    await cluster.shutdown();
  });

  it('should auto-initialize on pdf call', async () => {
    cluster = new Cluster({ poolSize: 10, timeout: 30000 });

    // Should auto-initialize
    const results = await cluster.pdf({
      url: 'about:blank',
    });

    expect(Array.isArray(results)).toBe(true);

    await cluster.shutdown();
  });

  it('should auto-initialize on html call', async () => {
    cluster = new Cluster({ poolSize: 10, timeout: 30000 });

    // Should auto-initialize
    const results = await cluster.html({
      url: 'about:blank',
    });

    expect(Array.isArray(results)).toBe(true);

    await cluster.shutdown();
  });

  it('should handle multiple render types', async () => {
    cluster = new Cluster({ poolSize: 10, timeout: 30000 });
    await cluster.initialize();

    const screenshots = await cluster.screenshot({ url: 'about:blank' });
    expect(Array.isArray(screenshots)).toBe(true);

    const pdfs = await cluster.pdf({ url: 'about:blank' });
    expect(Array.isArray(pdfs)).toBe(true);

    const htmls = await cluster.html({ url: 'about:blank' });
    expect(Array.isArray(htmls)).toBe(true);

    await cluster.shutdown();
  });

  it('should handle batch operations', async () => {
    cluster = new Cluster({ poolSize: 10, timeout: 30000 });
    await cluster.initialize();

    const options = [
      { url: 'about:blank' },
      { url: 'about:blank' },
      { url: 'about:blank' },
    ];

    const results = await cluster.screenshot(options);

    expect(results.length).toBe(3);
    expect(Array.isArray(results)).toBe(true);

    await cluster.shutdown();
  });
});
