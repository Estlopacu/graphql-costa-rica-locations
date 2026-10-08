import { test } from "node:test";
import assert from "node:assert/strict";
import { ApolloServer } from "@apollo/server";
import depthLimit from "graphql-depth-limit";
import { typeDefs } from "../schema.js";
import { resolvers } from "../resolvers.js";
import { provincias, cantones, distritos } from "../data.js";
import type { Context } from "../context.js";

const server = new ApolloServer<Context>({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(10)],
});

async function exec<T = any>(
  query: string,
  variables?: Record<string, unknown>
): Promise<{ data: T | null | undefined; errors: readonly any[] | undefined }> {
  const res = await server.executeOperation({ query, variables }, { contextValue: {} });
  assert.equal(res.body.kind, "single");
  const single = (res.body as any).singleResult;
  return { data: single.data as T, errors: single.errors };
}

test("provincias query returns full list with scalar fields", async () => {
  const { data, errors } = await exec<{ provincias: { id: string; nombre: string }[] }>(
    `{ provincias { id nombre } }`
  );
  assert.equal(errors, undefined);
  assert.equal(data!.provincias.length, provincias.length);
  for (const p of data!.provincias) {
    assert.ok(typeof p.id === "string" && p.id.length > 0);
    assert.ok(typeof p.nombre === "string" && p.nombre.length > 0);
  }
});

test("Provincia.codigoPostal derives P0000 from children distritos", async () => {
  const { data, errors } = await exec<{ provincias: { codigoPostal: string }[] }>(
    `{ provincias { codigoPostal } }`
  );
  assert.equal(errors, undefined);
  assert.ok(data!.provincias.every((p) => /^\d0000$/.test(p.codigoPostal)));
});

test("Canton.codigoPostal derives PCC00 from children distritos", async () => {
  const target = cantones[0]!;
  const { data, errors } = await exec<{ canton: { codigoPostal: string } | null }>(
    `query($id: ID!) { canton(id: $id) { codigoPostal } }`,
    { id: target.id }
  );
  assert.equal(errors, undefined);
  assert.match(data!.canton!.codigoPostal, /^\d{3}00$/);
  const anyDistrito = distritos.find((d) => d.cantonId === target.id)!.codigoPostal!;
  assert.equal(data!.canton!.codigoPostal, anyDistrito.slice(0, 3) + "00");
});

test("Distrito.codigoPostal is a non-empty string", async () => {
  const target = distritos[0]!;
  const { data, errors } = await exec<{ distritos: { codigoPostal: string }[] }>(
    `query($c: ID) { distritos(cantonId: $c) { codigoPostal } }`,
    { c: target.cantonId }
  );
  assert.equal(errors, undefined);
  assert.ok(data!.distritos.every((d) => typeof d.codigoPostal === "string" && d.codigoPostal.length > 0));
});

test("provincia(id:) returns matching record", async () => {
  const target = provincias[0]!;
  const { data, errors } = await exec<{ provincia: { id: string; nombre: string } | null }>(
    `query($id: ID!) { provincia(id: $id) { id nombre } }`,
    { id: target.id }
  );
  assert.equal(errors, undefined);
  assert.equal(data!.provincia!.id, target.id);
  assert.equal(data!.provincia!.nombre, target.nombre);
});

test("provincia(id:) returns null for unknown id, no errors", async () => {
  const { data, errors } = await exec<{ provincia: null }>(
    `query($id: ID!) { provincia(id: $id) { id } }`,
    { id: "nope-xyz" }
  );
  assert.equal(errors, undefined);
  assert.equal(data!.provincia, null);
});

test("cantones(provinciaId:) filters and nested Canton.provincia resolves", async () => {
  const provinciaId = cantones[0]!.provinciaId;
  const expectedLen = cantones.filter((c) => c.provinciaId === provinciaId).length;
  const { data, errors } = await exec<{ cantones: { id: string; provincia: { id: string } }[] }>(
    `query($p: ID) { cantones(provinciaId: $p) { id provincia { id } } }`,
    { p: provinciaId }
  );
  assert.equal(errors, undefined);
  assert.equal(data!.cantones.length, expectedLen);
  assert.ok(data!.cantones.every((c) => c.provincia.id === provinciaId));
});

test("cantones (no arg) returns full list", async () => {
  const { data, errors } = await exec<{ cantones: { id: string }[] }>(`{ cantones { id } }`);
  assert.equal(errors, undefined);
  assert.equal(data!.cantones.length, cantones.length);
});

