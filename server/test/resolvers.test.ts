import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvers } from "../resolvers.js";
import { provincias, cantones, distritos } from "../data.js";
import type { GraphQLResolveInfo } from "graphql";
import type { Context } from "../context.js";

// The generated `Resolver<...>` type is a union that also allows the
// `{ resolve, subscribe }` object shape, so TS won't call it directly even
// though every resolver here is authored as a plain function. Narrow it.
function asFn<TParent, TArgs, TResult>(
  resolver: unknown
): (parent: TParent, args: TArgs, ctx: Context, info: GraphQLResolveInfo) => TResult {
  return resolver as (parent: TParent, args: TArgs, ctx: Context, info: GraphQLResolveInfo) => TResult;
}

const ctx = {} as Context;
const info = {} as GraphQLResolveInfo;

test("Query.provincias returns all provincias", () => {
  const fn = asFn<{}, {}, typeof provincias>(resolvers.Query!.provincias);
  assert.equal(fn({}, {}, ctx, info), provincias);
});

test("Query.provincia finds by id", () => {
  const target = provincias[0]!;
  const fn = asFn<{}, { id: string }, (typeof provincias)[number] | null>(resolvers.Query!.provincia);
  assert.deepEqual(fn({}, { id: target.id }, ctx, info), target);
});

test("Query.provincia returns null for unknown id", () => {
  const fn = asFn<{}, { id: string }, (typeof provincias)[number] | null>(resolvers.Query!.provincia);
  assert.equal(fn({}, { id: "does-not-exist" }, ctx, info), null);
});

test("Query.cantones filters by provinciaId when given", () => {
  const provinciaId = cantones[0]!.provinciaId;
  const fn = asFn<{}, { provinciaId?: string | null }, typeof cantones>(resolvers.Query!.cantones);
  const result = fn({}, { provinciaId }, ctx, info);
  assert.ok(result.length > 0);
  assert.ok(result.every((c) => c.provinciaId === provinciaId));
});

test("Query.cantones returns all cantones when provinciaId omitted", () => {
  const fn = asFn<{}, { provinciaId?: string | null }, typeof cantones>(resolvers.Query!.cantones);
  assert.equal(fn({}, {}, ctx, info), cantones);
});

test("Query.distritos filters by cantonId when given", () => {
  const cantonId = distritos[0]!.cantonId;
  const fn = asFn<{}, { cantonId?: string | null }, typeof distritos>(resolvers.Query!.distritos);
  const result = fn({}, { cantonId }, ctx, info);
  assert.ok(result.length > 0);
  assert.ok(result.every((d) => d.cantonId === cantonId));
});

test("Query.buscarDistrito matches case-insensitively", () => {
  const target = distritos[0]!;
  const needle = target.nombre.slice(0, 3).toUpperCase();
  const fn = asFn<{}, { nombre: string }, typeof distritos>(resolvers.Query!.buscarDistrito);
  const result = fn({}, { nombre: needle }, ctx, info);
  assert.ok(result.some((d) => d.id === target.id));
});

test("Query.buscarDistrito returns [] for empty string", () => {
  const fn = asFn<{}, { nombre: string }, typeof distritos>(resolvers.Query!.buscarDistrito);
  assert.deepEqual(fn({}, { nombre: "" }, ctx, info), []);
});

test("Query.buscarDistrito returns [] for whitespace-only string", () => {
  const fn = asFn<{}, { nombre: string }, typeof distritos>(resolvers.Query!.buscarDistrito);
  assert.deepEqual(fn({}, { nombre: "   " }, ctx, info), []);
});

test("Canton.provincia resolves the parent provincia", () => {
  const canton = cantones[0]!;
  const fn = asFn<typeof canton, {}, (typeof provincias)[number]>(resolvers.Canton!.provincia);
  assert.equal(fn(canton, {}, ctx, info).id, canton.provinciaId);
});

test("Canton.distritos resolves child distritos", () => {
  const canton = cantones[0]!;
  const fn = asFn<typeof canton, {}, typeof distritos>(resolvers.Canton!.distritos);
  const result = fn(canton, {}, ctx, info);
  assert.ok(result.length > 0);
  assert.ok(result.every((d) => d.cantonId === canton.id));
});

test("Provincia.cantones resolves child cantones", () => {
  const provincia = provincias[0]!;
  const fn = asFn<typeof provincia, {}, typeof cantones>(resolvers.Provincia!.cantones);
  const result = fn(provincia, {}, ctx, info);
  assert.ok(result.length > 0);
  assert.ok(result.every((c) => c.provinciaId === provincia.id));
});

test("Distrito.canton resolves the parent canton", () => {
  const distrito = distritos[0]!;
  const fn = asFn<typeof distrito, {}, (typeof cantones)[number]>(resolvers.Distrito!.canton);
  assert.equal(fn(distrito, {}, ctx, info).id, distrito.cantonId);
});
