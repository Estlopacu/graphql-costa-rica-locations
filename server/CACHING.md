# Caching

Two layers over the location resolvers. Pedagogical — the dataset (7 provincias,
82 cantones, 474 distritos) is tiny and lives in-process. The point is to
exercise the ideas, not to shave real latency.

## Layer A — Index maps (O(1) lookup)

**Problem.** Every lookup resolver did a linear scan: `cantones.find(c => c.id === id)`,
`distritos.filter(d => d.cantonId === cantonId)`. With N=474 distritos, each
`Canton.distritos` call re-scans the whole list — and a nested query
`provincias { cantones { distritos } }` triggers one such scan per canton (82×).

**Design.** Precompute, at module load, five maps in `indexes.ts`:

- `provinciaById`, `cantonById`, `distritoById` — primary key indexes.
- `cantonesByProvincia`, `distritosByCanton` — grouped-by-foreign-key indexes.

Built once with two small helpers (`indexBy`, `groupBy`). Same lifetime as the
array exports in `data.ts` (both built at import time from the same raw JSON).
Memory cost is a few extra pointers per record — negligible against the record
objects themselves.

**Tradeoffs.**
- Trades space for time — classic amortization. One extra `Map` per index.
- Indexes become stale if the underlying data mutates. Here the arrays are
  frozen at startup, so no invalidation needed. In a mutable store (DB-backed
  app), index maintenance is the hard part — see "What we skipped" below.
- `.filter()` on no-arg queries (`Query.cantones` with no `provinciaId`) still
  returns the full array; no index helps there, so it's left alone.

**Numbers** (`npx tsx bench/cache-bench.ts`, 100k iterations each):

| Call | Before | After | Speedup |
|---|---|---|---|
| `Query.provincia(id)` | 29 ns | 19 ns | 1.5× |
| `Query.canton(id)` | 106 ns | 22 ns | 5× |
| `Query.distritos(cantonId)` | 2096 ns | 23 ns | ~90× |

The provincia row is almost noise — scanning 7 items vs. a Map lookup — but
cantones (82) and especially distritos (474, with a `.filter()` not a `.find()`)
show the shape.

## Layer C — LRU cache with TTL

**Problem.** `buscarDistrito(nombre)` does a diacritic fold + lowercase +
substring match on every distrito, every call. 474 records × two string ops
each ≈ 150 µs/call in the bench. A UI type-ahead issuing the same query
repeatedly is pure waste.

**Design.** Generic `LRUCache<K, V>` in `lru.ts`. No deps. Hashmap + doubly-
linked list.

```
head ⇄ MRU ⇄ … ⇄ LRU ⇄ tail         (head, tail are sentinels)
              ↑
              Map<K, Node> for O(1) key→node
```

- `get(key)`: `map.get` → O(1). Check TTL (lazy — only on access, no timers).
  If live, splice node to head, return value. If expired, unlink + delete.
- `set(key, v)`: if key exists, update + move to head. Else insert at head.
  If `size > maxSize`, unlink tail.prev (LRU) and delete from map.
- Sentinels mean the splice/insert code never dereferences `null` — a small
  trick that makes the pointer juggling readable.

**Why hashmap + DLL and not, say, a `Map` with insertion-order tricks?**
JS `Map` *does* preserve insertion order, so you can simulate LRU by
`delete`+`set` on every access. That's O(1) amortized but hides the structure
and stops working if you add TTL (you can't re-order independently of lifetime).
The DLL version separates "recency position" from "storage," which is what the
interview wants to see.

**Testability.** TTL takes a `now: () => number` injection (defaults to
`Date.now`). Tests advance a counter instead of sleeping — fast and
deterministic. Small dependency-injection win worth calling out.

**Correctness invariants** (what the tests pin down):
- `map.size === DLL length === this.size`
- Every node reachable from `head.next` is in `map` and vice versa.
- `get` on an expired entry: returns `undefined`, bumps `expirations`, removes
  the entry.
- Over-capacity `set` evicts exactly the LRU node and bumps `evictions`.

**Numbers** (same bench, 10 hot needles — realistic for a search box):

| Call | ns/op | Note |
|---|---|---|
| `buscarDistrito` uncached | 149 358 | 474 × fold + substring |
| `buscarDistrito` LRU hot | 75 | 99.99% hit-rate |

~2000× on a 99% hit-rate workload. On a cold workload (every needle unique)
the cache is pure overhead — the eviction path has to run every call.
That's the classic cache-tuning tension: hit-rate dictates everything, and
`maxSize` has to roughly match the working-set size of distinct keys.

## What we skipped and why

- **DataLoader.** The classic GraphQL N+1 fix — batch + dedup child lookups
  per request. Would matter if `Canton.provincia` hit a database. Here the
  indexes make each lookup O(1) already, so a batch adds overhead without
  saving round-trips.
- **Apollo response cache / `@cacheControl` / ETag.** Caches the whole query
  response at the HTTP layer, keyed by query + variables. More systems-y, less
  algorithmic. Worth adding when the goal is CDN/edge offload rather than
  in-process speed.
- **Index invalidation on writes.** Schema is read-only, so the indexes are
  immutable. In a mutable store you'd invalidate (or incrementally update)
  on every mutation — the hard half of production caching.
