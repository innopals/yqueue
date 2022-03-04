import YQueue, { EnqueueOptions, Task } from './y-queue';

export interface YBatchOptions {
  concurrency?: number;
  maxQueueLength?: number;
}

export class YBatchErrors extends Error {
  constructor(public readonly errors: unknown[]) {
    super(`Batch failed with ${errors.length} errors.`);
    this.name = new.target.name;
  }
}

export class YBatch {
  private readonly maxQueueLength: number;
  private readonly queue: YQueue;
  private readonly errors: Array<unknown> = [];
  private failFastWaits: Array<(error?: unknown) => void> = [];
  private allSettledWaits: Array<(error?: YBatchErrors) => void> = [];
  private running = 0;
  constructor(readonly options: YBatchOptions) {
    this.queue = new YQueue({
      concurrency: options.concurrency,
    });
    this.maxQueueLength =
      options.maxQueueLength !== undefined && options.maxQueueLength > 0
        ? options.maxQueueLength
        : this.queue.concurrency;
  }

  async add(fn: Task<void>, options?: Partial<EnqueueOptions>): Promise<void> {
    this.running++;
    try {
      await this.queue.onQueueLessThan(this.maxQueueLength);
      await this.queue.run(fn, options);
    } catch (e: unknown) {
      this.errors.push(e);
      if (this.failFastWaits.length > 0) {
        this.failFastWaits.forEach(ack => {
          ack(this.errors[0]);
        });
        this.failFastWaits = [];
      }
    } finally {
      this.running--;
      if (this.running === 0) {
        this.allSettledWaits.forEach(ack => {
          ack(
            this.errors.length > 0 ? new YBatchErrors(this.errors) : undefined,
          );
        });
        this.allSettledWaits = [];
        this.failFastWaits.forEach(ack => {
          ack(this.errors[0]);
        });
        this.failFastWaits = [];
      }
    }
  }

  async failFast(): Promise<void> {
    if (this.errors.length > 0) {
      throw this.errors[0];
    }
    if (this.running === 0) {
      return;
    }
    return new Promise<void>((f, r) => {
      this.failFastWaits.push(e => {
        if (e === undefined) f();
        else r(e);
      });
    });
  }

  async allSettled(): Promise<void> {
    if (this.running === 0) {
      if (this.errors.length === 0) return;
      throw new YBatchErrors(this.errors);
    }
    return new Promise<void>((f, r) => {
      this.allSettledWaits.push(e => {
        if (e === undefined) f();
        else r(e);
      });
    });
  }
}
