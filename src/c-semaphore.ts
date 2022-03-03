import { BinaryHeap } from './binary-heap';

interface SemaphoreRequest {
  priority: number;
  sequence: number;
  ack: (slot: number) => void;
}
export class CSemaphore {
  private readonly slots: boolean[];
  private readonly availableSlots: number[];
  private readonly pq: BinaryHeap<SemaphoreRequest>;
  private sequence = 0;

  constructor(readonly permits: number) {
    if (!(permits > 0) || Math.floor(permits) !== permits) {
      throw new Error(`permits must be a positive integer`);
    }
    this.slots = Array.from<boolean>({ length: permits }).fill(false);
    this.availableSlots = this.slots.map((_, i) => i);
    this.pq = new BinaryHeap<SemaphoreRequest>((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.sequence - a.sequence;
    });
  }
  getAvailablePermits(): number {
    return this.availableSlots.length;
  }
  getQueueLength(): number {
    return this.pq.length;
  }
  async acquire(priority?: number): Promise<number> {
    const slot = this.availableSlots.pop();
    if (slot !== undefined) {
      this.slots[slot] = true;
      return slot;
    }
    return new Promise<number>(f => {
      this.pq.add({
        priority: priority ?? 0,
        sequence: this.sequence++,
        ack: f,
      });
    });
  }
  release(acquired: number) {
    if (
      acquired < 0 ||
      acquired >= this.slots.length ||
      !this.slots[acquired]
    ) {
      return;
    }
    const next = this.pq.removeMax();
    if (next === null) {
      this.slots[acquired] = false;
      this.availableSlots.push(acquired);
    } else {
      next.ack(acquired);
    }
  }
}
