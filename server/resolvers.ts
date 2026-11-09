import { provincias, cantones, distritos } from "./data.js";
import {
  provinciaById,
  cantonById,
  cantonesByProvincia,
  distritosByCanton,
} from "./indexes.js";
import { LRUCache } from "./lru.js";
import type { DistritoModel } from "./models.js";
import type { Resolvers } from "./generated/graphql.js";

const foldDiacritics = (s: string): string => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");

const searchCache = new LRUCache<string, DistritoModel[]>({ maxSize: 200, ttlMs: 60_000 });

export const resolvers: Resolvers = {
  Query: {
    provincias: () => provincias,
    provincia: (_parent, { id }) => provinciaById.get(id) ?? null,
    cantones: (_parent, { provinciaId }) =>
      provinciaId ? (cantonesByProvincia.get(provinciaId) ?? []) : cantones,
    canton: (_parent, { id }) => cantonById.get(id) ?? null,
    distritos: (_parent, { cantonId }) =>
      cantonId ? (distritosByCanton.get(cantonId) ?? []) : distritos,
    buscarDistrito: (_parent, { nombre }) => {
      const needle = foldDiacritics(nombre.trim().toLowerCase());
      if (!needle) return [];
      const hit = searchCache.get(needle);
      if (hit) return hit;
      const result = distritos.filter((d) => foldDiacritics(d.nombre.toLowerCase()).includes(needle));
      searchCache.set(needle, result);
      return result;
    },
  },

  Canton: {
    provincia: (canton) => provinciaById.get(canton.provinciaId)!,
    distritos: (canton) => distritosByCanton.get(canton.id) ?? [],
  },

  Provincia: {
    cantones: (provincia) => cantonesByProvincia.get(provincia.id) ?? [],
  },

  Distrito: {
    canton: (distrito) => cantonById.get(distrito.cantonId)!,
  },
};
