import { createNamespace } from 'cls-hooked';
import Queue from '../y-queue';
import { sleep } from './util';

describe('queue execution traceability demonstration', () => {
  it('fail fast', async () => {
    const q = new Queue({ concurrency: 3 });
    const tasks: Array<Promise<unknown>> = [];
    const results: any[] = [];
    tasks.push(
      q.run(async () => {
        await sleep(200);
        results.push('1');
      }),
    );
    tasks.push(
      q.run(async () => {
        await sleep(300);
        results.push('2');
      }),
    );
    tasks.push(
      q.run(async () => {
        await sleep(100);
        throw new Error('3');
      }),
    );
    try {
      await Promise.all(tasks);
    } catch (e: any) {
      results.push(e.toString());
    }
    await q.onIdle();
    expect(results).toEqual(['Error: 3', '1', '2']);
  });
  it('fail until all settled', async () => {
    const q = new Queue({ concurrency: 3 });
    const tasks: Array<Promise<unknown>> = [];
    tasks.push(
      q.run(async () => {
        await sleep(100);
        return 1;
      }),
    );
    tasks.push(
      q.run(async () => {
        await sleep(150);
        return 2;
      }),
    );
    tasks.push(
      q.run(async () => {
        await sleep(10);
        throw new Error('3');
      }),
    );
    const results = await Promise.allSettled(tasks);
    expect(results[0]).toEqual({
      status: 'fulfilled',
      value: 1,
    });
    expect(results[1]).toEqual({
      status: 'fulfilled',
      value: 2,
    });
    expect(results[2].status).toEqual('rejected');
    expect((results[2] as any).reason.toString()).toEqual('Error: 3');
  });
  it('will keep stack trace', async function functionNameInStacktrace() {
    expect(new Error().stack).toContain('functionNameInStacktrace');
    try {
      await Promise.resolve().then(() => {
        throw new Error();
      });
    } catch (e: any) {
      expect(e.stack).toContain('functionNameInStacktrace');
    }
    const q = new Queue({ concurrency: 1 });
    try {
      await q.run(async () => {
        throw new Error();
      });
    } catch (e: any) {
      expect(e.stack).toContain('functionNameInStacktrace');
    }
    (() => {
      q.run(async () => sleep(100));
    })();
    try {
      await q.run(async () => {
        throw new Error();
      });
    } catch (e: any) {
      expect(e.stack).toContain('functionNameInStacktrace');
    }
    let error: any = null;
    q.add(async function taskFunctionName() {
      await sleep(1);
      error = new Error();
    });
    await q.onIdle();
    expect(error.stack).toContain('taskFunctionName');
  });
  it('will keep async hook namespace', async function () {
    const session = createNamespace('session');
    const roughQueue: any[] = [];
    const q = new Queue({ concurrency: 1 });
    await session.runPromise(async () => {
      session.set('k', 0);
      await q.run(async () => {
        expect(session.get('k')).toBe(0);
      });
      (() => {
        // ensure the subsequent tasks to be queued
        q.run(async () => sleep(50));
      })();
    });
    await session.runPromise(async function () {
      session.set('k', 9);
      await q.run(async () => {
        expect(session.get('k')).toBe(9);
      });
    });
    async function t() {
      await Promise.resolve().then(async () => {
        expect(session.get('k')).toBe(1);
      });
      await q.run(async () => {
        expect(session.get('k')).toBe(1);
      });
      (() => {
        // ensure the next task to be queued
        q.run(async () => sleep(50));
      })();
      await q.run(async () => {
        expect(session.get('k')).toBe(1);
      });
      // This is a demonstration where we could lose track of async call chain
      await new Promise((f, r) => {
        roughQueue.push({
          f,
          r,
          fn: async () => {
            // The promise is run by another async call chain where session k=2
            expect(session.get('k')).toBe(2);
          },
        });
      });
    }
    await session.runPromise(async function () {
      session.set('k', 1);
      session.run(function () {
        const i = setInterval(function () {
          session.set('k', 2);
          while (roughQueue.length > 0) {
            const t = roughQueue.shift();
            if (t.fn === undefined) {
              clearInterval(i);
              t.f();
              return;
            }
            t.fn().then(t.f, t.r);
          }
        }, 10);
      });
      await t();
    });
    // clear the background interval
    await new Promise(f => roughQueue.push({ f }));
  });
});
