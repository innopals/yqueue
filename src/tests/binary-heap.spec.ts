import { BinaryHeap } from '../binary-heap';

describe('binary heap test suite', () => {
  it('happy path', () => {
    const bh = new BinaryHeap<number>((a, b) => a - b);
    bh.add(0);
    bh.add(10);
    bh.add(20);
    bh.add(15);
    bh.add(10);
    bh.add(5);
    expect(bh.peek()).toBe(20);
    expect(bh.removeMax()).toBe(20);
    expect(bh.peek()).toBe(15);
    expect(bh.removeMax()).toBe(15);
    expect(bh.removeMax()).toBe(10);
    expect(bh.removeMax()).toBe(10);
    expect(bh.removeMax()).toBe(5);
    expect(bh.removeMax()).toBe(0);
    expect(bh.peek()).toBe(null);
    expect(bh.removeMax()).toBe(null);
    bh.add(5);
    bh.add(50);
    expect(bh.removeMax()).toBe(50);
    expect(bh.removeMax()).toBe(5);
    expect(bh.removeMax()).toBe(null);
    expect(bh.removeMax()).toBe(null);
  });
  it('reversed order', () => {
    const bh = new BinaryHeap<number>((a, b) => b - a);
    bh.add(0);
    bh.add(10);
    bh.add(20);
    bh.add(15);
    bh.add(5);
    expect(bh.removeMax()).toBe(0);
    expect(bh.removeMax()).toBe(5);
    expect(bh.peek()).toBe(10);
    expect(bh.removeMax()).toBe(10);
    expect(bh.removeMax()).toBe(15);
    expect(bh.removeMax()).toBe(20);
    expect(bh.peek()).toBe(null);
    expect(bh.removeMax()).toBe(null);
  });
  it('objects', () => {
    interface Item {
      data: string;
    }
    const bh = new BinaryHeap<Item>((a, b) => b.data.localeCompare(a.data));
    bh.add({ data: 'b' });
    bh.add({ data: 'a' });
    bh.add({ data: 'c' });
    function assertNext(data: string | null) {
      const peek = bh.peek();
      const next = bh.removeMax();
      expect(next === peek).toBeTruthy();
      expect(next).toEqual(data === null ? null : { data });
    }
    assertNext('a');
    assertNext('b');
    assertNext('c');
    assertNext(null);
    bh.add({ data: 'd' });
    assertNext('d');
    assertNext(null);
  });
  it('fail to compare', () => {
    const bh = new BinaryHeap<number>(() => {
      throw new Error();
    });
    bh.add(0);
    expect(bh.peek()).toBe(0);
    expect(bh.removeMax()).toBe(0);
    expect(bh.removeMax()).toBe(null);
    bh.add(1);
    expect(() => {
      bh.add(2);
    }).toThrowError();
    expect(bh.peek()).toBe(1);
    expect(bh.removeMax()).toBe(1);
    expect(bh.removeMax()).toBe(null);
  });
});
