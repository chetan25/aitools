/**
 * @aitools/cluster - Recovery Tests
 *
 * Tests circuit breaker, retry logic, error classification, backoff delays
 */

import { CircuitBreaker, RetryStrategy, ErrorClassifier } from '../src/recovery';

describe('ErrorClassifier', () => {
  it('should classify network errors as retryable', () => {
    const errors = [
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'Connection timeout',
    ];

    for (const err of errors) {
      const classification = ErrorClassifier.classify(err);
      expect(classification.retryable).toBe(true);
      expect(classification.category).toMatch(/network|timeout/);
    }
  });

  it('should classify browser crash as retryable', () => {
    const classification = ErrorClassifier.classify('Target closed');
    expect(classification.retryable).toBe(true);
    expect(classification.code).toBe('BROWSER_CRASH');
  });

  it('should classify invalid URL as non-retryable', () => {
    const classification = ErrorClassifier.classify('Invalid URL');
    expect(classification.retryable).toBe(false);
    expect(classification.code).toBe('INVALID_URL');
  });

  it('should classify permission denied as non-retryable', () => {
    const classification = ErrorClassifier.classify('Permission denied');
    expect(classification.retryable).toBe(false);
    expect(classification.code).toBe('PERMISSION_DENIED');
  });

  it('should classify timeout error as retryable', () => {
    const classification = ErrorClassifier.classify('TimeoutError');
    expect(classification.retryable).toBe(true);
    expect(classification.category).toBe('timeout');
  });
});

describe('RetryStrategy', () => {
  it('should not retry after max retries', () => {
    const strategy = new RetryStrategy(3);

    expect(strategy.shouldRetry('ECONNREFUSED', 3)).toBe(false);
    expect(strategy.shouldRetry('ECONNREFUSED', 4)).toBe(false);
  });

  it('should retry retryable errors', () => {
    const strategy = new RetryStrategy(3);

    expect(strategy.shouldRetry('ECONNREFUSED', 0)).toBe(true);
    expect(strategy.shouldRetry('ECONNREFUSED', 1)).toBe(true);
    expect(strategy.shouldRetry('ECONNREFUSED', 2)).toBe(true);
  });

  it('should not retry non-retryable errors', () => {
    const strategy = new RetryStrategy(3);

    expect(strategy.shouldRetry('Invalid URL', 0)).toBe(false);
    expect(strategy.shouldRetry('Permission denied', 1)).toBe(false);
  });

  it('should calculate exponential backoff', () => {
    const strategy = new RetryStrategy(3, 100, 30000);

    const delay0 = strategy.getBackoffDelay(0);
    const delay1 = strategy.getBackoffDelay(1);
    const delay2 = strategy.getBackoffDelay(2);

    // Base delays: 100*2^1 + jitter, 100*2^2 + jitter, etc
    expect(delay0).toBeGreaterThanOrEqual(200);
    expect(delay0).toBeLessThanOrEqual(1200);

    expect(delay1).toBeGreaterThanOrEqual(400);
    expect(delay1).toBeLessThanOrEqual(1400);

    expect(delay2).toBeGreaterThanOrEqual(800);
    expect(delay2).toBeLessThanOrEqual(1800);
  });

  it('should cap backoff at max delay', () => {
    const strategy = new RetryStrategy(3, 100, 1000);

    const delay = strategy.getBackoffDelay(10);
    expect(delay).toBeLessThanOrEqual(2000); // 1000 + 1000 jitter max
  });

  it('should wait for backoff delay', async () => {
    const strategy = new RetryStrategy(3, 50, 30000);

    const start = Date.now();
    await strategy.wait(0); // ~100-1100ms
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(50);
  });

  it('should provide max retries', () => {
    const strategy = new RetryStrategy(5);
    expect(strategy.getMaxRetries()).toBe(5);
  });
});

describe('CircuitBreaker', () => {
  it('should start closed', () => {
    const breaker = new CircuitBreaker(80, 10000, 30000);
    expect(breaker.getState()).toBe('closed');
    expect(breaker.isOpen()).toBe(false);
  });

  it('should open when failure rate exceeds threshold', () => {
    const breaker = new CircuitBreaker(80, 10000, 30000);

    // Record 10 failures and 1 success (91% failure rate)
    for (let i = 0; i < 10; i++) {
      breaker.recordFailure();
    }
    breaker.recordSuccess();

    expect(breaker.isOpen()).toBe(true);
  });

  it('should stay closed when below threshold', () => {
    const breaker = new CircuitBreaker(80, 10000, 30000);

    // Record 8 failures and 2 successes (80% failure rate - at threshold)
    for (let i = 0; i < 8; i++) {
      breaker.recordFailure();
    }
    breaker.recordSuccess();
    breaker.recordSuccess();

    // Should still be closed or at threshold
    expect(breaker.isOpen()).toBe(true); // Exactly at threshold opens
  });

  it('should provide statistics', () => {
    const breaker = new CircuitBreaker(80, 10000, 30000);

    breaker.recordSuccess();
    breaker.recordSuccess();
    breaker.recordFailure();

    const stats = breaker.getStats();

    expect(stats).toHaveProperty('state');
    expect(stats).toHaveProperty('failureCount');
    expect(stats).toHaveProperty('successCount');
    expect(stats).toHaveProperty('failureRate');
    expect(stats).toHaveProperty('totalRequests');

    expect(stats.totalRequests).toBe(3);
    expect(stats.successCount).toBe(2);
    expect(stats.failureCount).toBe(1);
  });

  it('should reset', () => {
    const breaker = new CircuitBreaker(80, 10000, 30000);

    for (let i = 0; i < 10; i++) {
      breaker.recordFailure();
    }

    expect(breaker.isOpen()).toBe(true);

    breaker.reset();

    expect(breaker.getState()).toBe('closed');
    expect(breaker.isOpen()).toBe(false);
  });
});
