"""
Transforms the raw nested CR divisions JSON (provincia -> canton -> [distritos])
into a flat, ID-bearing structure suitable for GraphQL resolvers.

Source data: https://gist.github.com/richin13/7fc95f2e433c2f46335ef02d959b0561
(administrative divisions of Costa Rica, updated to 2018)
"""
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_PATH = ROOT / "data" / "raw-cr-divisions.json"
OUT_PATH = ROOT / "data" / "locations.json"


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text


def main() -> None:
    raw = json.loads(RAW_PATH.read_text(encoding="utf-8"))

    provincias = []
    for p_index, (p_nombre, cantones_raw) in enumerate(raw.items(), start=1):
        provincia_id = f"p{p_index}"
        cantones = []
        for c_index, (c_nombre, distritos_raw) in enumerate(cantones_raw.items(), start=1):
            canton_id = f"{provincia_id}-c{c_index}"
            distritos = []
            for d_index, d_nombre in enumerate(distritos_raw, start=1):
                distrito_id = f"{canton_id}-d{d_index}"
                distritos.append({"id": distrito_id, "nombre": d_nombre})
            cantones.append({"id": canton_id, "nombre": c_nombre, "distritos": distritos})
        provincias.append({"id": provincia_id, "nombre": p_nombre, "cantones": cantones})

    OUT_PATH.write_text(
        json.dumps({"provincias": provincias}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    n_cantones = sum(len(p["cantones"]) for p in provincias)
    n_distritos = sum(len(c["distritos"]) for p in provincias for c in p["cantones"])
    print(f"Wrote {OUT_PATH} — {len(provincias)} provincias, {n_cantones} cantones, {n_distritos} distritos")


if __name__ == "__main__":
    main()
