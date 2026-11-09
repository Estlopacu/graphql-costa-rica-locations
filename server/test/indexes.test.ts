import { test } from "node:test";
import assert from "node:assert/strict";
import { provincias, cantones, distritos } from "../data.js";
import {
  provinciaById,
  cantonById,
  distritoById,
  cantonesByProvincia,
  distritosByCanton,
} from "../indexes.js";

test("provinciaById maps every provincia", () => {
  assert.equal(provinciaById.size, provincias.length);
  for (const p of provincias) assert.equal(provinciaById.get(p.id), p);
});

test("cantonById maps every canton", () => {
  assert.equal(cantonById.size, cantones.length);
  for (const c of cantones) assert.equal(cantonById.get(c.id), c);
});

test("distritoById maps every distrito", () => {
  assert.equal(distritoById.size, distritos.length);
  for (const d of distritos) assert.equal(distritoById.get(d.id), d);
});

test("cantonesByProvincia matches filter for each provincia", () => {
  for (const p of provincias) {
    const expected = cantones.filter((c) => c.provinciaId === p.id);
    const got = cantonesByProvincia.get(p.id) ?? [];
    assert.deepEqual(got, expected);
  }
});

test("distritosByCanton matches filter for each canton", () => {
  for (const c of cantones) {
    const expected = distritos.filter((d) => d.cantonId === c.id);
    const got = distritosByCanton.get(c.id) ?? [];
    assert.deepEqual(got, expected);
  }
});

test("unknown ids return undefined", () => {
  assert.equal(provinciaById.get("nope"), undefined);
  assert.equal(cantonById.get("nope"), undefined);
  assert.equal(distritoById.get("nope"), undefined);
});
