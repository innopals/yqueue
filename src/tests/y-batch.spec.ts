import { YBatch, YBatchErrors } from '../y-batch';
import { sleep } from './util';

describe('YBatch test suite', () => {
  it('happy path', async () => {
    const batch = new YBatch({ concurrency: 1 });
    expect(batch.maxQueueLength).toBe(1);
    const rs: number[] = [];
    for (let i = 1; i <= 5; i++) {
      rs.push(0);
      await batch.add(async () => {
        rs.push(i);
        await sleep(20);
        rs.push(-i);
      });
    }
    await batch.allSettled();
    expect(rs).toEqual([0, 1, 0, 0, -1, 2, 0, -2, 3, 0, -3, 4, -4, 5, -5]);
  });
  it('no buffer', async () => {
    const batch = new YBatch({ concurrency: 2, maxQueueLength: 1 });
    const rs: number[] = [];
    for (let i = 1; i <= 5; i++) {
      rs.push(0);
      await batch.add(async () => {
        rs.push(i);
        await sleep(20);
        rs.push(-i);
      });
    }
    await batch.allSettled();
    expect(rs).toEqual([0, 1, 0, 2, 0, 0, -1, 3, 0, -2, 4, -3, 5, -4, -5]);
  });
  it('fail fast & all settled', async () => {
    const batch = new YBatch({ concurrency: 2 });
    const rs: number[] = [];
    await batch.add(async () => {
      rs.push(1);
      await sleep(20);
    });
    setTimeout(async () => {
      try {
        await batch.failFast();
        rs.push(0);
      } catch (e: any) {
        rs.push(e.message);
      }
    });
    await batch.add(async () => {
      rs.push(2);
      await sleep(1);
      throw new Error('-2');
    });
    await batch.add(async () => {
      rs.push(3);
      await sleep(1);
      throw new Error('-3');
    });
    try {
      await batch.failFast();
      rs.push(0);
    } catch (e: any) {
      rs.push(e.message);
    }
    try {
      await batch.failFast();
      rs.push(0);
    } catch (e: any) {
      rs.push(e.message);
    }
    await expect(async () => {
      try {
        await batch.allSettled();
        rs.push(0);
      } catch (e) {
        const errors = (e as YBatchErrors).errors as any[];
        expect(errors.length).toEqual(2);
        expect(errors[0].message).toEqual('-2');
        expect(errors[1].message).toEqual('-3');
        throw e;
      }
    }).rejects.toThrowError(YBatchErrors);
    expect(rs).toEqual([1, 2, 3, '-2', '-2', '-2']);
  });
});
