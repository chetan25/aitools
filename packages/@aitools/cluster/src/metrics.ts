/**
 * @aitools/cluster - Metrics collector
 *
 * Tracks latency, throughput, error rates, and circuit breaker state.
 */

import { MetricsSnapshot, CircuitBreakerState } from './types';

export class MetricsCollector {
  private latencies: number[] = [];
  private errorCount = 0;
  private successCount = 0;
  private retryCount = 0;
  private windowStart = Date.now();
  private readonly windowDuration = 10000; // 10-second window for circuit breaker

  private circuitState: CircuitBreakerState = {
    state: 'closed',
    failureCount: 0,
    successCount: 0,
    lastStateChange: Date.now(),
    failureRate: 0,
  };

  /**
   * Record a successful render
   */
  recordSuccess(latency: number): void {
    this.latencies.push(latency);
    this.successCount++;
    this.updateCircuitBreaker();
  }

  /**
   * Record a failed render
   */
  recordError(): void {
    this.errorCount++;
    this.circuitState.failureCount++;
    this.updateCircuitBreaker();
  }

  /**
   * Record a retry attempt
   */
  recordRetry(): void {
    this.retryCount++;
  }

  /**
   * Update circuit breaker state based on failure rate
   */
  private updateCircuitBreaker(): void {
    const now = Date.now();
    const windowElapsed = now - this.windowStart;

    // Reset window if duration exceeded
    if (windowElapsed >= this.windowDuration) {
      this.resetWindow();
    }

    const totalAttempts = this.circuitState.successCount + this.circuitState.failureCount;
    if (totalAttempts > 0) {
      const failureRate = this.circuitState.failureCount / totalAttempts;
      this.circuitState.failureRate = failureRate;

      // Open circuit if >80% failures
      if (failureRate > 0.8 && this.circuitState.state === 'closed') {
        this.circuitState.state = 'open';
        this.circuitState.lastStateChange = now;
      }

      // Attempt to close circuit after recovery window (30s)
      if (this.circuitState.state === 'open' && now - this.circuitState.lastStateChange >= 30000) {
        this.circuitState.state = 'half-open';
        this.circuitState.lastStateChange = now;
      }

      // If half-open succeeded enough, close circuit
      if (this.circuitState.state === 'half-open' && failureRate < 0.5) {
        this.circuitState.state = 'closed';
        this.circuitState.lastStateChange = now;
        this.resetWindow();
      }
    }
  }

  /**
   * Reset metrics window
   */
  private resetWindow(): void {
    this.latencies = [];
    this.errorCount = 0;
    this.successCount = 0;
    this.retryCount = 0;
    this.windowStart = Date.now();
    this.circuitState.failureCount = 0;
    this.circuitState.successCount = 0;
  }

  /**
   * Get current metrics snapshot
   */
  getSnapshot(): MetricsSnapshot {
    return {
      timestamp: Date.now(),
      latencies: [...this.latencies],
      errorCount: this.errorCount,
      successCount: this.successCount,
      retryCount: this.retryCount,
      circuitState: this.circuitState.state,
    };
  }

  /**
   * Get circuit breaker state
   */
  getCircuitState(): CircuitBreakerState {
    return { ...this.circuitState };
  }

  /**
   * Get percentile latency
   */
  getPercentileLatency(percentile: number): number {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get average latency
   */
  getAverageLatency(): number {
    if (this.latencies.length === 0) return 0;
    const sum = this.latencies.reduce((a, b) => a + b, 0);
    return sum / this.latencies.length;
  }

  /**
   * Get overall statistics
   */
  getStats() {
    const snapshot = this.getSnapshot();
    const total = this.successCount + this.errorCount;
    const errorRate = total > 0 ? (this.errorCount / total) * 100 : 0;

    return {
      totalRendered: this.successCount,
      totalErrors: this.errorCount,
      totalRetries: this.retryCount,
      errorRate: errorRate.toFixed(2) + '%',
      avgLatency: this.getAverageLatency().toFixed(0) + 'ms',
      p50Latency: this.getPercentileLatency(50).toFixed(0) + 'ms',
      p99Latency: this.getPercentileLatency(99).toFixed(0) + 'ms',
      circuitState: this.circuitState.state,
    };
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitOpen(): boolean {
    return this.circuitState.state === 'open';
  }

  /**
   * Check if circuit breaker is half-open
   */
  isCircuitHalfOpen(): boolean {
    return this.circuitState.state === 'half-open';
  }

  /**
   * Manually reset metrics (for testing)
   */
  reset(): void {
    this.resetWindow();
    this.circuitState = {
      state: 'closed',
      failureCount: 0,
      successCount: 0,
      lastStateChange: Date.now(),
      failureRate: 0,
    };
  }
}
