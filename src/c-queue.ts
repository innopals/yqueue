import { CSemaphore } from './c-semaphore';

export const DEFAULT_QUEUE_CONCURRENCY = 100;

export interface CQueueOptions {
  concurrency?: number;
}

export interface EnqueueOptions {
  priority: number;
}

export type Task<TaskResultType> =
  | (() => PromiseLike<TaskResultType>)
  | (() => TaskResultType);

export class CQueue {
  private readonly semaphore: CSemaphore;
  private onIdleWaits: Array<() => void> = [];
  constructor(readonly options?: CQueueOptions) {
    let concurrency = options?.concurrency ?? DEFAULT_QUEUE_CONCURRENCY;
    if (!(concurrency >= 1)) concurrency = DEFAULT_QUEUE_CONCURRENCY;
    this.semaphore = new CSemaphore(concurrency);
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

export default CQueue;
