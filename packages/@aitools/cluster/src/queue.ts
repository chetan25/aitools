/**
 * @aitools/cluster - Task Queue
 *
 * FIFO job queue with priority support and status tracking.
 */

import { TaskQueueJob, RenderOptions } from './types';

export class TaskQueue {
  private queue: TaskQueueJob[] = [];
  private jobCounter = 0;
  private readonly maxQueueSize: number;

  constructor(maxQueueSize = 100000) {
    this.maxQueueSize = maxQueueSize;
  }

  /**
   * Enqueue a rendering job
   */
  enqueue(
    type: 'screenshot' | 'pdf' | 'html',
    url: string,
    options: RenderOptions,
    priority = 0
  ): string {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error(`Queue is full (max: ${this.maxQueueSize})`);
    }

    const job: TaskQueueJob = {
      id: `job_${++this.jobCounter}`,
      type,
      url,
      options,
      priority,
      retryCount: 0,
      maxRetries: 3,
      createdAt: Date.now(),
      status: 'pending',
    };

    this.queue.push(job);

    // Sort by priority (higher first), then by insertion order
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.createdAt - b.createdAt;
    });

    return job.id;
  }

  /**
   * Dequeue the next job
   */
  dequeue(): TaskQueueJob | undefined {
    return this.queue.shift();
  }

  /**
   * Peek at next job without removing it
   */
  peek(): TaskQueueJob | undefined {
    return this.queue[0];
  }

  /**
   * Requeue a job (for retry)
   */
  requeue(job: TaskQueueJob): void {
    job.retryCount++;
    job.status = 'retrying';
    job.error = undefined;

    // Insert at front with slight delay for backoff
    this.queue.unshift(job);
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): TaskQueueJob | undefined {
    return this.queue.find((j) => j.id === jobId);
  }

  /**
   * Update job status
   */
  updateJob(jobId: string, updates: Partial<TaskQueueJob>): void {
    const job = this.getJob(jobId);
    if (job) {
      Object.assign(job, updates);
    }
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const pending = this.queue.filter((j) => j.status === 'pending').length;
    const running = this.queue.filter((j) => j.status === 'running').length;
    const retrying = this.queue.filter((j) => j.status === 'retrying').length;

    return {
      totalJobs: this.queue.length,
      pendingJobs: pending,
      runningJobs: running,
      retryingJobs: retrying,
      avgPriority: this.queue.length > 0 
        ? (this.queue.reduce((sum, j) => sum + j.priority, 0) / this.queue.length).toFixed(2)
        : 0,
    };
  }

  /**
   * Clear queue (for testing)
   */
  clear(): void {
    this.queue = [];
  }
}
