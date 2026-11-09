// LRU cache with per-entry TTL. Hashmap + doubly-linked list.
//
// Invariants:
//   - `map.size === list length (excluding sentinels) === this.size`
//   - Head's `next` is MRU, tail's `prev` is LRU.
//   - Every node reachable from head.next is also in `map` (keyed by `node.key`),
//     and vice versa.
//   - Expired entries may linger until the next `get`/`set` touches them (lazy
//     expiration — no timers).

interface Node<K, V> {
  key: K;
  value: V;
  expiresAt: number; // ms epoch; Infinity when no TTL
  prev: Node<K, V>;
  next: Node<K, V>;
}

export interface LRUOptions {
  maxSize: number;
  ttlMs?: number;
  now?: () => number;
}

export interface LRUStats {
  hits: number;
  misses: number;
  evictions: number;
  expirations: number;
}

export class LRUCache<K, V> {
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private readonly now: () => number;
  private readonly map = new Map<K, Node<K, V>>();
  // Sentinel nodes so splice/insert never need null checks.
  private readonly head: Node<K, V>;
  private readonly tail: Node<K, V>;

  readonly stats: LRUStats = { hits: 0, misses: 0, evictions: 0, expirations: 0 };

  constructor(opts: LRUOptions) {
    if (opts.maxSize <= 0) throw new Error("maxSize must be > 0");
    this.maxSize = opts.maxSize;
    this.ttlMs = opts.ttlMs ?? Infinity;
    this.now = opts.now ?? Date.now;
    // Sentinels: dummy nodes so head.next is always a valid node (or tail).
    this.head = { key: undefined as K, value: undefined as V, expiresAt: 0, prev: null as never, next: null as never };
    this.tail = { key: undefined as K, value: undefined as V, expiresAt: 0, prev: null as never, next: null as never };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get size(): number {
    return this.map.size;
  }

  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) {
      this.stats.misses++;
      return undefined;
    }
    if (node.expiresAt <= this.now()) {
      this.unlink(node);
      this.map.delete(key);
      this.stats.expirations++;
      this.stats.misses++;
      return undefined;
    }
    this.moveToHead(node);
    this.stats.hits++;
    return node.value;
  }

  set(key: K, value: V): void {
    const existing = this.map.get(key);
    const expiresAt = this.ttlMs === Infinity ? Infinity : this.now() + this.ttlMs;
    if (existing) {
      existing.value = value;
      existing.expiresAt = expiresAt;
      this.moveToHead(existing);
      return;
    }
    const node: Node<K, V> = {
      key,
      value,
      expiresAt,
      prev: this.head,
      next: this.head.next,
    };
    this.head.next.prev = node;
    this.head.next = node;
    this.map.set(key, node);
    if (this.map.size > this.maxSize) this.evictLRU();
  }

  delete(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;
    this.unlink(node);
    this.map.delete(key);
    return true;
  }

  clear(): void {
    this.map.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  private moveToHead(node: Node<K, V>): void {
    if (this.head.next === node) return;
    this.unlink(node);
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next.prev = node;
    this.head.next = node;
  }

  private unlink(node: Node<K, V>): void {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  private evictLRU(): void {
    const lru = this.tail.prev;
    if (lru === this.head) return; // empty
    this.unlink(lru);
    this.map.delete(lru.key);
    this.stats.evictions++;
  }
}
