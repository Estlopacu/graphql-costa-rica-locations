// Micro-benchmark: indexed lookups vs. .find()/.filter(), and LRU cold vs. warm.
// Run: npx tsx bench/cache-bench.ts
import { provincias, cantones, distritos } from "../data.js";
import { provinciaById, cantonById, distritosByCanton } from "../indexes.js";
import { LRUCache } from "../lru.js";

const N = 100_000;

function bench(label: string, iters: number, fn: (i: number) => unknown): void {
  // Warm JIT.
  for (let i = 0; i < 1000; i++) fn(i);
  const start = process.hrtime.bigint();
  let sink: unknown;
  for (let i = 0; i < iters; i++) sink = fn(i);
  const end = process.hrtime.bigint();
  const ns = Number(end - start);
  const nsPerOp = ns / iters;
  console.log(`${label.padEnd(44)} ${nsPerOp.toFixed(1).padStart(9)} ns/op   (sink=${String(sink).slice(0, 20)})`);
}

const pIds = provincias.map((p) => p.id);
const cIds = cantones.map((c) => c.id);
const randP = (i: number) => pIds[i % pIds.length]!;
const randC = (i: number) => cIds[i % cIds.length]!;

console.log("=== Layer A: index map vs. .find() / .filter() ===");
bench("Query.provincia  .find()", N, (i) => provincias.find((p) => p.id === randP(i)));
bench("Query.provincia  map.get()", N, (i) => provinciaById.get(randP(i)));
bench("Query.canton     .find()", N, (i) => cantones.find((c) => c.id === randC(i)));
bench("Query.canton     map.get()", N, (i) => cantonById.get(randC(i)));
bench("Query.distritos  .filter() by cantonId", N, (i) =>
  distritos.filter((d) => d.cantonId === randC(i)).length
);
bench("Query.distritos  index lookup", N, (i) => (distritosByCanton.get(randC(i)) ?? []).length);

console.log("\n=== Layer C: LRU wrapping buscarDistrito ===");
const foldDiacritics = (s: string): string => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
const search = (needle: string) =>
  distritos.filter((d) => foldDiacritics(d.nombre.toLowerCase()).includes(needle));

// Zipfian-ish: 10 hot needles, repeated.
const needles = ["san", "santa", "la", "el", "los", "las", "cen", "nor", "sur", "este"].map((s) =>
  foldDiacritics(s.toLowerCase())
);

bench("buscarDistrito  no cache", N, (i) => search(needles[i % needles.length]!).length);

const cache = new LRUCache<string, ReturnType<typeof search>>({ maxSize: 200, ttlMs: 60_000 });
bench("buscarDistrito  LRU (warm)", N, (i) => {
  const k = needles[i % needles.length]!;
  const hit = cache.get(k);
  if (hit) return hit.length;
  const r = search(k);
  cache.set(k, r);
  return r.length;
});
console.log(`  stats: ${JSON.stringify(cache.stats)}  hit-rate=${(cache.stats.hits / (cache.stats.hits + cache.stats.misses) * 100).toFixed(2)}%`);
