import Queue from '../y-queue';
import { sleep } from './util';

describe('YQueue test suite', () => {
  it('happy path', async () => {
    const q = new Queue({ concurrency: 3 });
    const rs: number[] = [];
    q.add(async () => {
      rs.push(1);
      await sleep(20);
      rs.push(-1);
    });
    q.add(async () => {
      rs.push(2);
      await sleep(80);
      rs.push(-2);
    });
    q.add(async () => {
      rs.push(3);
      await sleep(10);
      rs.push(-3);
    });
    q.add(async () => {
      rs.push(4);
      await sleep(30);
      rs.push(-4);
    });
    await q.onIdle();
    expect(rs).toEqual([1, 2, 3, -3, 4, -1, -4, -2]);
  });
  it('empty queue', async () => {
    const q = new Queue({ concurrency: 3 });
    await q.onIdle();
    await q.onQueueLessThan(1);
    await q.onQueueLessThan(0);
  });
  it('concurrency control', async () => {
    const q = new Queue({ concurrency: 3 });
    let working = 0;
    const rs: number[] = [];
    for (let i = 0; i < 10; i++) {
      q.add(async () => {
        rs.push(++working);
        await sleep(20);
        rs.push(--working);
      });
    }
    await q.onIdle();
    expect(rs).toEqual([
      1, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 1, 0,
    ]);
  });
  it('prioritized tasks', async () => {
    const q = new Queue({ concurrency: 3 });
    const rs: number[] = [];
    for (let i = 1; i <= 10; i++) {
      q.add(
        async () => {
          rs.push(i);
        },
        { priority: i },
      );
    }
    await q.onIdle();
    expect(rs).toEqual([1, 2, 3, 10, 9, 8, 7, 6, 5, 4]);
  });
  it('wait on queue size', async () => {
    const q = new Queue({ concurrency: 3 });
    const rs: number[] = [];
    for (let i = 1; i <= 10; i++) {
      q.add(async () => {
        await sleep(10);
      });
    }
    await Promise.all(
      Array.from({ length: 20 }).map(async (_, i) => {
        if (i >= 10) {
          await q.onQueueLessThan(20 - i);
          rs.push(20 - i);
        } else {
          await q.onQueueLessThan(i + 1);
          rs.push(i + 1);
        }
      }),
    );
    expect(rs).toEqual([
      8, 9, 10, 10, 9, 8, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1,
    ]);
  });
  it('flow control', async () => {
    const q = new Queue({ concurrency: 3 });
    const rs: number[] = [];
    for (let i = 1; i <= 10; i++) {
      await q.onQueueLessThan(1);
      rs.push(0);
      q.add(async () => {
        rs.push(i);
        await sleep(10 * i);
        rs.push(-i);
      });
    }
    await q.onIdle();
    expect(rs).toEqual([
      0, 1, 0, 2, 0, 3, 0, -1, 0, 4, -2, 0, 5, -3, 0, 6, -4, 0, 7, -5, 0, 8, -6,
      0, 9, -7, 10, -8, -9, -10,
    ]);
  });
});
