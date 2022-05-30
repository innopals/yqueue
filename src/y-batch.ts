import YQueue, { EnqueueOptions, Task } from './y-queue';

export interface YBatchOptions {
  concurrency?: number;
  maxQueueLength?: number;
}

export class YBatchErrors extends Error {
  constructor(public readonly errors: unknown[]) {
    super(`Batch failed with ${errors.length} errors.`);
    this.name = new.target.name;
    let s = this.stack ?? super.toString();
    s += '\nwrapped errors:';
    this.errors.forEach((e: any, i) => {
      s += `\n#${i}\n${e.stack}`;
    });
    this.stack = s;
  }
  toString(): string {
    let s = super.toString();
    s += '\nwrapped errors:';
    for (const e of this.errors) {
      s += '\n\t' + (e as any).toString();
    }
    return s;
  }
}

export class YBatch {
  static isYBatchError(e: unknown): e is YBatchErrors {
    return e instanceof YBatchErrors;
  }
  readonly maxQueueLength: number;
  private readonly queue: YQueue;
  private readonly errors: Array<unknown> = [];
  private failFastWaits: Array<(error?: unknown) => void> = [];
  private allSettledWaits: Array<(errors: unknown[]) => void> = [];
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
    await this.queue.onQueueSizeLessThan(this.maxQueueLength);
    let error: unknown | null = null;
    const task = this.queue.run(fn, options).catch(e => (error = e));
    setImmediate(async () => {
      await task;
      if (error !== null) {
        this.errors.push(error);
        if (this.failFastWaits.length > 0) {
          this.failFastWaits.forEach(ack => {
            ack(this.errors[0]);
          });
          this.failFastWaits = [];
        }
      }
      this.running--;
      if (this.running === 0) {
        this.allSettledWaits.forEach(ack => {
          ack(this.errors);
        });
        this.allSettledWaits = [];
        this.failFastWaits.forEach(ack => {
          ack(this.errors[0]);
        });
        this.failFastWaits = [];
      }
    });
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
    return new Promise<unknown[]>(f => {
      this.allSettledWaits.push(f);
    }).then(errors => {
      if (errors.length === 0) return;
      throw new YBatchErrors(errors);
    });
  }
}
