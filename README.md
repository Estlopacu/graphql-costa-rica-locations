# Costa Rica Locations GraphQL

A GraphQL API serving Costa Rica's administrative divisions: **provincia → cantón → distrito**.

Built as a learning project — schema-first GraphQL with Apollo Server and
TypeScript, resolvers type-checked against the schema via
[GraphQL Code Generator](https://the-guild.dev/graphql/codegen), deployed on
[Render](https://render.com).

## Data

`data/locations.json` — 7 provincias, 82 cantones, 474 distritos, each with a
stable `id` and `nombre`; distritos also carry a `codigoPostal`.

## Schema

See [`server/schema.graphql`](server/schema.graphql) for the source of
truth — not duplicated here so this doc can't drift out of sync with it.

## Run locally

```bash
cd server
npm install
npm run codegen   # generates generated/graphql.ts from schema.graphql
npm run dev       # runs index.ts directly via tsx, restarts on change
```

Opens Apollo Sandbox at `http://localhost:4000/`. Try:

```graphql
{
  provincia(id: "p1") {
    nombre
    cantones {
      nombre
      distritos { nombre }
    }
  }
}
```

## Type-checked resolvers (GraphQL Code Generator)

`npm run codegen` reads `schema.graphql` and generates
`generated/graphql.ts`: a `Resolvers<Context>` type covering every field in
the schema. `resolvers.ts` is typed against it, so a resolver with the wrong
return shape, a typo'd field name, or a missing arg fails `tsc`, not a live
query.

The generated types describe GraphQL *output* shapes (e.g. `Canton` includes
a resolved `distritos: Distrito[]`), but the actual data resolvers receive is
flat (`CantonModel` has `provinciaId: string`, not a resolved `Provincia`).
`codegen.ts` bridges this with `mappers`, pointing each GraphQL type at its
real parent shape in `models.ts` — a common pattern once resolvers stop
mirroring the schema 1:1.

Re-run `npm run codegen` after editing `schema.graphql`.

## Tests

```bash
npm run codegen   # resolvers.ts imports the generated types
npm test          # runs server/test/**/*.test.ts via node:test (through tsx)
```

Covers the `Query` resolvers' filtering/lookup behavior (including
`buscarDistrito`'s empty-query handling) and the `Canton`/`Provincia`/
`Distrito` field resolvers that stitch parents back together via the
mappers.

## Deploy (Render)

1. Push this repo to GitHub.
2. Render → New → Web Service → connect the repo.
3. Root directory: `server`
4. Build command: `npm install && npm run codegen && npm run build`
5. Start command: `npm start`
6. Deploy — Render assigns `PORT` automatically, the server reads it via
   `process.env.PORT`.
