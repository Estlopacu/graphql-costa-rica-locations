import { provincias, cantones, distritos } from "./data.js";
import type { Resolvers } from "./generated/graphql.js";

export const resolvers: Resolvers = {
  Query: {
    provincias: () => provincias,
    provincia: (_parent, { id }) => provincias.find((p) => p.id === id) ?? null,
    cantones: (_parent, { provinciaId }) =>
      provinciaId ? cantones.filter((c) => c.provinciaId === provinciaId) : cantones,
    canton: (_parent, { id }) => cantones.find((c) => c.id === id) ?? null,
    distritos: (_parent, { cantonId }) =>
      cantonId ? distritos.filter((d) => d.cantonId === cantonId) : distritos,
    buscarDistrito: (_parent, { nombre }) => {
      const needle = nombre.trim().toLowerCase();
      if (!needle) return [];
      return distritos.filter((d) => d.nombre.toLowerCase().includes(needle));
    },
  },

  Canton: {
    provincia: (canton) => provincias.find((p) => p.id === canton.provinciaId)!,
    distritos: (canton) => distritos.filter((d) => d.cantonId === canton.id),
  },

  Provincia: {
    cantones: (provincia) => cantones.filter((c) => c.provinciaId === provincia.id),
  },

  Distrito: {
    canton: (distrito) => cantones.find((c) => c.id === distrito.cantonId)!,
  },
};
