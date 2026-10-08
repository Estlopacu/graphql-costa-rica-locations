import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { RawData, RawProvincia, RawCanton, ProvinciaModel, CantonModel, DistritoModel } from "./models.js";

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

// Costa Rica postal codes are 5 digits: PCCDD (1 province, 2 canton, 2 distrito).
// locations.json only carries codigoPostal on distritos, so derive the parents
// from the first distrito of the first canton (provincia) or first distrito (canton).
function provinciaPostal(p: RawProvincia): string {
  const anyDistrito = p.cantones[0]?.distritos[0]?.codigoPostal;
  if (!anyDistrito) throw new Error(`provincia ${p.id} has no distritos to derive codigoPostal from`);
  return `${anyDistrito.slice(0, 1)}0000`;
}
function cantonPostal(c: RawCanton): string {
  const anyDistrito = c.distritos[0]?.codigoPostal;
  if (!anyDistrito) throw new Error(`canton ${c.id} has no distritos to derive codigoPostal from`);
  return `${anyDistrito.slice(0, 3)}00`;
}

export const provincias: ProvinciaModel[] = raw.provincias.map((p) => ({
  id: p.id,
  nombre: p.nombre,
  codigoPostal: provinciaPostal(p),
}));

export const cantones: CantonModel[] = raw.provincias.flatMap((p) =>
  p.cantones.map((c) => ({ id: c.id, nombre: c.nombre, provinciaId: p.id, codigoPostal: cantonPostal(c) }))
);

export const distritos: DistritoModel[] = raw.provincias.flatMap((p) =>
  p.cantones.flatMap((c) =>
    c.distritos.map((d) => ({ id: d.id, nombre: d.nombre, cantonId: c.id, codigoPostal: d.codigoPostal }))
  )
);
