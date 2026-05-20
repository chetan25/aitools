/**
 * @aitools/cluster - Recovery & Retry Logic
 *
 * Implements circuit breaker pattern and exponential backoff with jitter.
 */

import { ErrorClassification } from './types';

export class ErrorClassifier {
  /**
   * Classify an error to determine if it's retryable
   */
  static classify(error: Error | string): ErrorClassification {
    const message = typeof error === 'string' ? error : error.message;

    // Network/timeout errors (retryable)
    if (
      message.includes('ECONNREFUSED') ||
      message.includes('ECONNRESET') ||
      message.includes('ETIMEDOUT') ||
      message.includes('timeout')
    ) {
      return {
        message,
        code: 'NETWORK_ERROR',
        retryable: true,
        category: 'network',
      };
    }

    // Browser crash (retryable)
    if (message.includes('Target closed') || message.includes('Session closed')) {
      return {
        message,
        code: 'BROWSER_CRASH',
        retryable: true,
        category: 'browser_crash',
      };
    }

    // Timeout errors (retryable - should retry different browser)
    if (message.includes('Waiting for') || message.includes('TimeoutError')) {
      return {
        message,
        code: 'TIMEOUT',
        retryable: true,
        category: 'timeout',
      };
    }

    // Invalid URL (not retryable)
    if (
      message.includes('Invalid URL') ||
      message.includes('net::ERR_NAME_NOT_RESOLVED') ||
      message.includes('net::ERR_INVALID_URL')
    ) {
      return {
        message,
        code: 'INVALID_URL',
        retryable: false,
        category: 'invalid_input',
      };
    }

    // Permission denied (not retryable)
    if (message.includes('Permission denied') || message.includes('ERR_ACCESS_DENIED')) {
      return {
        message,
        code: 'PERMISSION_DENIED',
        retryable: false,
        category: 'permission',
      };
    }

    // Default: assume retryable for network/transient issues
    return {
      message,
      code: 'UNKNOWN_ERROR',
      retryable: true,
      category: 'unknown',
    };
  }
}

export class RetryStrategy {
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;

  constructor(maxRetries = 3, baseDelayMs = 100, maxDelayMs = 30000) {
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
  }

  /**
   * Determine if a task should be retried
   */
  shouldRetry(error: Error | string, attemptNumber: number): boolean {
    if (attemptNumber >= this.maxRetries) {
      return false;
    }

    const classification = ErrorClassifier.classify(error);
    return classification.retryable;
  }

  /**
   * Calculate exponential backoff delay with jitter
   * Formula: min(baseDelay * 2^attempt + jitter, maxDelay)
   */
  getBackoffDelay(attemptNumber: number): number {
    // attemptNumber is 0-indexed, so first retry is attempt 1
    const exponent = attemptNumber + 1;
    const exponentialDelay = this.baseDelayMs * Math.pow(2, exponent);
    const cappedDelay = Math.min(exponentialDelay, this.maxDelayMs);

    // Add jitter: random 0-1000ms
    const jitter = Math.floor(Math.random() * 1000);
    return cappedDelay + jitter;
  }

  /**
   * Wait for backoff delay
   */
  async wait(attemptNumber: number): Promise<void> {
    const delay = this.getBackoffDelay(attemptNumber);
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Get max retries
   */
  getMaxRetries(): number {
    return this.maxRetries;
  }
}

export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastStateChange = Date.now();
  private readonly failureThreshold: number; // percentage 0-100
  private readonly windowDuration: number; // ms
  private readonly resetTimeout: number; // ms before attempting to recover

  constructor(failureThreshold = 80, windowDuration = 10000, resetTimeout = 30000) {
    this.failureThreshold = failureThreshold;
    this.windowDuration = windowDuration;
    this.resetTimeout = resetTimeout;
  }

  /**
   * Check if circuit is open (rejecting requests)
   */
  isOpen(): boolean {
    return this.state === 'open';
  }

  /**
   * Check if circuit is half-open (testing recovery)
   */
  isHalfOpen(): boolean {
    return this.state === 'half-open';
  }

  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    this.successCount++;
    this.updateState();
  }

  /**
   * Record a failed operation
   */
  recordFailure(): void {
    this.failureCount++;
    this.updateState();
  }

  /**
   * Update circuit state based on failure rate
   */
  private updateState(): void {
    const now = Date.now();
    const timeSinceChange = now - this.lastStateChange;

    // Reset counts after window duration
    if (timeSinceChange >= this.windowDuration) {
      this.failureCount = 0;
      this.successCount = 0;
    }

    const total = this.failureCount + this.successCount;
    const failureRate = total > 0 ? (this.failureCount / total) * 100 : 0;

    if (this.state === 'closed') {
      // Open circuit if failure rate exceeds threshold
      if (failureRate > this.failureThreshold) {
        this.state = 'open';
        this.lastStateChange = now;
      }
    } else if (this.state === 'open') {
      // Try to recover after reset timeout
      if (timeSinceChange >= this.resetTimeout) {
        this.state = 'half-open';
        this.failureCount = 0;
        this.successCount = 0;
        this.lastStateChange = now;
      }
    } else if (this.state === 'half-open') {
      // Close circuit if enough successes in half-open state
      if (failureRate < 50) {
        this.state = 'closed';
        this.failureCount = 0;
        this.successCount = 0;
        this.lastStateChange = now;
      }
    }
  }

  /**
   * Get current state
   */
  getState(): 'closed' | 'open' | 'half-open' {
    this.updateState();
    return this.state;
  }

  /**
   * Get statistics
   */
  getStats() {
    const total = this.failureCount + this.successCount;
    const failureRate = total > 0 ? (this.failureCount / total) * 100 : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureRate: failureRate.toFixed(2) + '%',
      totalRequests: total,
    };
  }

  /**
   * Reset circuit (for testing)
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastStateChange = Date.now();
  }
}
