import { provincias, cantones, distritos } from "./data.js";
import type { ProvinciaModel, CantonModel, DistritoModel } from "./models.js";

function groupBy<T, K>(items: T[], key: (t: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = out.get(k);
    if (bucket) bucket.push(item);
    else out.set(k, [item]);
  }
  return out;
}

function indexBy<T, K>(items: T[], key: (t: T) => K): Map<K, T> {
  const out = new Map<K, T>();
  for (const item of items) out.set(key(item), item);
  return out;
}

export const provinciaById: Map<string, ProvinciaModel> = indexBy(provincias, (p) => p.id);
export const cantonById: Map<string, CantonModel> = indexBy(cantones, (c) => c.id);
export const distritoById: Map<string, DistritoModel> = indexBy(distritos, (d) => d.id);

export const cantonesByProvincia: Map<string, CantonModel[]> = groupBy(cantones, (c) => c.provinciaId);
export const distritosByCanton: Map<string, DistritoModel[]> = groupBy(distritos, (d) => d.cantonId);
