export class BinaryHeap<T> {
  private readonly values: T[] = [];
  constructor(private readonly compare: (a: T, b: T) => number) {}
  get length() {
    return this.values.length;
  }
  add(element: T) {
    this.values.push(element);
    let index = this.values.length - 1;
    const current: T = this.values[index];

    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.values[parentIndex];

      if (this.compare(parent, current) < 0) {
        this.values[parentIndex] = current;
        this.values[index] = parent;
        index = parentIndex;
      } else break;
    }
  }
  removeMax(): T | null {
    if (this.values.length <= 1) return this.values.pop() ?? null;
    const max: T = this.values[0];
    const end: T = this.values[this.values.length - 1];
    this.values[0] = end;
    this.values.pop();

    let index = 0;
    const length = this.values.length;
    const current: T = this.values[0];
    for (;;) {
      const leftChildIndex = 2 * index + 1;
      const rightChildIndex = 2 * index + 2;
      let leftChild: T | null = null;
      let rightChild: T | null = null;
      let swap: number | null = null;

      if (leftChildIndex < length) {
        leftChild = this.values[leftChildIndex];
        if (this.compare(leftChild, current) > 0) swap = leftChildIndex;

        if (rightChildIndex < length) {
          rightChild = this.values[rightChildIndex];
          if (
            (swap === null && this.compare(rightChild, current) > 0) ||
            (swap !== null && this.compare(rightChild, leftChild) > 0)
          ) {
            swap = rightChildIndex;
          }
        }
      }

      if (swap === null) break;
      this.values[index] = this.values[swap];
      this.values[swap] = current;
      index = swap;
    }

    return max;
  }
}
