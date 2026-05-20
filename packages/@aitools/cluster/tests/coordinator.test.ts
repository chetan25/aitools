/**
 * @aitools/cluster - Coordinator Tests
 *
 * Tests task coordination, load balancing, resource allocation, metrics
 */

import { Coordinator } from '../src/coordinator';
import { BrowserConfig } from '../src/types';

describe('Coordinator', () => {
  let coordinator: Coordinator;

  afterEach(async () => {
    if (coordinator) {
      await coordinator.shutdown();
    }
  });

  it('should create coordinator', () => {
    const config: BrowserConfig = {
      poolSize: 20,
      timeout: 30000,
      debug: false,
    };

    coordinator = new Coordinator(config);
    expect(coordinator).toBeDefined();
  });

  it('should initialize coordinator', async () => {
    const config: BrowserConfig = {
      poolSize: 10,
      timeout: 30000,
      debug: false,
    };

    coordinator = new Coordinator(config);
    await coordinator.initialize();

    const stats = coordinator.getStats();
    expect(stats).toBeDefined();
  });

  it('should provide statistics', async () => {
    const config: BrowserConfig = {
      poolSize: 10,
      timeout: 30000,
      debug: false,
    };

    coordinator = new Coordinator(config);
    await coordinator.initialize();

    const stats = coordinator.getStats();

    expect(stats).toHaveProperty('totalBrowsers');
    expect(stats).toHaveProperty('availableBrowsers');
    expect(stats).toHaveProperty('busyBrowsers');
    expect(stats).toHaveProperty('totalPages');
    expect(stats).toHaveProperty('failedPages');
    expect(stats).toHaveProperty('avgLatency');
    expect(stats).toHaveProperty('p50Latency');
    expect(stats).toHaveProperty('p99Latency');
    expect(stats).toHaveProperty('circuitStatus');
  });

  it('should get queue statistics', async () => {
    const config: BrowserConfig = {
      poolSize: 10,
      timeout: 30000,
      debug: false,
    };

    coordinator = new Coordinator(config);
    await coordinator.initialize();

    const queueStats = coordinator.getQueueStats();

    expect(queueStats).toHaveProperty('totalJobs');
    expect(queueStats).toHaveProperty('pendingJobs');
    expect(queueStats).toHaveProperty('runningJobs');
    expect(queueStats).toHaveProperty('retryingJobs');
  });

  it('should shutdown cleanly', async () => {
    const config: BrowserConfig = {
      poolSize: 10,
      timeout: 30000,
      debug: false,
    };

    coordinator = new Coordinator(config);
    await coordinator.initialize();

    await coordinator.shutdown();

    const stats = coordinator.getStats();
    expect(stats.totalBrowsers).toBe(0);
  });
});
