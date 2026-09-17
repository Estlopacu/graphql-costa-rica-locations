import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { RawData, ProvinciaModel, CantonModel, DistritoModel } from "./models.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dev (tsx, from server/): ../data/locations.json
// build (node, from server/dist/): ./data/locations.json (copied in by `npm run build`)
const candidates = [
  path.join(__dirname, "..", "data", "locations.json"),
  path.join(__dirname, "data", "locations.json"),
];
const dataPath = candidates.find((p) => existsSync(p));
if (!dataPath) {
  throw new Error(`locations.json not found in any of: ${candidates.join(", ")}`);
}

const raw: RawData = JSON.parse(readFileSync(dataPath, "utf-8"));

export const provincias: ProvinciaModel[] = raw.provincias.map((p) => ({
  id: p.id,
  nombre: p.nombre,
  codigoPostal: p.codigoPostal,
}));

export const cantones: CantonModel[] = raw.provincias.flatMap((p) =>
  p.cantones.map((c) => ({ id: c.id, nombre: c.nombre, provinciaId: p.id }))
);

export const distritos: DistritoModel[] = raw.provincias.flatMap((p) =>
  p.cantones.flatMap((c) =>
    c.distritos.map((d) => ({ id: d.id, nombre: d.nombre, cantonId: c.id, codigoPostal: d.codigoPostal }))
  )
);
