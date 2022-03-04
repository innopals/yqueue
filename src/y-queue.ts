import { BinaryHeap } from './binary-heap';
import { YSemaphore } from './y-semaphore';

export const DEFAULT_QUEUE_CONCURRENCY = 10;

export interface YQueueOptions {
  concurrency?: number;
}

export interface EnqueueOptions {
  priority: number;
}

export type Task<TaskResultType> =
  | (() => PromiseLike<TaskResultType>)
  | (() => TaskResultType);

interface WaitForQueueLessThan {
  ack: () => void;
  threshold: number;
}

export class YQueue {
  private readonly semaphore: YSemaphore;
  public readonly concurrency: number;
  private onIdleWaits: Array<() => void> = [];
  private onQueueLessThanWaits: BinaryHeap<WaitForQueueLessThan>;
  constructor(readonly options?: YQueueOptions) {
    let concurrency = options?.concurrency ?? DEFAULT_QUEUE_CONCURRENCY;
    if (!(concurrency >= 1)) concurrency = DEFAULT_QUEUE_CONCURRENCY;
    this.concurrency = concurrency;
    this.semaphore = new YSemaphore(concurrency);
    this.onQueueLessThanWaits = new BinaryHeap<WaitForQueueLessThan>(
      (a, b) => a.threshold - b.threshold,
    );
  }

  async run<TaskResultType>(
    fn: Task<TaskResultType>,
    options?: Partial<EnqueueOptions>,
  ): Promise<TaskResultType> {
    const acquired = await this.semaphore.acquire(options?.priority);
    try {
      return await fn();
    } finally {
      this.semaphore.release(acquired);
      if (this.semaphore.getAvailablePermits() === this.semaphore.permits) {
        this.onIdleWaits.forEach(f => f());
        this.onIdleWaits = [];
      }
      const queueLength = this.semaphore.getQueueLength();
      for (;;) {
        const next = this.onQueueLessThanWaits.peek();
        if (next === null || queueLength >= next.threshold) break;
        next.ack();
        this.onQueueLessThanWaits.removeMax();
      }
    }
  }

  add<TaskResultType>(
    fn: Task<TaskResultType>,
    options?: Partial<EnqueueOptions>,
  ): void {
    this.run(fn, options);
  }

  onIdle(): Promise<void> {
    if (this.semaphore.getAvailablePermits() === this.semaphore.permits) {
      return Promise.resolve();
    }
    return new Promise(f => this.onIdleWaits.push(f));
  }

  onQueueLessThan(size: number): Promise<void> {
    if (this.semaphore.getQueueLength() < size) {
      return Promise.resolve();
    }
    return new Promise(f =>
      this.onQueueLessThanWaits.add({ ack: f, threshold: size }),
    );
  }
}

export default YQueue;
