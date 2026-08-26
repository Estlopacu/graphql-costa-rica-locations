import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "..", "data", "locations.json");

const { provincias } = JSON.parse(readFileSync(dataPath, "utf-8"));

export const cantones = provincias.flatMap((p) =>
  p.cantones.map((c) => ({ ...c, provinciaId: p.id }))
);

export const distritos = cantones.flatMap((c) =>
  c.distritos.map((d) => ({ ...d, cantonId: c.id }))
);

export { provincias };
