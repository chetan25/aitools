/**
 * @aitools/cluster - Queue Tests
 *
 * Tests task queue: FIFO ordering, priority, status tracking, statistics
 */

import { TaskQueue } from '../src/queue';

describe('TaskQueue', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue(1000);
  });

  it('should enqueue jobs', () => {
    const jobId = queue.enqueue('screenshot', 'https://example.com', { url: 'https://example.com' });

    expect(jobId).toBeDefined();
    expect(jobId).toMatch(/^job_/);
    expect(queue.size()).toBe(1);
  });

  it('should dequeue jobs in FIFO order', () => {
    queue.enqueue('screenshot', 'https://example1.com', { url: 'https://example1.com' });
    queue.enqueue('screenshot', 'https://example2.com', { url: 'https://example2.com' });
    queue.enqueue('screenshot', 'https://example3.com', { url: 'https://example3.com' });

    const job1 = queue.dequeue();
    const job2 = queue.dequeue();
    const job3 = queue.dequeue();

    expect(job1?.url).toBe('https://example1.com');
    expect(job2?.url).toBe('https://example2.com');
    expect(job3?.url).toBe('https://example3.com');
    expect(queue.isEmpty()).toBe(true);
  });

  it('should support priority ordering', () => {
    queue.enqueue('screenshot', 'https://low.com', { url: 'https://low.com' }, 1);
    queue.enqueue('screenshot', 'https://high.com', { url: 'https://high.com' }, 10);
    queue.enqueue('screenshot', 'https://medium.com', { url: 'https://medium.com' }, 5);

    const job1 = queue.dequeue();
    const job2 = queue.dequeue();
    const job3 = queue.dequeue();

    expect(job1?.url).toBe('https://high.com');
    expect(job2?.url).toBe('https://medium.com');
    expect(job3?.url).toBe('https://low.com');
  });

  it('should peek without removing', () => {
    queue.enqueue('screenshot', 'https://example.com', { url: 'https://example.com' });

    const peeked = queue.peek();
    const dequeued = queue.dequeue();

    expect(peeked?.id).toBe(dequeued?.id);
  });

  it('should track job status', () => {
    const jobId = queue.enqueue('screenshot', 'https://example.com', { url: 'https://example.com' });
    const job = queue.getJob(jobId);

    expect(job?.status).toBe('pending');

    queue.updateJob(jobId, { status: 'running' });
    const updated = queue.getJob(jobId);

    expect(updated?.status).toBe('running');
  });

  it('should requeue jobs for retry', () => {
    const jobId = queue.enqueue('screenshot', 'https://example.com', { url: 'https://example.com' });
    const job = queue.dequeue();

    expect(job).toBeDefined();
    expect(queue.isEmpty()).toBe(true);

    job!.retryCount = 0;
    queue.requeue(job!);

    expect(queue.size()).toBe(1);
    expect(job!.status).toBe('retrying');
    expect(job!.retryCount).toBe(1);
  });

  it('should track retry attempts', () => {
    const jobId = queue.enqueue('screenshot', 'https://example.com', { url: 'https://example.com' });

    for (let i = 0; i < 3; i++) {
      const job = queue.dequeue();
      job!.retryCount = i;
      queue.requeue(job!);
    }

    const job = queue.dequeue();
    expect(job?.retryCount).toBe(3);
  });

  it('should provide queue statistics', () => {
    queue.enqueue('screenshot', 'https://example.com', { url: 'https://example.com' }, 5);
    queue.enqueue('pdf', 'https://example.com', { url: 'https://example.com' }, 3);

    const stats = queue.getStats();

    expect(stats).toHaveProperty('totalJobs');
    expect(stats).toHaveProperty('pendingJobs');
    expect(stats).toHaveProperty('runningJobs');
    expect(stats).toHaveProperty('retryingJobs');
    expect(stats).toHaveProperty('avgPriority');

    expect(stats.totalJobs).toBe(2);
    expect(stats.pendingJobs).toBe(2);
  });

  it('should clear queue', () => {
    queue.enqueue('screenshot', 'https://example.com', { url: 'https://example.com' });
    queue.enqueue('screenshot', 'https://example.com', { url: 'https://example.com' });

    expect(queue.size()).toBe(2);

    queue.clear();

    expect(queue.isEmpty()).toBe(true);
    expect(queue.size()).toBe(0);
  });

  it('should throw on queue overflow', () => {
    const smallQueue = new TaskQueue(2);

    smallQueue.enqueue('screenshot', 'https://example1.com', { url: 'https://example1.com' });
    smallQueue.enqueue('screenshot', 'https://example2.com', { url: 'https://example2.com' });

    expect(() => {
      smallQueue.enqueue('screenshot', 'https://example3.com', { url: 'https://example3.com' });
    }).toThrow();
  });
});
