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

export class YQueue {
  private readonly semaphore: YSemaphore;
  private onIdleWaits: Array<() => void> = [];
  constructor(readonly options?: YQueueOptions) {
    let concurrency = options?.concurrency ?? DEFAULT_QUEUE_CONCURRENCY;
    if (!(concurrency >= 1)) concurrency = DEFAULT_QUEUE_CONCURRENCY;
    this.semaphore = new YSemaphore(concurrency);
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
}

export default YQueue;
