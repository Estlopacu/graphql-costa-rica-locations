import { test } from "node:test";
import assert from "node:assert/strict";
import { LRUCache } from "../lru.js";

test("basic set/get/delete/clear/size", () => {
  const c = new LRUCache<string, number>({ maxSize: 3 });
  c.set("a", 1);
  c.set("b", 2);
  assert.equal(c.size, 2);
  assert.equal(c.get("a"), 1);
  assert.equal(c.get("missing"), undefined);
  assert.equal(c.delete("a"), true);
  assert.equal(c.delete("a"), false);
  assert.equal(c.size, 1);
  c.clear();
  assert.equal(c.size, 0);
  assert.equal(c.get("b"), undefined);
});

test("evicts LRU when over maxSize", () => {
  const c = new LRUCache<string, number>({ maxSize: 2 });
  c.set("a", 1);
  c.set("b", 2);
  c.set("c", 3); // evicts "a"
  assert.equal(c.get("a"), undefined);
  assert.equal(c.get("b"), 2);
  assert.equal(c.get("c"), 3);
  assert.equal(c.stats.evictions, 1);
});

test("get promotes recency — LRU skips recently-read key", () => {
  const c = new LRUCache<string, number>({ maxSize: 2 });
  c.set("a", 1);
  c.set("b", 2);
  assert.equal(c.get("a"), 1); // "a" now MRU; "b" is LRU
  c.set("c", 3); // evicts "b"
  assert.equal(c.get("a"), 1);
  assert.equal(c.get("b"), undefined);
  assert.equal(c.get("c"), 3);
});

test("set on existing key updates and promotes", () => {
  const c = new LRUCache<string, number>({ maxSize: 2 });
  c.set("a", 1);
  c.set("b", 2);
  c.set("a", 10); // "a" MRU now
  c.set("c", 3); // evicts "b"
  assert.equal(c.get("a"), 10);
  assert.equal(c.get("b"), undefined);
});

test("TTL expires entries lazily", () => {
  let t = 1000;
  const c = new LRUCache<string, number>({ maxSize: 10, ttlMs: 100, now: () => t });
  c.set("a", 1);
  t = 1099;
  assert.equal(c.get("a"), 1);
  t = 1100; // now === expiresAt → expired
  assert.equal(c.get("a"), undefined);
  assert.equal(c.stats.expirations, 1);
  assert.equal(c.size, 0);
});

test("stats counters across mixed workload", () => {
  const c = new LRUCache<string, number>({ maxSize: 2 });
  c.set("a", 1); // insert
  c.set("b", 2); // insert
  c.get("a");    // hit
  c.get("x");    // miss
  c.set("c", 3); // evict b
  c.get("b");    // miss
  assert.deepEqual(c.stats, { hits: 1, misses: 2, evictions: 1, expirations: 0 });
});

test("throws on non-positive maxSize", () => {
  assert.throws(() => new LRUCache({ maxSize: 0 }));
  assert.throws(() => new LRUCache({ maxSize: -1 }));
});
