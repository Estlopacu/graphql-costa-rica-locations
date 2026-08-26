import { provincias, cantones, distritos } from "./data.js";

export const resolvers = {
  Query: {
    provincias: () => provincias,
    provincia: (_parent, { id }) => provincias.find((p) => p.id === id),
    cantones: (_parent, { provinciaId }) =>
      provinciaId ? cantones.filter((c) => c.provinciaId === provinciaId) : cantones,
    canton: (_parent, { id }) => cantones.find((c) => c.id === id),
    distritos: (_parent, { cantonId }) =>
      cantonId ? distritos.filter((d) => d.cantonId === cantonId) : distritos,
    buscarDistrito: (_parent, { nombre }) => {
      const needle = nombre.toLowerCase();
      return distritos.filter((d) => d.nombre.toLowerCase().includes(needle));
    },
  },

  Canton: {
    provincia: (canton) => provincias.find((p) => p.id === canton.provinciaId),
  },

  Distrito: {
    canton: (distrito) => cantones.find((c) => c.id === distrito.cantonId),
  },
};
