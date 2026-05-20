/**
 * @aitools/cluster - Metrics Tests
 *
 * Tests metrics collector, percentile calculation, circuit state tracking
 */

import { MetricsCollector } from '../src/metrics';

describe('MetricsCollector', () => {
  let metrics: MetricsCollector;

  beforeEach(() => {
    metrics = new MetricsCollector();
  });

  it('should record successful renders', () => {
    metrics.recordSuccess(100);
    metrics.recordSuccess(150);
    metrics.recordSuccess(200);

    const snapshot = metrics.getSnapshot();
    expect(snapshot.successCount).toBe(3);
    expect(snapshot.errorCount).toBe(0);
  });

  it('should record errors', () => {
    metrics.recordError();
    metrics.recordError();

    const snapshot = metrics.getSnapshot();
    expect(snapshot.errorCount).toBe(2);
  });

  it('should record retries', () => {
    metrics.recordRetry();
    metrics.recordRetry();
    metrics.recordRetry();

    const snapshot = metrics.getSnapshot();
    expect(snapshot.retryCount).toBe(3);
  });

  it('should calculate average latency', () => {
    metrics.recordSuccess(100);
    metrics.recordSuccess(200);
    metrics.recordSuccess(300);

    const avg = metrics.getAverageLatency();
    expect(avg).toBe(200);
  });

  it('should calculate percentile latency', () => {
    const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    for (const latency of latencies) {
      metrics.recordSuccess(latency);
    }

    const p50 = metrics.getPercentileLatency(50);
    const p99 = metrics.getPercentileLatency(99);

    expect(p50).toBeGreaterThanOrEqual(40);
    expect(p50).toBeLessThanOrEqual(60);
    expect(p99).toBeGreaterThanOrEqual(90);
    expect(p99).toBeLessThanOrEqual(100);
  });

  it('should provide statistics', () => {
    metrics.recordSuccess(100);
    metrics.recordSuccess(150);
    metrics.recordSuccess(200);
    metrics.recordError();

    const stats = metrics.getStats();

    expect(stats).toHaveProperty('totalRendered');
    expect(stats).toHaveProperty('totalErrors');
    expect(stats).toHaveProperty('totalRetries');
    expect(stats).toHaveProperty('errorRate');
    expect(stats).toHaveProperty('avgLatency');
    expect(stats).toHaveProperty('p50Latency');
    expect(stats).toHaveProperty('p99Latency');
    expect(stats).toHaveProperty('circuitState');

    expect(stats.totalRendered).toBe(3);
    expect(stats.totalErrors).toBe(1);
  });

  it('should track circuit state', () => {
    expect(metrics.isCircuitOpen()).toBe(false);
    expect(metrics.isCircuitHalfOpen()).toBe(false);

    const circuitState = metrics.getCircuitState();
    expect(circuitState.state).toBe('closed');
  });

  it('should open circuit at >80% failure rate', () => {
    // Record 90% failure rate (9 errors, 1 success)
    for (let i = 0; i < 9; i++) {
      metrics.recordError();
    }
    metrics.recordSuccess(100);

    expect(metrics.isCircuitOpen()).toBe(true);
  });

  it('should provide snapshots', () => {
    metrics.recordSuccess(100);
    metrics.recordSuccess(200);
    metrics.recordError();

    const snapshot = metrics.getSnapshot();

    expect(snapshot).toHaveProperty('timestamp');
    expect(snapshot).toHaveProperty('latencies');
    expect(snapshot).toHaveProperty('errorCount');
    expect(snapshot).toHaveProperty('successCount');
    expect(snapshot).toHaveProperty('retryCount');
    expect(snapshot).toHaveProperty('circuitState');

    expect(snapshot.latencies.length).toBe(2);
    expect(snapshot.successCount).toBe(2);
    expect(snapshot.errorCount).toBe(1);
  });

  it('should reset metrics', () => {
    metrics.recordSuccess(100);
    metrics.recordError();

    let stats = metrics.getStats();
    expect(stats.totalRendered).toBe(1);

    metrics.reset();

    stats = metrics.getStats();
    expect(stats.totalRendered).toBe(0);
    expect(stats.totalErrors).toBe(0);
    expect(metrics.isCircuitOpen()).toBe(false);
  });
});