test("canton(id:) returns nested provincia and distritos", async () => {
  const target = cantones[0]!;
  const expectedDistritos = distritos.filter((d) => d.cantonId === target.id).length;
  const { data, errors } = await exec<{
    canton: { id: string; provincia: { id: string; nombre: string }; distritos: { id: string }[] } | null;
  }>(
    `query($id: ID!) { canton(id: $id) { id provincia { id nombre } distritos { id } } }`,
    { id: target.id }
  );
  assert.equal(errors, undefined);
  assert.equal(data!.canton!.id, target.id);
  assert.equal(data!.canton!.provincia.id, target.provinciaId);
  assert.equal(data!.canton!.distritos.length, expectedDistritos);
});

test("distritos(cantonId:) filters, nested Distrito.canton resolves", async () => {
  const cantonId = distritos[0]!.cantonId;
  const { data, errors } = await exec<{ distritos: { id: string; canton: { id: string } }[] }>(
    `query($c: ID) { distritos(cantonId: $c) { id canton { id } } }`,
    { c: cantonId }
  );
  assert.equal(errors, undefined);
  assert.ok(data!.distritos.length > 0);
  assert.ok(data!.distritos.every((d) => d.canton.id === cantonId));
});

test("buscarDistrito matches case-insensitively", async () => {
  const target = distritos[0]!;
  const needle = target.nombre.slice(0, 3).toUpperCase();
  const { data, errors } = await exec<{ buscarDistrito: { id: string; nombre: string }[] }>(
    `query($n: String!) { buscarDistrito(nombre: $n) { id nombre } }`,
    { n: needle }
  );
  assert.equal(errors, undefined);
  assert.ok(data!.buscarDistrito.length > 0);
  assert.ok(data!.buscarDistrito.every((d) => d.nombre.toLowerCase().includes(needle.toLowerCase())));
  assert.ok(data!.buscarDistrito.some((d) => d.id === target.id));
});

// Regression: buscarDistrito — diacritic-insensitive search
// Found by /qa on 2026-10-08: `buscarDistrito("escazu")` returned [] even though
// "Escazú" is a real distrito. Spanish users typing without accents got no hits.
// Fix folds diacritics on both needle and haystack.
test("buscarDistrito matches diacritic-insensitively (escazu → Escazú)", async () => {
  const { data, errors } = await exec<{ buscarDistrito: { nombre: string }[] }>(
    `query($n: String!) { buscarDistrito(nombre: $n) { nombre } }`,
    { n: "escazu" }
  );
  assert.equal(errors, undefined);
  assert.ok(data!.buscarDistrito.some((d) => d.nombre === "Escazú"));
});

test("buscarDistrito accent on needle still matches (escazú → Escazú)", async () => {
  const { data, errors } = await exec<{ buscarDistrito: { nombre: string }[] }>(
    `query($n: String!) { buscarDistrito(nombre: $n) { nombre } }`,
    { n: "escazú" }
  );
  assert.equal(errors, undefined);
  assert.ok(data!.buscarDistrito.some((d) => d.nombre === "Escazú"));
});

test("buscarDistrito empty / whitespace returns []", async () => {
  for (const n of ["", "   "]) {
    const { data, errors } = await exec<{ buscarDistrito: unknown[] }>(
      `query($n: String!) { buscarDistrito(nombre: $n) { id } }`,
      { n }
    );
    assert.equal(errors, undefined);
    assert.deepEqual(data!.buscarDistrito, []);
  }
});

test("deep nested query round-trips ids", async () => {
  const provincia = provincias[0]!;
  const { data, errors } = await exec<{
    provincia: {
      id: string;
      cantones: { id: string; distritos: { id: string; canton: { id: string; provincia: { id: string } } }[] }[];
    } | null;
  }>(
    `query($id: ID!) {
      provincia(id: $id) {
        id
        cantones {
          id
          distritos {
            id
            canton { id provincia { id } }
          }
        }
      }
    }`,
    { id: provincia.id }
  );
  assert.equal(errors, undefined);
  const p = data!.provincia!;
  assert.equal(p.id, provincia.id);
  for (const c of p.cantones) {
    for (const d of c.distritos) {
      assert.equal(d.canton.id, c.id);
      assert.equal(d.canton.provincia.id, provincia.id);
    }
  }
});

test("depth limit rejects queries nested beyond 10 levels", async () => {
  const query = `{
    provincias {
      cantones { distritos { canton { provincia { cantones { distritos { canton { provincia {
        cantones { distritos { id } }
      } } } } } } } }
    }
  }`;
  const { data, errors } = await exec(query);
  assert.ok(errors && errors.length > 0, "expected validation error");
  assert.equal(data, undefined);
});

test("unknown field triggers validation error", async () => {
  const { data, errors } = await exec(`{ provincias { bogusField } }`);
  assert.ok(errors && errors.length > 0);
  assert.equal(data, undefined);
});
